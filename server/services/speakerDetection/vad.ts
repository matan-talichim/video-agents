import { execSync } from 'child_process';

export interface VADSegment {
  start: number;
  end: number;
}

export async function detectVoiceActivity(audioPath: string): Promise<VADSegment[]> {
  console.log('[VAD] Running Silero VAD...');
  const startTime = Date.now();

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
    // Fallback: assume entire audio is speech
    return [{ start: 0, end: 9999 }];
  }
}
