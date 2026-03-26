// server/services/beatSync.ts
// Beat-synced editing: detect beats in music and snap cuts to them.

import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface BeatMap {
  beats: number[];          // timestamps in seconds
  bpm: number;
  strongBeats: number[];    // downbeats (every 4th beat typically)
  segments: Array<{ start: number; end: number; energy: 'low' | 'medium' | 'high' }>;
}

export async function detectBeats(audioPath: string, jobId: string): Promise<BeatMap> {
  console.log('[BeatSync] Analyzing music beats...');
  const editDir = `temp/${jobId}`;
  fs.mkdirSync(editDir, { recursive: true });

  // Extract audio from music track
  const wavPath = `${editDir}/music_analysis.wav`;
  await runFFmpeg(`ffmpeg -i "${audioPath}" -ac 1 -ar 22050 -y "${wavPath}"`);

  // Use FFmpeg's astats for energy analysis
  const { stderr: energyResult } = await runFFmpeg(
    `ffmpeg -i "${wavPath}" -af "aresample=22050,astats=metadata=1:reset=1" -f null -`
  );

  // Parse energy peaks from FFmpeg output
  const beats: number[] = [];
  const strongBeats: number[] = [];

  const volumeSamples: Array<{ time: number; level: number }> = [];
  const lines = energyResult.split('\n');
  for (const line of lines) {
    const timeMatch = line.match(/pts_time:([\d.]+)/);
    const levelMatch = line.match(/RMS level dB:\s*([-\d.]+)/);
    if (timeMatch && levelMatch) {
      volumeSamples.push({ time: parseFloat(timeMatch[1]), level: parseFloat(levelMatch[1]) });
    }
  }

  // Find peaks (volume spikes = beats)
  for (let i = 1; i < volumeSamples.length - 1; i++) {
    const prev = volumeSamples[i - 1].level;
    const curr = volumeSamples[i].level;
    const next = volumeSamples[i + 1].level;
    if (curr > prev && curr > next && curr > -25) {
      beats.push(volumeSamples[i].time);
    }
  }

  // Estimate BPM from beat intervals
  const intervals: number[] = [];
  for (let i = 1; i < Math.min(beats.length, 20); i++) {
    intervals.push(beats[i] - beats[i - 1]);
  }
  const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b) / intervals.length : 0.5;
  const bpm = avgInterval > 0 ? Math.round(60 / avgInterval) : 120;

  // Strong beats = every 4th beat (downbeat)
  for (let i = 0; i < beats.length; i += 4) {
    strongBeats.push(beats[i]);
  }

  // Cleanup
  try { fs.unlinkSync(wavPath); } catch {}

  console.log(`[BeatSync] Detected ${beats.length} beats, BPM: ${bpm}, ${strongBeats.length} strong beats`);

  return { beats, bpm, strongBeats, segments: [] };
}

// Snap cut timestamps to nearest beat
export function snapCutsToBeats(
  cuts: Array<{ at: number; [key: string]: any }>,
  beatMap: BeatMap,
  tolerance: number = 0.3
): Array<{ at: number; snappedToBeat: boolean; [key: string]: any }> {

  return cuts.map(cut => {
    let nearestBeat = cut.at;
    let minDistance = Infinity;

    for (const beat of beatMap.beats) {
      const distance = Math.abs(beat - cut.at);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBeat = beat;
      }
    }

    if (minDistance <= tolerance) {
      return { ...cut, at: nearestBeat, snappedToBeat: true };
    }
    return { ...cut, snappedToBeat: false };
  });
}

// For no-speech videos: generate cuts entirely from beats
export function generateBeatCuts(
  beatMap: BeatMap,
  duration: number,
  paceMode: 'fast' | 'normal' | 'calm'
): Array<{ at: number; type: string; reason: string }> {
  const cuts: Array<{ at: number; type: string; reason: string }> = [];

  // Fast = cut on every beat, Normal = every 2nd beat, Calm = every 4th (strong) beat
  const beatsToUse = paceMode === 'fast' ? beatMap.beats
    : paceMode === 'normal' ? beatMap.beats.filter((_, i) => i % 2 === 0)
    : beatMap.strongBeats;

  for (const beat of beatsToUse) {
    if (beat > 0.5 && beat < duration - 0.5) {
      cuts.push({ at: beat, type: 'beat-cut', reason: `beat-sync at ${beat.toFixed(2)}s` });
    }
  }

  return cuts;
}
