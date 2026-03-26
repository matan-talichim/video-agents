// server/services/thumbnailGenerator.ts
// Multi-platform intelligent thumbnail generator with Claude Vision scoring.

import { askClaudeVision } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface ThumbnailResult {
  thumbnails: Array<{
    path: string;
    score: number;
    reason: string;
    platform: string;
  }>;
  bestThumbnail: string;
}

export async function generateThumbnails(
  videoPath: string,
  duration: number,
  hookText: string,
  brandKit: any,
  platforms: string[],
  jobId: string
): Promise<ThumbnailResult> {
  console.log('[Thumbnail] Generating intelligent multi-platform thumbnails...');

  const tempDir = `temp/${jobId}/thumb_gen`;
  const outputDir = `output/${jobId}`;
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  // Step 1: Extract 8 candidate frames
  const candidateCount = 8;
  const candidates: Array<{ path: string; timestamp: number }> = [];

  for (let i = 0; i < candidateCount; i++) {
    const timestamp = (duration / (candidateCount + 1)) * (i + 1);
    const framePath = `${tempDir}/candidate_${i}.jpg`;
    try {
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 1 -y "${framePath}"`);
      if (fs.existsSync(framePath)) {
        candidates.push({ path: framePath, timestamp });
      }
    } catch {
      // Skip failed frame extractions
    }
  }

  if (candidates.length === 0) {
    console.warn('[Thumbnail] No candidate frames extracted');
    return { thumbnails: [], bestThumbnail: '' };
  }

  // Step 2: Claude Vision selects best 3 frames
  const images = candidates.slice(0, 6).map(c => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: fs.readFileSync(c.path).toString('base64') }
  }));

  let bestFrames = [0, Math.floor(candidates.length / 2), candidates.length - 1];
  try {
    const response = await askClaudeVision(
      'You select the best thumbnail frames for social media videos. 93% of viewers decide based on thumbnail.',
      [
        ...images,
        { type: 'text', text: `Select the TOP 3 frames for thumbnails. Score each 1-10.

Best thumbnails have:
- Clear facial expression (surprise, excitement, curiosity)
- Good lighting (bright, not dark)
- Interesting composition (not just centered talking head)
- Emotion that makes you want to click
- Works at SMALL size (phone feed)

Worst thumbnails have:
- Eyes closed / mouth mid-word
- Blurry or dark
- Nothing interesting happening
- Too much text already in frame

Return ONLY valid JSON:
{ "best": [
  { "frameIndex": 3, "score": 9, "reason": "clear excited expression, great lighting" },
  { "frameIndex": 7, "score": 8, "reason": "interesting composition with property in background" },
  { "frameIndex": 1, "score": 7, "reason": "confident pose, good eye contact" }
]}` }
      ]
    );

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.best) && parsed.best.length > 0) {
      bestFrames = parsed.best
        .map((b: any) => b.frameIndex)
        .filter((idx: number) => idx >= 0 && idx < candidates.length);
      if (bestFrames.length === 0) bestFrames = [0];
    }
  } catch {
    console.warn('[Thumbnail] Claude scoring failed, using defaults');
  }

  // Step 3: Generate platform-specific thumbnails
  const thumbnails: ThumbnailResult['thumbnails'] = [];
  const primaryColor = brandKit?.primaryColor || '#7c3aed';
  const hookShort = hookText.slice(0, 30);

  for (const platform of platforms) {
    const frameIdx = bestFrames[0] ?? 0;
    const srcFrame = candidates[frameIdx]?.path || candidates[0].path;

    let thumbW: number, thumbH: number;
    if (platform === 'youtube') { thumbW = 1280; thumbH = 720; }
    else if (platform === 'instagram-reels' || platform === 'tiktok') { thumbW = 1080; thumbH = 1920; }
    else { thumbW = 1080; thumbH = 1080; }

    const thumbPath = `${outputDir}/thumb_${platform}.jpg`;
    const text = hookShort.replace(/'/g, "'\\''");

    try {
      await runFFmpeg(
        `ffmpeg -i "${srcFrame}" -vf "scale=${thumbW}:${thumbH}:flags=lanczos:force_original_aspect_ratio=increase,crop=${thumbW}:${thumbH},drawbox=x=0:y=ih-80:w=iw:h=80:c=${primaryColor}@0.8:t=fill,drawtext=text='${text}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=h-60:borderw=2:bordercolor=black" -q:v 2 -y "${thumbPath}"`
      );
      thumbnails.push({ path: thumbPath, score: 8, reason: 'auto-generated', platform });
    } catch (error: any) {
      console.warn(`[Thumbnail] Failed for ${platform}: ${error.message}`);
    }
  }

  // Cleanup candidates
  for (const c of candidates) { try { fs.unlinkSync(c.path); } catch {} }
  try { fs.rmdirSync(tempDir); } catch {}

  console.log(`[Thumbnail] Generated ${thumbnails.length} platform thumbnails`);
  return { thumbnails, bestThumbnail: thumbnails[0]?.path || '' };
}
