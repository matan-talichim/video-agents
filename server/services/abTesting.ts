import type { HookVariation } from './hookGenerator.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface ABTestResult {
  variations: ABVariation[];
  primaryVideoPath: string;    // the main video (shown first)
  status: 'generating' | 'ready';
}

export interface ABVariation {
  id: string;
  hookType: string;
  videoPath: string;
  textOverlay: string;
  viralScore: number;
  status: 'ready' | 'generating';
}

// Generate A/B test variations — reusing the SAME rendered body
export async function generateABVariations(
  mainVideoPath: string,
  hooks: HookVariation[],
  duration: number,
  plan: any,
  outputDir: string
): Promise<ABTestResult> {
  console.log(`[A/B Test] Generating ${hooks.length} variations (same body, different hooks)`);

  fs.mkdirSync(outputDir, { recursive: true });

  const variations: ABVariation[] = [];

  // Variation A = main video with hook 1 text overlay
  const variationAPath = `${outputDir}/variation_A.mp4`;
  try {
    await addHookToVideo(mainVideoPath, hooks[0], variationAPath);
    variations.push({
      id: hooks[0].id,
      hookType: hooks[0].type,
      videoPath: variationAPath,
      textOverlay: hooks[0].textOverlay,
      viralScore: hooks[0].viralScore,
      status: 'ready',
    });
  } catch (error: any) {
    console.error('[A/B Test] Variation A failed:', error.message);
    // Use original video as fallback
    fs.copyFileSync(mainVideoPath, variationAPath);
    variations.push({
      id: hooks[0].id,
      hookType: hooks[0].type,
      videoPath: variationAPath,
      textOverlay: hooks[0].textOverlay,
      viralScore: hooks[0].viralScore,
      status: 'ready',
    });
  }

  // Return immediately with variation A ready
  const result: ABTestResult = {
    variations,
    primaryVideoPath: variationAPath,
    status: 'generating',
  };

  // Generate remaining variations in the background (non-blocking)
  generateRemainingVariations(mainVideoPath, hooks.slice(1), outputDir, result);

  return result;
}

// Background generation of remaining variations
async function generateRemainingVariations(
  mainVideoPath: string,
  remainingHooks: HookVariation[],
  outputDir: string,
  result: ABTestResult
) {
  for (let i = 0; i < remainingHooks.length; i++) {
    const hook = remainingHooks[i];
    const letter = String.fromCharCode(66 + i); // B, C, D...
    const variationPath = `${outputDir}/variation_${letter}.mp4`;

    try {
      await addHookToVideo(mainVideoPath, hook, variationPath);

      result.variations.push({
        id: hook.id,
        hookType: hook.type,
        videoPath: variationPath,
        textOverlay: hook.textOverlay,
        viralScore: hook.viralScore,
        status: 'ready',
      });

      console.log(`[A/B Test] Variation ${letter} ready`);
    } catch (error: any) {
      console.error(`[A/B Test] Variation ${letter} failed:`, error.message);
    }
  }

  result.status = 'ready';
  console.log(`[A/B Test] All ${result.variations.length} variations ready`);
}

// Add a hook (text overlay) to the first few seconds of a video
async function addHookToVideo(
  videoPath: string,
  hook: HookVariation,
  outputPath: string
): Promise<void> {
  const hookDuration = hook.duration || 2;
  const text = hook.textOverlay.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  let filterComplex = '';

  switch (hook.visualStrategy) {
    case 'text-on-dark-then-reveal':
      // Dark overlay then text fades in
      filterComplex = [
        `drawbox=x=0:y=0:w=iw:h=ih:c=black@0.7:t=fill:enable='lt(t,${hookDuration})'`,
        `drawtext=text='${text}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0.3,${hookDuration})'`,
      ].join(',');
      break;

    case 'broll-aerial-with-text':
    case 'zoom-to-speaker-face':
    default:
      // Text overlay at bottom center with background box
      filterComplex = [
        `drawtext=text='${text}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=h-200:box=1:boxcolor=black@0.6:boxborderw=15:enable='between(t,0,${hookDuration})'`,
      ].join(',');
      break;
  }

  await runFFmpeg(
    `ffmpeg -i "${videoPath}" -vf "${filterComplex}" -c:a copy -y "${outputPath}"`
  );
}
