import { runFFmpeg, extractFrame } from './ffmpeg.js';
import { askClaudeVision, parseVisionJSON } from './claude.js';
import fs from 'fs';

interface FacePosition {
  centerXPercent: number;
  centerYPercent: number;
  detected: boolean;
}

// Detect face position in a video frame
export async function detectFacePosition(videoPath: string, timestamp: number): Promise<FacePosition> {
  const framePath = videoPath.replace(/\.[^.]+$/, `_face_detect_${timestamp}.jpg`);

  try {
    // Extract frame at timestamp
    await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 -y "${framePath}"`);

    // Send to Claude Vision to find face position
    const imageBase64 = fs.readFileSync(framePath).toString('base64');

    const response = await askClaudeVision(
      'You detect face positions in video frames. RESPOND ONLY WITH A JSON OBJECT. No text before or after. Do not start with "Looking at" or "I can see". Start your response with { and end with }.',
      [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
        },
        {
          type: 'text',
          text: 'Where is the center of the main speaker\'s face? Return ONLY JSON, no other text: { "face_center_x_percent": 50, "face_center_y_percent": 35, "face_detected": true }'
        }
      ]
    );

    const result = parseVisionJSON(response, { face_center_x_percent: 50, face_center_y_percent: 40, face_detected: false });
    return {
      centerXPercent: result.face_center_x_percent || 50,
      centerYPercent: result.face_center_y_percent || 40,
      detected: result.face_detected !== false,
    };
  } catch (error: any) {
    console.error('Face detection failed:', error.message);
    return { centerXPercent: 50, centerYPercent: 40, detected: false };
  } finally {
    try { fs.unlinkSync(framePath); } catch {}
  }
}

// Smart reframe: analyze multiple points in video, build crop trajectory
export async function smartReframe(
  inputPath: string,
  outputPath: string,
  targetFormat: '9:16' | '1:1',
  duration: number
): Promise<string> {
  console.log(`[Reframe] Smart reframe to ${targetFormat}...`);

  // Sample face position at multiple points
  const sampleCount = Math.min(10, Math.ceil(duration / 5));
  const facePositions: Array<{ time: number; x: number }> = [];

  for (let i = 0; i < sampleCount; i++) {
    const timestamp = (duration / (sampleCount + 1)) * (i + 1);
    const face = await detectFacePosition(inputPath, timestamp);
    facePositions.push({ time: timestamp, x: face.centerXPercent });
  }

  // Calculate average face X position
  const avgFaceX = facePositions.reduce((sum, p) => sum + p.x, 0) / facePositions.length;

  // Build FFmpeg crop command
  // For 9:16: crop width = height * 9/16, keep face centered horizontally
  // For 1:1: crop to square, keep face centered
  if (targetFormat === '9:16') {
    const cropXPercent = avgFaceX / 100;
    const cmd = `ffmpeg -i "${inputPath}" -vf "crop=ih*9/16:ih:max(0,min(iw-ih*9/16,(iw*${cropXPercent})-(ih*9/16)/2)):0,scale=1080:1920" -c:a copy -y "${outputPath}"`;
    await runFFmpeg(cmd);
  } else {
    // 1:1
    const cmd = `ffmpeg -i "${inputPath}" -vf "crop=min(iw\\,ih):min(iw\\,ih):max(0,(iw-min(iw\\,ih))*${avgFaceX / 100}):0" -c:a copy -y "${outputPath}"`;
    await runFFmpeg(cmd);
  }

  return outputPath;
}
