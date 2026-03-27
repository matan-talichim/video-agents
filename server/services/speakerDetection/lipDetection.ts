import { execSync } from 'child_process';
import { VADSegment } from './vad';

export interface VisualSpeechSegment {
  start: number;
  end: number;
}

// Cache Python dependency check to avoid repeating failed imports
let pythonMediapipeWorks: boolean | null = null;

function checkMediapipe(): boolean {
  if (pythonMediapipeWorks !== null) return pythonMediapipeWorks;
  try {
    execSync('python3 -c "import mediapipe; import cv2; print(1)"',
      { stdio: 'pipe', encoding: 'utf-8', timeout: 15000 });
    pythonMediapipeWorks = true;
  } catch {
    console.warn('[LipDetect] ⚠️ mediapipe/cv2 not working. Run: pip3 install "numpy<2" mediapipe opencv-python --break-system-packages');
    pythonMediapipeWorks = false;
  }
  return pythonMediapipeWorks;
}

export async function detectLipMotion(
  videoLowResPath: string,
  speechSegments: VADSegment[]
): Promise<VisualSpeechSegment[]> {
  console.log(`[LipDetect] Analyzing lip motion for ${speechSegments.length} speech segments...`);
  const startTime = Date.now();

  if (!checkMediapipe()) {
    console.warn('[LipDetect] Skipping — mediapipe unavailable. Assuming all speech is presenter.');
    return speechSegments;
  }

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
    // Mark as broken so we don't retry next time
    pythonMediapipeWorks = false;
    // Fallback: assume all speech segments are presenter
    return speechSegments;
  }
}
