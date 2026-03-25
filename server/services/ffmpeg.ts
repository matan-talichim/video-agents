import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Execute FFmpeg/FFprobe command with error handling and logging
export async function runFFmpeg(command: string): Promise<{ stdout: string; stderr: string }> {
  const startTime = Date.now();
  console.log(`[FFmpeg] Running: ${command.slice(0, 200)}...`);

  try {
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });
    const duration = Date.now() - startTime;
    console.log(`[FFmpeg] Completed in ${duration}ms`);
    return { stdout, stderr };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[FFmpeg] Failed after ${duration}ms:`, error.stderr?.slice(-500));

    // Some FFmpeg commands output to stderr even on success (e.g. silencedetect)
    // If we have stderr output but it's an "expected" usage, return it
    if (error.stderr && error.stdout !== undefined) {
      return { stdout: error.stdout || '', stderr: error.stderr };
    }

    throw new Error(`FFmpeg failed: ${error.stderr?.slice(-500) || error.message}`);
  }
}

// Extract audio for transcription (WAV 16kHz mono)
export async function extractAudioForTranscription(input: string, output: string): Promise<void> {
  await runFFmpeg(`ffmpeg -i "${input}" -ac 1 -ar 16000 -vn -y "${output}"`);
}

// Detect silences — returns stderr which contains silence_start/silence_end markers
export async function detectSilences(
  input: string,
  noiseDB: number = -30,
  durationSec: number = 1.5
): Promise<Array<{ start: number; end: number }>> {
  try {
    const { stderr } = await runFFmpeg(
      `ffmpeg -i "${input}" -af silencedetect=noise=${noiseDB}dB:d=${durationSec} -f null -`
    );
    return parseSilenceDetect(stderr);
  } catch (error: any) {
    // silencedetect writes to stderr and may cause non-zero exit
    if (error.message && error.message.includes('silence_start')) {
      return parseSilenceDetect(error.message);
    }
    throw error;
  }
}

// Parse silence detection output from stderr
export function parseSilenceDetect(stderr: string): Array<{ start: number; end: number }> {
  const silences: Array<{ start: number; end: number }> = [];
  const startRegex = /silence_start: ([\d.]+)/g;
  const endRegex = /silence_end: ([\d.]+)/g;
  const starts = [...stderr.matchAll(startRegex)].map(m => parseFloat(m[1]));
  const ends = [...stderr.matchAll(endRegex)].map(m => parseFloat(m[1]));

  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    silences.push({ start: starts[i], end: ends[i] });
  }
  return silences;
}

// Trim video to segments and concatenate using concat demuxer
export async function trimAndConcat(
  input: string,
  segments: Array<{ start: number; end: number }>,
  output: string,
  jobId: string
): Promise<void> {
  const concatListPath = path.join('temp', jobId, 'concat_list.txt');
  const concatContent = segments
    .map(seg => `file '${path.resolve(input)}'\ninpoint ${seg.start}\noutpoint ${seg.end}`)
    .join('\n');

  fs.writeFileSync(concatListPath, concatContent);
  await runFFmpeg(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${output}"`);
}

// Concat multiple video files
export async function concatVideos(inputs: string[], output: string, jobId: string): Promise<void> {
  const listPath = path.join('temp', jobId, 'concat_videos_list.txt');
  const listContent = inputs.map(f => `file '${path.resolve(f)}'`).join('\n');
  fs.writeFileSync(listPath, listContent);
  await runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${output}"`);
}

// Extract frames at interval (for footage classification)
export async function extractFrames(
  input: string,
  outputPattern: string,
  intervalSec: number
): Promise<void> {
  await runFFmpeg(`ffmpeg -i "${input}" -vf "fps=1/${intervalSec}" -q:v 2 -y "${outputPattern}"`);
}

// Extract single frame at timestamp
export async function extractFrame(
  input: string,
  timestamp: number,
  output: string
): Promise<void> {
  await runFFmpeg(`ffmpeg -i "${input}" -ss ${timestamp} -vframes 1 -q:v 2 -y "${output}"`);
}

// Extract audio from video
export async function extractAudio(input: string, output: string): Promise<void> {
  await runFFmpeg(`ffmpeg -i "${input}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${output}"`);
}

// Apply time offset to video (for multi-cam sync)
export async function applyOffset(
  input: string,
  offsetSeconds: number,
  output: string
): Promise<void> {
  await runFFmpeg(`ffmpeg -itsoffset ${offsetSeconds} -i "${input}" -c copy -y "${output}"`);
}

