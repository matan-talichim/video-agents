import { execSync } from 'child_process';
import fs from 'fs';

export async function preprocessForSpeakerDetection(
  videoPath: string,
  jobId: string
): Promise<{ audioPath: string; videoLowResPath: string }> {
  const workDir = `temp/${jobId}/speaker_detection`;
  fs.mkdirSync(workDir, { recursive: true });

  const audioPath = `${workDir}/audio.wav`;
  const videoLowResPath = `${workDir}/video_480p.mp4`;

  // Extract audio as WAV (16kHz mono — optimal for VAD)
  execSync(
    `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${audioPath}"`,
    { stdio: 'pipe', timeout: 120000 }
  );

  // Downscale video to 480p (speeds up MediaPipe 4x)
  execSync(
    `ffmpeg -i "${videoPath}" -vf "scale=-2:480" -c:v libx264 -preset ultrafast -crf 28 -an -y "${videoLowResPath}"`,
    { stdio: 'pipe', timeout: 120000 }
  );

  console.log(`[SpeakerDetect] Pre-processed: audio=${audioPath}, video=${videoLowResPath}`);

  return { audioPath, videoLowResPath };
}
