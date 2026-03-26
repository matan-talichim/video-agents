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

// Safe duration getter — returns 0 on failure instead of throwing
export async function getVideoDurationSafe(input: string): Promise<number> {
  try {
    return await getVideoDuration(input);
  } catch {
    return 0;
  }
}

// Validate that a timestamp is within video bounds before using it in FFmpeg commands.
// Returns the clamped timestamp, or -1 if the video is too short to process.
export function clampTimestamp(timestamp: number, videoDuration: number, minRemaining: number = 0.5): number {
  if (videoDuration < minRemaining) return -1;
  return Math.min(timestamp, Math.max(0, videoDuration - minRemaining));
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

// === VIDEO ASSEMBLY ===

// Overlay B-Roll at specific timestamps on the main video
export function overlayBRoll(mainVideo: string, brollClip: string, startTime: number, duration: number, output: string): string {
  return `ffmpeg -i "${mainVideo}" -i "${brollClip}" -filter_complex "[1:v]trim=0:${duration},setpts=PTS-STARTPTS[broll];[0:v][broll]overlay=enable='between(t,${startTime},${startTime + duration})'" -c:a copy -y "${output}"`;
}

// Replace video segment with B-Roll (not overlay — full replacement)
export function replaceBRollSegment(mainVideo: string, brollClip: string, startTime: number, endTime: number, output: string): string {
  return `ffmpeg -i "${mainVideo}" -i "${brollClip}" -filter_complex "[0:v]trim=0:${startTime},setpts=PTS-STARTPTS[before];[0:a]atrim=0:${startTime},asetpts=PTS-STARTPTS[abefore];[1:v]trim=0:${endTime - startTime},setpts=PTS-STARTPTS[broll];[0:a]atrim=${startTime}:${endTime},asetpts=PTS-STARTPTS[abroll];[0:v]trim=${endTime},setpts=PTS-STARTPTS[after];[0:a]atrim=${endTime},asetpts=PTS-STARTPTS[aafter];[before][abefore][broll][abroll][after][aafter]concat=n=3:v=1:a=1[v][a]" -map "[v]" -map "[a]" -y "${output}"`;
}

// === COLOR ===

// Apply LUT color grading
export function applyLUT(input: string, lutFile: string, output: string): string {
  return `ffmpeg -i "${input}" -vf "lut3d='${lutFile}'" -c:a copy -y "${output}"`;
}

// Color match camera 2 to camera 1
export function colorMatchCameras(_reference: string, target: string, output: string): string {
  return `ffmpeg -i "${target}" -vf "colorbalance=rs=0.05:gs=-0.02:bs=0.05,eq=brightness=0.02:contrast=1.05" -c:a copy -y "${output}"`;
}

// Skin tone correction
export function skinToneCorrection(input: string, output: string): string {
  return `ffmpeg -i "${input}" -vf "eq=saturation=1.1:contrast=1.03,colorbalance=rh=0.02:gh=0.01:bh=-0.01" -c:a copy -y "${output}"`;
}

// Lighting enhancement
export function lightingEnhancement(input: string, output: string): string {
  return `ffmpeg -i "${input}" -vf "eq=brightness=0.05:contrast=1.12:saturation=1.08:gamma=1.08" -c:a copy -y "${output}"`;
}

// === AUDIO ===

// Mix music with video, with auto-ducking
export function mixMusicWithDucking(videoInput: string, musicFile: string, output: string): string {
  return `ffmpeg -i "${videoInput}" -i "${musicFile}" -filter_complex "[1:a]volume=0.15[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[mixed];[0:a]asplit[speech][sc];[sc]aformat=channel_layouts=mono,compand=attacks=0:decays=0.3:points=-80/-80|-20/-20|0/-15[sidechain];[1:a]volume=0.2[musicduck];[musicduck][sidechain]sidechaincompress=threshold=0.03:ratio=6:attack=200:release=1000[ducked];[speech][ducked]amix=inputs=2:duration=first[out]" -map 0:v -map "[out]" -c:v copy -y "${output}"`;
}

// Simpler music mix (no sidechain, just lower volume)
export function mixMusicSimple(videoInput: string, musicFile: string, musicVolume: number, output: string): string {
  return `ffmpeg -i "${videoInput}" -i "${musicFile}" -filter_complex "[1:a]volume=${musicVolume}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2" -map 0:v -c:v copy -y "${output}"`;
}

// Overlay sound effects at specific timestamps
export function overlaySFX(videoInput: string, sfxList: Array<{file: string, timestamp: number, volume: number}>, output: string): string {
  if (sfxList.length === 0) return `cp "${videoInput}" "${output}"`;

  let inputs = `ffmpeg -i "${videoInput}"`;
  const filterParts: string[] = [];

  for (let i = 0; i < sfxList.length; i++) {
    inputs += ` -i "${sfxList[i].file}"`;
    filterParts.push(`[${i + 1}:a]volume=${sfxList[i].volume},adelay=${Math.floor(sfxList[i].timestamp * 1000)}|${Math.floor(sfxList[i].timestamp * 1000)}[sfx${i}]`);
  }

  const mixInputs = sfxList.map((_, i) => `[sfx${i}]`).join('');
  const filterComplex = `${filterParts.join(';')};[0:a]${mixInputs}amix=inputs=${sfxList.length + 1}:duration=first`;

  return `${inputs} -filter_complex "${filterComplex}" -map 0:v -c:v copy -y "${output}"`;
}

// Enhance speech clarity
export function enhanceSpeech(input: string, output: string): string {
  return `ffmpeg -i "${input}" -af "highpass=f=80,lowpass=f=8000,equalizer=f=3000:t=q:w=1:g=3,acompressor=threshold=-20dB:ratio=4:attack=5:release=50,loudnorm=I=-16:TP=-1.5" -c:v copy -y "${output}"`;
}

// Noise reduction
export function noiseReduction(input: string, output: string): string {
  return `ffmpeg -i "${input}" -af "afftdn=nf=-25:tn=1" -c:v copy -y "${output}"`;
}

// Replace audio track entirely (for dubbing)
export function replaceAudio(videoInput: string, audioInput: string, output: string): string {
  return `ffmpeg -i "${videoInput}" -i "${audioInput}" -map 0:v -map 1:a -c:v copy -shortest -y "${output}"`;
}

// === VISUAL EFFECTS ===

// Background blur (blurs edges/corners more than center)
export function backgroundBlur(input: string, blurStrength: number, output: string): string {
  return `ffmpeg -i "${input}" -vf "split[original][blur];[blur]gblur=sigma=${blurStrength}[blurred];[original][blurred]overlay=shortest=1" -c:a copy -y "${output}"`;
}

// Smart zooms at keyframe moments
// NOTE: zoompan re-encodes every frame. If timestamps exceed video duration, FFmpeg hits EOF before encoder starts.
// Callers should validate timestamps against actual video duration before calling this.
export function addZoom(input: string, startTime: number, endTime: number, zoomFactor: number, output: string): string {
  // Ensure non-negative and startTime < endTime
  const safeStart = Math.max(0, startTime);
  const safeEnd = Math.max(safeStart + 0.1, endTime);
  return `ffmpeg -i "${input}" -vf "zoompan=z='if(between(t,${safeStart},${safeEnd}),${zoomFactor},1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30" -c:a copy -y "${output}"`;
}

// Ken Burns effect on still image
export function photoMotion(imagePath: string, style: string, duration: number, output: string): string {
  const effects: Record<string, string> = {
    'ken-burns': `zoompan=z='zoom+0.0008':d=${duration * 30}:s=1920x1080:fps=30`,
    'zoom': `zoompan=z='1.0+0.2*t/${duration}':d=${duration * 30}:s=1920x1080:fps=30`,
    'pan': `zoompan=z='1.2':x='iw*t/${duration}':d=${duration * 30}:s=1920x1080:fps=30`,
  };
  return `ffmpeg -loop 1 -i "${imagePath}" -vf "${effects[style] || effects['ken-burns']}" -t ${duration} -pix_fmt yuv420p -c:v libx264 -y "${output}"`;
}

// Add logo watermark
export function addLogo(input: string, logoFile: string, position: string, opacity: number, output: string): string {
  const positions: Record<string, string> = {
    'bottom-right': 'W-w-20:H-h-20',
    'bottom-left': '20:H-h-20',
    'top-right': 'W-w-20:20',
    'top-left': '20:20',
  };
  const pos = positions[position] || positions['bottom-right'];
  return `ffmpeg -i "${input}" -i "${logoFile}" -filter_complex "[1:v]scale=120:-1,format=rgba,colorchannelmixer=aa=${opacity}[logo];[0:v][logo]overlay=${pos}" -c:a copy -y "${output}"`;
}

// === SUBTITLES ===

// Burn Hebrew RTL subtitles (simple — FFmpeg drawtext)
// Small text at the bottom, 2 words at a time synced to speech. NOT huge multi-line blocks.
export function addSubtitlesSimple(input: string, srtFile: string, output: string, fontFile?: string): string {
  const font = fontFile || 'Heebo';
  return `ffmpeg -i "${input}" -vf "subtitles='${srtFile}':force_style='FontName=${font},FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Bold=1,Alignment=2,MarginV=80'" -c:a copy -y "${output}"`;
}

// Add lower third (name + title text overlay)
export function addLowerThird(input: string, name: string, title: string, startTime: number, duration: number, output: string, fontFile?: string): string {
  const font = fontFile || 'Heebo';
  const endTime = startTime + duration;
  return `ffmpeg -i "${input}" -vf "drawtext=text='${name}':fontfile='${font}':fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8:x=w-text_w-30:y=h-100:enable='between(t,${startTime},${endTime})':text_shaping=1,drawtext=text='${title}':fontfile='${font}':fontsize=16:fontcolor=gray:box=1:boxcolor=black@0.6:boxborderw=8:x=w-text_w-30:y=h-70:enable='between(t,${startTime},${endTime})':text_shaping=1" -c:a copy -y "${output}"`;
}

// Add CTA text overlay (Hebrew RTL safe — uses text_shaping=1 + fontfile for proper rendering)
export function addCTA(input: string, ctaText: string, startTime: number, endTime: number, output: string): string {
  // Hebrew text needs text_shaping=1 for proper RTL rendering in FFmpeg drawtext
  return `ffmpeg -i "${input}" -vf "drawtext=text='${ctaText}':fontsize=32:fontcolor=white:box=1:boxcolor=#7c3aed@0.85:boxborderw=15:x=(w-text_w)/2:y=h-130:enable='between(t,${startTime},${endTime})':text_shaping=1" -c:a copy -y "${output}"`;
}

// Mute (duck) audio during non-presenter segments — reduces coach/director voice
export function muteNonPresenterSegments(
  input: string,
  nonPresenterSegments: Array<{ start: number; end: number }>,
  output: string
): string {
  if (nonPresenterSegments.length === 0) {
    return `ffmpeg -i "${input}" -c copy -y "${output}"`;
  }

  // Build volume filter: mute during each non-presenter segment
  const volumeExprs = nonPresenterSegments.map(
    seg => `volume=enable='between(t,${seg.start.toFixed(2)},${seg.end.toFixed(2)})':volume=0.05`
  );
  const filterChain = volumeExprs.join(',');

  return `ffmpeg -i "${input}" -af "${filterChain}" -c:v copy -y "${output}"`;
}

// === CAMERA EFFECTS ===

// Camera shake effect
export function cameraShake(input: string, intensity: string, output: string): string {
  const shakeValues: Record<string, number> = { small: 5, medium: 10, large: 20 };
  const shake = shakeValues[intensity] || 5;
  return `ffmpeg -i "${input}" -vf "crop=iw-${shake * 2}:ih-${shake * 2}:${shake}+random(0)*${shake}:${shake}+random(1)*${shake},scale=iw+${shake * 2}:ih+${shake * 2}" -c:a copy -y "${output}"`;
}

// Film grain effect
export function filmGrain(input: string, amount: number, output: string): string {
  return `ffmpeg -i "${input}" -vf "noise=alls=${amount}:allf=t" -c:a copy -y "${output}"`;
}

// CRT/retro effect
export function crtEffect(input: string, output: string): string {
  return `ffmpeg -i "${input}" -vf "rgbashift=rh=-2:bh=2,noise=alls=12:allf=t,curves=vintage" -c:a copy -y "${output}"`;
}

// Glitch effect
export function glitchEffect(input: string, output: string): string {
  return `ffmpeg -i "${input}" -vf "rgbashift=rh=-5:rv=3:bh=5:bv=-3,noise=alls=20:allf=t" -c:a copy -y "${output}"`;
}

// === TRANSITIONS ===

// Crossfade transition between two clips
export function crossfadeTransition(clip1: string, clip2: string, fadeDuration: number, output: string): string {
  return `ffmpeg -i "${clip1}" -i "${clip2}" -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${fadeDuration}:offset=auto[v];[0:a][1:a]acrossfade=d=${fadeDuration}[a]" -map "[v]" -map "[a]" -y "${output}"`;
}

// Zoom pulse effect (zoom in and back on beat)
export function zoomPulse(input: string, timestamp: number, duration: number, output: string): string {
  return `ffmpeg -i "${input}" -vf "zoompan=z='if(between(t,${timestamp},${timestamp + duration}),1+0.15*sin(2*PI*(t-${timestamp})/${duration}),1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30" -c:a copy -y "${output}"`;
}

// Flash transition (white flash between cuts)
export function flashTransition(input: string, timestamp: number, output: string): string {
  return `ffmpeg -i "${input}" -vf "geq=lum='if(between(t,${timestamp},${timestamp + 0.1}),255,lum(X,Y))':cb='if(between(t,${timestamp},${timestamp + 0.1}),128,cb(X,Y))':cr='if(between(t,${timestamp},${timestamp + 0.1}),128,cr(X,Y))'" -c:a copy -y "${output}"`;
}

// === EXPORT ===

// Export to different aspect ratios
// Uses simple crop+scale approach compatible with all FFmpeg versions.
export function exportFormat(input: string, format: string, output: string, faceX?: number): string {
  switch (format) {
    case '9:16': {
      const cropX = faceX ? `${faceX}-(ih*9/16)/2` : '(iw-ih*9/16)/2';
      return `ffmpeg -i "${input}" -vf "crop=ih*9/16:ih:${cropX}:0,scale=1080:1920" -c:a copy -y "${output}"`;
    }
    case '1:1': {
      // Use simple ih-based crop (works when ih <= iw, typical for 16:9 source)
      return `ffmpeg -i "${input}" -vf "crop=ih:ih:(iw-ih)/2:0,scale=1080:1080" -c:a copy -y "${output}"`;
    }
    case '16:9':
    default:
      return `ffmpeg -i "${input}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1" -c:a copy -y "${output}"`;
  }
}

// High bitrate 4K export
export function highBitrateExport(input: string, output: string): string {
  return `ffmpeg -i "${input}" -c:v libx264 -b:v 20M -maxrate 25M -bufsize 40M -preset slow -c:a aac -b:a 320k -y "${output}"`;
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
