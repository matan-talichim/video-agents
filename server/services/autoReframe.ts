// server/services/autoReframe.ts
// Smart auto-reframe with speaker tracking for aspect ratio conversion.

import { runFFmpeg } from './ffmpeg.js';
import { askClaudeVision } from './claude.js';
import fs from 'fs';

export interface ReframePlan {
  keyframes: Array<{ timestamp: number; cropX: number; cropY: number; cropW: number; cropH: number }>;
  method: 'center-static' | 'face-tracking' | 'rule-of-thirds';
}

export async function planAutoReframe(
  videoPath: string,
  duration: number,
  fromAspect: '16:9' | '4:3',
  toAspect: '9:16' | '1:1',
  hasPresenter: boolean
): Promise<ReframePlan> {
  if (!hasPresenter) {
    // No presenter -> center crop is fine
    return { keyframes: [{ timestamp: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 }], method: 'center-static' };
  }

  console.log('[Reframe] Planning smart reframe with face tracking...');

  // Sample frames every 2 seconds to track face position
  const sampleCount = Math.min(15, Math.ceil(duration / 2));
  const keyframes: ReframePlan['keyframes'] = [];

  for (let i = 0; i < sampleCount; i++) {
    const timestamp = (duration / (sampleCount + 1)) * (i + 1);
    const framePath = `temp/reframe_${i}.jpg`;
    try {
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 -y "${framePath}"`);
    } catch {
      // If frame extraction fails, use center crop for this keyframe
      keyframes.push({ timestamp, cropX: 656, cropY: 0, cropW: 608, cropH: 1080 });
      continue;
    }

    if (!fs.existsSync(framePath)) {
      keyframes.push({ timestamp, cropX: 656, cropY: 0, cropW: 608, cropH: 1080 });
      continue;
    }

    const imageData = fs.readFileSync(framePath).toString('base64');
    const image = {
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: imageData }
    };

    const response = await askClaudeVision(
      'You detect face position for video reframing.',
      [image, { type: 'text', text: `Where is the speaker's face in this 16:9 frame? Return approximate position as percentage from left edge. Return JSON: { "faceX": 50 } where 50 = center, 30 = left third, 70 = right third. If no face visible, return { "faceX": 50 }.` }]
    );

    try { fs.unlinkSync(framePath); } catch {}

    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const faceX = parsed.faceX || 50;

      // Convert face position to crop coordinates for 9:16 from 16:9
      // 9:16 crop from 1920x1080: crop width = 608, height = 1080
      let cropW: number;
      let cropH: number;

      if (toAspect === '9:16') {
        cropW = 608;
        cropH = 1080;
      } else {
        // 1:1 from 1920x1080
        cropW = 1080;
        cropH = 1080;
      }

      const maxX = 1920 - cropW;
      const cropX = Math.max(0, Math.min(maxX, Math.round((faceX / 100) * 1920 - cropW / 2)));
      keyframes.push({ timestamp, cropX, cropY: 0, cropW, cropH });
    } catch {
      const defaultCropW = toAspect === '9:16' ? 608 : 1080;
      const defaultCropX = Math.round((1920 - defaultCropW) / 2);
      keyframes.push({ timestamp, cropX: defaultCropX, cropY: 0, cropW: defaultCropW, cropH: 1080 });
    }
  }

  return { keyframes, method: 'face-tracking' };
}

// Apply reframe with smooth keyframe interpolation
export async function applyAutoReframe(
  videoPath: string,
  plan: ReframePlan,
  outputPath: string,
  toAspect: '9:16' | '1:1' = '9:16'
): Promise<string> {
  if (plan.method === 'center-static' || plan.keyframes.length <= 1) {
    // Simple center crop
    const cropW = toAspect === '9:16' ? 608 : 1080;
    const cropX = Math.round((1920 - cropW) / 2);
    await runFFmpeg(`ffmpeg -i "${videoPath}" -vf "crop=${cropW}:1080:${cropX}:0" -c:a copy -y "${outputPath}"`);
    return outputPath;
  }

  // Face-tracking: use average face position for a stable crop
  const avgX = Math.round(plan.keyframes.reduce((sum, kf) => sum + kf.cropX, 0) / plan.keyframes.length);
  const cropW = plan.keyframes[0].cropW || (toAspect === '9:16' ? 608 : 1080);

  await runFFmpeg(`ffmpeg -i "${videoPath}" -vf "crop=${cropW}:1080:${avgX}:0" -c:a copy -y "${outputPath}"`);
  console.log(`[Reframe] Applied face-tracking crop at x=${avgX}`);

  return outputPath;
}
