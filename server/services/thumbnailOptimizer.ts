import { askClaudeVision } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface ThumbnailPlan {
  bestFrameTimestamp: number;
  textOverlay: string;
  textPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  faceVisible: boolean;
  faceExpression: string;
  colorScheme: string;
  viralScore: number;
  reason: string;
}

export async function planThumbnail(
  videoPath: string,
  duration: number,
  videoCategory: string,
  keyPoints: any[],
  brandKit?: any
): Promise<ThumbnailPlan> {
  console.log('[Thumbnail] Planning optimal thumbnail...');

  // Extract 8 candidate frames (focus on moments with good expressions)
  const frameCount = 8;
  const frames: Array<{ path: string; timestamp: number }> = [];
  const tempDir = `temp/thumb_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  for (let i = 0; i < frameCount; i++) {
    const timestamp = (duration / (frameCount + 1)) * (i + 1);
    const framePath = `${tempDir}/thumb_candidate_${i}.jpg`;
    try {
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 -y "${framePath}"`);
      if (fs.existsSync(framePath)) {
        frames.push({ path: framePath, timestamp });
      }
    } catch {
      // Skip failed frame extractions
    }
  }

  const frameImages = frames.slice(0, 6).map(f => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: fs.readFileSync(f.path).toString('base64') }
  }));

  try {
    const response = await askClaudeVision(
      `You create viral video thumbnails. 93% of viewers decide to click based on the thumbnail.`,
      [
        ...frameImages,
        {
          type: 'text',
          text: `Choose the BEST frame for a thumbnail from these ${frames.length} candidates.

Video category: ${videoCategory}
Key message: "${keyPoints[0]?.point || ''}"
Brand colors: ${brandKit?.primaryColor || '#7c3aed'}, ${brandKit?.secondaryColor || '#3B82F6'}

THUMBNAIL RULES (what makes people click):

1. FACE WITH EMOTION — Thumbnails with faces get 38% more clicks
   - Best: surprise, excitement, curiosity, intensity
   - Worst: neutral, bored, closed eyes, looking away
   - The face should take up 40-60% of the frame

2. TEXT — Max 4-6 words, LARGE, readable at phone size
   - Must be readable at 120x67px (YouTube mobile size)
   - High contrast: white text on dark, or dark text with white outline
   - Don't repeat the title — add NEW information or intrigue
   - Hebrew: right-aligned, bold font

3. COLOR — 3 colors maximum
   - High saturation and contrast
   - Avoid dull, muted colors (they don't pop in a feed)
   - Yellow/red borders increase CTR by 15%
   - Dark background + bright text = maximum contrast

4. COMPOSITION — Rule of thirds
   - Face on one side, text on the other
   - Leave breathing room (don't cram)
   - The most important element should be the LARGEST

5. CURIOSITY GAP — The thumbnail should make the viewer ask "what is this?"
   - Unexpected visuals, surprising elements
   - Arrows or circles pointing to something
   - Before/after split

Return ONLY valid JSON, no markdown code blocks:
{
  "bestFrameIndex": 3,
  "bestFrameTimestamp": 15.5,
  "reason": "speaker has surprised expression + good lighting + clear face",
  "textOverlay": "5 דקות מהים",
  "textPosition": "top-right",
  "fontSize": 48,
  "textColor": "#FFFFFF",
  "textStroke": "#000000",
  "backgroundColor": "none",
  "faceVisible": true,
  "faceExpression": "excited",
  "colorScheme": "high-contrast-warm",
  "viralScore": 8,
  "alternativeText": "₪1.89M | חיפה"
}`
        }
      ]
    );

    // Cleanup frames
    for (const frame of frames) {
      try { fs.unlinkSync(frame.path); } catch {}
    }
    try { fs.rmdirSync(tempDir); } catch {}

    const jsonStr = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      bestFrameTimestamp: parsed.bestFrameTimestamp ?? duration * 0.3,
      textOverlay: parsed.textOverlay || '',
      textPosition: parsed.textPosition || 'top-right',
      fontSize: parsed.fontSize || 48,
      textColor: parsed.textColor || '#FFFFFF',
      backgroundColor: parsed.backgroundColor || 'none',
      faceVisible: parsed.faceVisible ?? false,
      faceExpression: parsed.faceExpression || 'neutral',
      colorScheme: parsed.colorScheme || 'default',
      viralScore: parsed.viralScore ?? 5,
      reason: parsed.reason || 'default',
    };
  } catch (error: any) {
    console.error('[Thumbnail] Planning failed:', error.message);

    // Cleanup frames
    for (const frame of frames) {
      try { fs.unlinkSync(frame.path); } catch {}
    }
    try { fs.rmdirSync(tempDir); } catch {}

    return {
      bestFrameTimestamp: duration * 0.3,
      textOverlay: keyPoints[0]?.point?.slice(0, 20) || '',
      textPosition: 'top-right',
      fontSize: 48,
      textColor: '#FFFFFF',
      backgroundColor: 'none',
      faceVisible: false,
      faceExpression: 'neutral',
      colorScheme: 'default',
      viralScore: 5,
      reason: 'default — planning failed',
    };
  }
}

// Generate the actual thumbnail image
export async function generateThumbnail(
  videoPath: string,
  plan: ThumbnailPlan,
  outputPath: string
): Promise<string> {
  console.log(`[Thumbnail] Generating thumbnail at ${plan.bestFrameTimestamp.toFixed(1)}s...`);

  // Extract the best frame
  const framePath = outputPath.replace('.jpg', '_raw.jpg');
  await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${plan.bestFrameTimestamp} -vframes 1 -q:v 1 -y "${framePath}"`);

  // Add text overlay if specified
  if (plan.textOverlay) {
    const text = plan.textOverlay.replace(/'/g, "'\\''");
    const posX = plan.textPosition.includes('right') ? 'w-text_w-40' : '40';
    const posY = plan.textPosition.includes('top') ? '40' : 'h-text_h-40';

    try {
      await runFFmpeg(
        `ffmpeg -i "${framePath}" -vf "drawtext=text='${text}':fontsize=${plan.fontSize}:fontcolor=${plan.textColor}:borderw=3:bordercolor=black:x=${posX}:y=${posY}" -q:v 1 -y "${outputPath}"`
      );
      try { fs.unlinkSync(framePath); } catch {}
    } catch {
      // If text overlay fails, use raw frame
      fs.renameSync(framePath, outputPath);
    }
  } else {
    fs.renameSync(framePath, outputPath);
  }

  console.log(`[Thumbnail] Generated: ${outputPath}`);
  return outputPath;
}
