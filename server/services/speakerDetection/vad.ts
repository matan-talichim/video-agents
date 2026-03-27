import { execSync } from 'child_process';

export interface VADSegment {
  start: number;
  end: number;
}

// Cache Python dependency check to avoid repeating failed imports
let pythonVadWorks: boolean | null = null;

function checkPythonVad(): boolean {
  if (pythonVadWorks !== null) return pythonVadWorks;
  try {
    execSync('python3 -c "import numpy; import scipy; print(1)"',
      { stdio: 'pipe', encoding: 'utf-8', timeout: 15000 });
    pythonVadWorks = true;
  } catch {
    console.warn('[VAD] ⚠️ Python dependencies not working (numpy/scipy). Run: pip3 install "numpy<2" scipy --break-system-packages');
    pythonVadWorks = false;
  }
  return pythonVadWorks;
}

export async function detectVoiceActivity(audioPath: string): Promise<VADSegment[]> {
  console.log('[VAD] Running Silero VAD...');
  const startTime = Date.now();

  if (!checkPythonVad()) {
    console.warn('[VAD] Skipping — Python dependencies unavailable. Using full-audio fallback.');
    return [{ start: 0, end: 9999 }];
  }

  try {
    const result = execSync(
      `python3 server/services/speakerDetection/vad.py "${audioPath}"`,
      { encoding: 'utf-8', timeout: 60000 }
    );

    const segments: VADSegment[] = JSON.parse(result.trim());
    const totalSpeech = segments.reduce((sum, s) => sum + (s.end - s.start), 0);

    console.log(`[VAD] Found ${segments.length} speech segments (${totalSpeech.toFixed(1)}s total) in ${Date.now() - startTime}ms`);

    return segments;
  } catch (err: any) {
    console.error('[VAD] Failed:', err.message);
    // Mark as broken so we don't retry next time
    pythonVadWorks = false;
    // Fallback: assume entire audio is speech
    return [{ start: 0, end: 9999 }];
  }
}
