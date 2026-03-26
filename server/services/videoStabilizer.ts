import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';
import path from 'path';

export interface StabilizationResult {
  wasShaky: boolean;
  shakiness: number;        // 0 = stable, 10+ = very shaky
  stabilizedPath: string;
}

export async function detectAndStabilize(
  videoPath: string,
  jobId: string
): Promise<StabilizationResult> {
  const editDir = path.join('temp', jobId);
  fs.mkdirSync(editDir, { recursive: true });
  const transformsPath = path.join(editDir, 'transforms.trf');
  const stabilizedPath = path.join(editDir, 'stabilized.mp4');

  console.log('[Stabilize] Analyzing footage shakiness...');

  try {
    // Step 1: Detect shakiness — analyze the video and save transform data
    await runFFmpeg(
      `ffmpeg -i "${videoPath}" -vf "vidstabdetect=shakiness=10:accuracy=15:result=${transformsPath}" -f null -`
    );

    // Step 2: Check if transforms file was created and has data
    if (!fs.existsSync(transformsPath)) {
      console.log('[Stabilize] No shakiness data generated — video appears stable');
      return { wasShaky: false, shakiness: 0, stabilizedPath: videoPath };
    }

    // Step 3: Analyze shake level from transforms
    const transforms = fs.readFileSync(transformsPath, 'utf-8');
    const lines = transforms.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    let totalMovement = 0;
    let lineCount = 0;

    for (const line of lines) {
      // Parse transform data: each line has dx, dy (displacement) values
      const dxMatch = line.match(/dx=([-\d.]+)/);
      const dyMatch = line.match(/dy=([-\d.]+)/);

      if (dxMatch && dyMatch) {
        const dx = Math.abs(parseFloat(dxMatch[1]));
        const dy = Math.abs(parseFloat(dyMatch[1]));
        totalMovement += dx + dy;
        lineCount++;
      }
    }

    const avgShakiness = lineCount > 0 ? totalMovement / lineCount : 0;

    console.log(`[Stabilize] Average shakiness: ${avgShakiness.toFixed(2)} (threshold: 3.0)`);

    if (avgShakiness < 3.0) {
      // Not shaky enough to warrant stabilization
      console.log('[Stabilize] Video is stable enough — no stabilization needed');
      try { fs.unlinkSync(transformsPath); } catch {}
      return { wasShaky: false, shakiness: avgShakiness, stabilizedPath: videoPath };
    }

    // Step 4: Apply stabilization
    console.log('[Stabilize] Shaky footage detected — applying stabilization...');

    // smoothing=10 gives smooth result
    // crop=black fills borders with black (will be cropped by zoom later)
    // optzoom=2 finds optimal zoom to avoid black borders
    await runFFmpeg(
      `ffmpeg -i "${videoPath}" -vf "vidstabtransform=input=${transformsPath}:smoothing=10:crop=black:zoom=1:optzoom=2" -c:a copy -y "${stabilizedPath}"`
    );

    // Cleanup transforms file
    try { fs.unlinkSync(transformsPath); } catch {}

    console.log(`[Stabilize] Stabilization complete. Shakiness reduced from ${avgShakiness.toFixed(1)} to near 0`);

    return {
      wasShaky: true,
      shakiness: avgShakiness,
      stabilizedPath,
    };

  } catch (error: any) {
    console.error('[Stabilize] Error:', error.message);
    // If stabilization fails, return original video
    try { fs.unlinkSync(transformsPath); } catch {}
    return { wasShaky: false, shakiness: 0, stabilizedPath: videoPath };
  }
}
