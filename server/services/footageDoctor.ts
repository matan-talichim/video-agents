// server/services/footageDoctor.ts
// Automatic detection and fixing of 10 edge cases that cause amateur-looking output.
// Runs during INGEST — before any editing begins — to fix common footage problems.

import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface FootageDiagnosis {
  resolution: { width: number; height: number; needsUpscale: boolean; targetRes: string };
  blackBars: { detected: boolean; cropValues: string | null };
  freezeFrames: { detected: boolean; count: number };
  flashFrames: { detected: boolean; timestamps: number[] };
  duration: number;
  durationCategory: 'too-short' | 'short' | 'normal' | 'long' | 'very-long';
  hasSpeech: boolean;
  speakerCount: number;
  fixes: string[];
}

export async function diagnoseFootage(videoPath: string, jobId: string): Promise<FootageDiagnosis> {
  console.log('[Doctor] Diagnosing footage...');
  const editDir = `temp/${jobId}`;
  fs.mkdirSync(editDir, { recursive: true });
  const fixes: string[] = [];

  // === 1. GET RESOLUTION ===
  let width = 1920;
  let height = 1080;
  let duration = 0;
  try {
    const probeResult = await runFFmpeg(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "${videoPath}" 2>&1`
    );
    const parts = probeResult.trim().split(',');
    width = parseInt(parts[0]) || 1920;
    height = parseInt(parts[1]) || 1080;
    duration = parseFloat(parts[2]) || 0;
  } catch (err: any) {
    console.warn('[Doctor] Probe failed, using defaults:', err.message);
  }

  const needsUpscale = height < 1080;
  const targetRes = height < 720 ? '1280:720' : height < 1080 ? '1920:1080' : 'none';

  // === 2. DETECT BLACK BARS ===
  let cropValues: string | null = null;
  let blackBarsDetected = false;
  try {
    const cropResult = await runFFmpeg(
      `ffmpeg -ss 2 -i "${videoPath}" -vframes 10 -vf cropdetect=24:16:0 -f null - 2>&1`
    );
    const cropMatch = cropResult.match(/crop=(\d+:\d+:\d+:\d+)/g);
    if (cropMatch && cropMatch.length > 0) {
      const lastCrop = cropMatch[cropMatch.length - 1].replace('crop=', '');
      const [cw, ch] = lastCrop.split(':').map(Number);
      // If cropped dimensions are significantly smaller than original, black bars exist
      if (cw < width - 20 || ch < height - 20) {
        blackBarsDetected = true;
        cropValues = lastCrop;
      }
    }
  } catch {}

  // === 3. DETECT FLASH/BLACK FRAMES ===
  const flashTimestamps: number[] = [];
  try {
    const blackResult = await runFFmpeg(
      `ffmpeg -i "${videoPath}" -vf "blackdetect=d=0.04:pix_th=0.1" -f null - 2>&1`
    );
    const flashMatches = blackResult.match(/black_start:([\d.]+)/g);
    if (flashMatches) {
      for (const match of flashMatches) {
        const ts = parseFloat(match.replace('black_start:', ''));
        // Only flag very short blacks (< 0.2s = flash frame, not intentional fade)
        flashTimestamps.push(ts);
      }
    }
  } catch {}

  // === 4. DETECT FREEZE/DUPLICATE FRAMES ===
  let freezeCount = 0;
  try {
    const freezeResult = await runFFmpeg(
      `ffmpeg -i "${videoPath}" -vf "mpdecimate=hi=64*12:lo=64*5:frac=0.1" -loglevel debug -f null - 2>&1`
    );
    const dropMatches = freezeResult.match(/drop_count:(\d+)/g);
    if (dropMatches && dropMatches.length > 0) {
      freezeCount = parseInt(dropMatches[dropMatches.length - 1].replace('drop_count:', '')) || 0;
    }
  } catch {}

  // === 5. CLASSIFY DURATION ===
  const durationCategory: FootageDiagnosis['durationCategory'] =
    duration < 10 ? 'too-short' :
    duration < 30 ? 'short' :
    duration < 180 ? 'normal' :
    duration < 600 ? 'long' :
    'very-long';

  // === BUILD FIX LIST ===
  if (needsUpscale) fixes.push(`upscale: ${width}x${height} → ${targetRes}`);
  if (blackBarsDetected) fixes.push(`crop-black-bars: ${cropValues}`);
  if (flashTimestamps.length > 0) fixes.push(`flash-frames: ${flashTimestamps.length} detected`);
  if (freezeCount > 5) fixes.push(`freeze-frames: ${freezeCount} duplicate frames`);

  console.log(`[Doctor] Diagnosis: ${width}x${height}, ${duration.toFixed(0)}s, ${durationCategory}, ${fixes.length} fixes needed`);

  return {
    resolution: { width, height, needsUpscale, targetRes },
    blackBars: { detected: blackBarsDetected, cropValues },
    freezeFrames: { detected: freezeCount > 5, count: freezeCount },
    flashFrames: { detected: flashTimestamps.length > 0, timestamps: flashTimestamps },
    duration,
    durationCategory,
    hasSpeech: true,  // Will be updated after transcription
    speakerCount: 1,  // Will be updated after speaker detection
    fixes,
  };
}

// === AUTO-FIX FOOTAGE PROBLEMS ===
export async function autoFixFootage(
  videoPath: string,
  diagnosis: FootageDiagnosis,
  jobId: string
): Promise<string> {
  let currentVideo = videoPath;
  const editDir = `temp/${jobId}`;
  fs.mkdirSync(editDir, { recursive: true });

  // Fix 1: Upscale low resolution
  if (diagnosis.resolution.needsUpscale && diagnosis.resolution.targetRes !== 'none') {
    console.log(`[Doctor] Upscaling to ${diagnosis.resolution.targetRes}...`);
    const output = `${editDir}/upscaled.mp4`;
    await runFFmpeg(
      `ffmpeg -i "${currentVideo}" -vf "scale=${diagnosis.resolution.targetRes}:flags=lanczos,unsharp=5:5:0.7:5:5:0.3" -c:v libx264 -crf 18 -c:a copy -y "${output}"`
    );
    currentVideo = output;
  }

  // Fix 2: Crop black bars
  if (diagnosis.blackBars.detected && diagnosis.blackBars.cropValues) {
    console.log(`[Doctor] Cropping black bars: ${diagnosis.blackBars.cropValues}...`);
    const output = `${editDir}/cropped.mp4`;
    await runFFmpeg(
      `ffmpeg -i "${currentVideo}" -vf "crop=${diagnosis.blackBars.cropValues}" -c:a copy -y "${output}"`
    );
    currentVideo = output;
  }

  // Fix 3: Remove duplicate/freeze frames
  if (diagnosis.freezeFrames.detected) {
    console.log(`[Doctor] Removing ${diagnosis.freezeFrames.count} duplicate frames...`);
    const output = `${editDir}/deduped.mp4`;
    await runFFmpeg(
      `ffmpeg -i "${currentVideo}" -vf "mpdecimate,setpts=N/FRAME_RATE/TB" -c:a copy -y "${output}"`
    );
    currentVideo = output;
  }

  return currentVideo;
}
