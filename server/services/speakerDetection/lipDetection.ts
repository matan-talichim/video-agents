import { execSync } from 'child_process';
import { VADSegment } from './vad';

export interface VisualSpeechSegment {
  start: number;
  end: number;
}

export async function detectLipMotion(
  videoLowResPath: string,
  speechSegments: VADSegment[]
): Promise<VisualSpeechSegment[]> {
  console.log(`[LipDetect] Analyzing lip motion for ${speechSegments.length} speech segments...`);
  const startTime = Date.now();

  try {
    const segmentsJson = JSON.stringify(speechSegments);

    const result = execSync(
      `python3 server/services/speakerDetection/lipDetection.py "${videoLowResPath}" '${segmentsJson}'`,
      { encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
    );

    const visualSegments: VisualSpeechSegment[] = JSON.parse(result.trim());
    const totalVisual = visualSegments.reduce((sum, s) => sum + (s.end - s.start), 0);

    console.log(`[LipDetect] Found ${visualSegments.length} visual speech segments (${totalVisual.toFixed(1)}s) in ${Date.now() - startTime}ms`);

    return visualSegments;
  } catch (err: any) {
    console.error('[LipDetect] Failed:', err.message);
    // Fallback: assume all speech segments are presenter
    return speechSegments;
  }
}