// Detect shaky footage
export async function vidstabDetect(input: string, transformFile: string): Promise<void> {
  await runFFmpeg(
    `ffmpeg -i "${input}" -vf vidstabdetect=shakiness=5:accuracy=15:result="${transformFile}" -f null -`
  );
}

// Stabilize shaky footage
export async function vidstabTransform(
  input: string,
  transformFile: string,
  output: string
): Promise<void> {
  await runFFmpeg(
    `ffmpeg -i "${input}" -vf vidstabtransform=input="${transformFile}":zoom=5:smoothing=30 -y "${output}"`
  );
}

// Get video duration in seconds
export async function getVideoDuration(input: string): Promise<number> {
  const { stdout } = await runFFmpeg(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${input}"`
  );
  return parseFloat(stdout.trim());
}

// Get video info (resolution, fps, codec)
export async function getVideoInfo(
  input: string
): Promise<{ width: number; height: number; fps: string; codec: string }> {
  const { stdout } = await runFFmpeg(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,codec_name -of json "${input}"`
  );
  const data = JSON.parse(stdout);
  const stream = data.streams?.[0] || {};
  return {
    width: stream.width || 0,
    height: stream.height || 0,
    fps: stream.r_frame_rate || '0/1',
    codec: stream.codec_name || 'unknown',
  };
}

// Invert ranges to get segments to keep (used by silence/filler removal)
export function invertRanges(
  ranges: Array<{ start: number; end: number }>,
  totalDuration: number
): Array<{ start: number; end: number }> {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const keepSegments: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  for (const range of sorted) {
    if (cursor < range.start) {
      keepSegments.push({ start: cursor, end: range.start });
    }
    cursor = Math.max(cursor, range.end);
  }

  if (cursor < totalDuration) {
    keepSegments.push({ start: cursor, end: totalDuration });
  }

  return keepSegments;
}

// Parse vidstab transform file to get average shakiness
export function parseShakiness(transformData: string): number {
  const lines = transformData.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length === 0) return 0;

  let totalShake = 0;
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const dx = Math.abs(parseFloat(parts[1] || '0'));
    const dy = Math.abs(parseFloat(parts[2] || '0'));
    totalShake += Math.sqrt(dx * dx + dy * dy);
  }

  return totalShake / lines.length;
}

// Find audio offset between two files using cross-correlation
// Uses FFmpeg's correlation filter to find time offset between two audio tracks
export async function findAudioOffset(audio1: string, audio2: string): Promise<number> {
  try {
    // Use ffmpeg's adelay and amix approach — extract short segments and correlate
    // For a simpler approach, we compare loudness peaks in both tracks
    const { stderr: stderr1 } = await runFFmpeg(
      `ffmpeg -i "${audio1}" -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null -`
    );
    const { stderr: stderr2 } = await runFFmpeg(
      `ffmpeg -i "${audio2}" -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null -`
    );

    // Extract RMS peaks from both tracks
    const peaks1 = extractRMSPeaks(stderr1);
    const peaks2 = extractRMSPeaks(stderr2);

    // Simple cross-correlation to find best offset
    const offset = crossCorrelate(peaks1, peaks2);
    console.log(`[FFmpeg] Audio offset detected: ${offset}s`);
    return offset;
  } catch (error) {
    console.error('[FFmpeg] Audio offset detection failed, defaulting to 0:', error);
    return 0;
  }
}

function extractRMSPeaks(stderr: string): number[] {
  const regex = /lavfi\.astats\.Overall\.RMS_level=([-\d.]+)/g;
  const values: number[] = [];
  let match;
  while ((match = regex.exec(stderr)) !== null) {
    values.push(parseFloat(match[1]));
  }
  return values;
}

function crossCorrelate(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const maxShift = Math.min(Math.floor(a.length / 2), 300); // max 300 frames (~10s at 30fps)
  let bestCorr = -Infinity;
  let bestShift = 0;

  for (let shift = -maxShift; shift <= maxShift; shift++) {
    let corr = 0;
    let count = 0;
    for (let i = 0; i < a.length; i++) {
      const j = i + shift;
      if (j >= 0 && j < b.length) {
        corr += a[i] * b[j];
        count++;
      }
    }
    if (count > 0) {
      corr /= count;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestShift = shift;
      }
    }
  }

  // Convert frame offset to seconds (assuming ~30fps analysis rate)
  return bestShift / 30;
}
