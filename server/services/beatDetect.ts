import { runFFmpeg } from './ffmpeg.js';

export interface BeatResult {
  bpm: number;
  beats: number[];    // all beat timestamps
  kicks: number[];    // strong beat timestamps (downbeats)
  drums: number[];    // all percussive hits
  duration: number;
}

/**
 * Detect beats using FFmpeg's audio analysis.
 * Uses silence detection as onset proxy, falls back to estimated BPM.
 */
export async function detectBeats(audioPath: string): Promise<BeatResult> {
  console.log('[BeatDetect] Analyzing audio for beats:', audioPath);
  const startTime = Date.now();

  try {
    const result = await estimateBeatsFromAudio(audioPath);
    const duration = Date.now() - startTime;
    console.log(`[BeatDetect] Completed in ${duration}ms — BPM: ${result.bpm}, beats: ${result.beats.length}`);
    return result;
  } catch (error: any) {
    console.error('[BeatDetect] Failed:', error.message);
    // Return safe fallback
    return { bpm: 120, beats: [], kicks: [], drums: [], duration: 0 };
  }
}

/**
 * Estimate beat positions from audio analysis using FFmpeg.
 * Uses silence detection to find onset points (volume spikes after silence).
 */
async function estimateBeatsFromAudio(audioPath: string): Promise<BeatResult> {
  // Get audio duration
  const { stdout: durationStr } = await runFFmpeg(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`
  );
  const duration = parseFloat(durationStr.trim());

  if (isNaN(duration) || duration <= 0) {
    throw new Error('Could not determine audio duration');
  }

  // Use FFmpeg silence detection to find onset points (volume spikes)
  let onsets: number[] = [];

  try {
    const { stderr } = await runFFmpeg(
      `ffmpeg -i "${audioPath}" -af "silencedetect=noise=-20dB:d=0.1" -f null -`
    );

    // Parse silence_end timestamps as potential beat positions
    const endRegex = /silence_end: ([\d.]+)/g;
    let match;
    while ((match = endRegex.exec(stderr)) !== null) {
      onsets.push(parseFloat(match[1]));
    }
  } catch (error: any) {
    // silencedetect may write to stderr and cause non-zero exit — parse it anyway
    const output = error.message || '';
    const endRegex = /silence_end: ([\d.]+)/g;
    let match;
    while ((match = endRegex.exec(output)) !== null) {
      onsets.push(parseFloat(match[1]));
    }
  }

  // If onset detection didn't find enough beats, generate evenly-spaced beats
  if (onsets.length < 4) {
    const bpm = 120; // default: common for background music
    const beatInterval = 60 / bpm;
    onsets = [];
    for (let t = beatInterval; t < duration; t += beatInterval) {
      onsets.push(parseFloat(t.toFixed(3)));
    }
  }

  // Estimate BPM from onset intervals
  let bpm = 120;
  if (onsets.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < Math.min(onsets.length, 20); i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval > 0) {
      bpm = Math.round(60 / avgInterval);
      // Sanity check: BPM should be between 60 and 200
      bpm = Math.max(60, Math.min(200, bpm));
    }
  }

  // Separate into kicks (strong beats / downbeats) and all beats
  const kicks = onsets.filter((_, i) => i % 2 === 0);
  const drums = onsets;

  return {
    bpm,
    beats: onsets,
    kicks,
    drums,
    duration,
  };
}

/** Get beats filtered by mode */
export function getBeatsForMode(result: BeatResult, mode: 'kicks' | 'drums' | 'combined'): number[] {
  switch (mode) {
    case 'kicks': return result.kicks;
    case 'drums': return result.drums;
    case 'combined': return result.beats;
    default: return result.beats;
  }
}

/** Snap a timestamp to the nearest beat (within tolerance) */
export function snapToNearestBeat(timestamp: number, beats: number[], tolerance: number = 0.5): number {
  if (beats.length === 0) return timestamp;

  let nearest = beats[0];
  let minDist = Math.abs(timestamp - beats[0]);

  for (const beat of beats) {
    const dist = Math.abs(timestamp - beat);
    if (dist < minDist) {
      minDist = dist;
      nearest = beat;
    }
  }

  // Only snap if within tolerance
  return minDist <= tolerance ? nearest : timestamp;
}
