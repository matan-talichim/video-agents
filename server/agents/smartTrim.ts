import fs from 'fs';
import { runFFmpeg } from '../services/ffmpeg.js';
import type { ContentAnalysis } from '../services/contentAnalyzer.js';

export async function runSmartTrim(
  videoPath: string,
  analysis: ContentAnalysis,
  outputPath: string
): Promise<string> {
  const segments = analysis.recommendedEdit.segments;

  if (!segments || segments.length === 0) {
    // No trimming needed — copy original
    fs.copyFileSync(videoPath, outputPath);
    return outputPath;
  }

  // Build the trimmed video from recommended segments
  const segmentFiles: string[] = [];
  const editDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  fs.mkdirSync(editDir, { recursive: true });

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segPath = outputPath.replace('.mp4', `_seg_${i}.mp4`);

    try {
      await runFFmpeg(
        `ffmpeg -i "${videoPath}" -ss ${seg.start} -to ${seg.end} -c copy -y "${segPath}"`
      );

      if (fs.existsSync(segPath)) {
        segmentFiles.push(segPath);
      }
    } catch (error: any) {
      console.error(`[SmartTrim] Segment ${i} failed:`, error.message);
      // Skip failed segments
    }
  }

  if (segmentFiles.length === 0) {
    // All segments failed — copy original
    console.warn('[SmartTrim] All segments failed — using original video');
    fs.copyFileSync(videoPath, outputPath);
    return outputPath;
  }

  // Concat in the recommended order
  const listPath = outputPath.replace('.mp4', '_list.txt');
  fs.writeFileSync(listPath, segmentFiles.map(s => `file '${s}'`).join('\n'));
  await runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${outputPath}"`);

  // Cleanup
  for (const seg of segmentFiles) {
    try { fs.unlinkSync(seg); } catch {}
  }
  try { fs.unlinkSync(listPath); } catch {}

  return outputPath;
}
