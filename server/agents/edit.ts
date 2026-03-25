import fs from 'fs';
import * as ffmpeg from '../services/ffmpeg.js';
import * as subtitles from '../services/subtitles.js';
import { askClaude } from '../services/claude.js';
import { updateJob } from '../store/jobStore.js';
import type { Job, ExecutionPlan, GenerateResult, TranscriptResult, EditResult, Segment } from '../types.js';

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
  console.log(`[Edit] ${job.id}: ${step}`);
}

export async function runEditAgent(
  job: Job,
  plan: ExecutionPlan,
  cleanVideoPath: string,
  generateResult: GenerateResult,
  transcript?: TranscriptResult | null
): Promise<EditResult> {
  let currentVideo = cleanVideoPath;
  const editDir = `temp/${job.id}/edit`;
  fs.mkdirSync(editDir, { recursive: true });
  let stepIndex = 0;
  const warnings: string[] = [];

  const nextOutput = () => `${editDir}/step_${++stepIndex}.mp4`;

  // === STEP 1: AUTO ANGLE SWITCHING (multi-cam) ===
  if (plan.edit.autoAngleSwitching && job.files?.length >= 2) {
    try {
      updateProgress(job, 'החלפת זוויות מצלמה...');

      const switchPlanResponse = await askClaude(
        'You plan camera angle switches for multi-cam video editing.',
        `Plan camera switches for a ${plan.edit.pacing} paced video.\nSwitch every ${plan.edit.angleSwitchInterval || 3} sentences.\nNever switch mid-sentence.\nReturn JSON array: [{ "start": 0, "end": 5.2, "camera": 1 }, { "start": 5.2, "end": 11.5, "camera": 2 }, ...]`
      );

      const switches = JSON.parse(switchPlanResponse);
      const output = nextOutput();
      await buildMultiCamVideo(job.id, job.files[0].path, job.files[1].path, switches, output);
      currentVideo = output;
    } catch (error: any) {
      console.error('Angle switching failed:', error.message);
      warnings.push('Auto angle switching failed: ' + error.message);
    }
  }

  // === STEP 2: COLOR MATCH CAMERAS ===
  if (plan.edit.colorMatchCameras && job.files?.length >= 2) {
    try {
      updateProgress(job, 'איחוד צבעים בין מצלמות...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.colorMatchCameras(job.files[0].path, currentVideo, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Color matching failed:', error.message);
      warnings.push('Color matching failed: ' + error.message);
    }
  }

  // === STEP 3: INSERT B-ROLL ===
  if (generateResult.brollClips.length > 0) {
    try {
      updateProgress(job, 'הכנסת B-Roll...');
      // Sort B-Roll by timestamp (descending so we don't shift timestamps)
      const sortedBroll = [...generateResult.brollClips].sort((a, b) => b.timestamp - a.timestamp);

      for (const clip of sortedBroll) {
        if (!fs.existsSync(clip.path)) {
          warnings.push(`B-Roll clip not found: ${clip.path}`);
          continue;
        }
        const output = nextOutput();
        await ffmpeg.runFFmpeg(ffmpeg.replaceBRollSegment(
          currentVideo, clip.path, clip.timestamp, clip.timestamp + clip.duration, output
        ));
        currentVideo = output;
      }
    } catch (error: any) {
      console.error('B-Roll insertion failed:', error.message);
      warnings.push('B-Roll insertion failed: ' + error.message);
    }
  }

  // === STEP 4: COLOR GRADING ===
  if (plan.edit.colorGrading) {
    try {
      updateProgress(job, 'עיבוד צבע...');
      const style = plan.edit.colorGradingStyle || 'cinematic';
      const lutFile = `server/assets/luts/${style}.cube`;

      if (fs.existsSync(lutFile)) {
        const output = nextOutput();
        await ffmpeg.runFFmpeg(ffmpeg.applyLUT(currentVideo, lutFile, output));
        currentVideo = output;
      } else {
        warnings.push(`LUT file not found: ${lutFile}`);
      }
    } catch (error: any) {
      console.error('Color grading failed:', error.message);
      warnings.push('Color grading failed: ' + error.message);
    }
  }

  // === STEP 5: SKIN TONE + LIGHTING ===
  if (plan.edit.skinToneCorrection) {
    try {
      updateProgress(job, 'תיקון צבע עור...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.skinToneCorrection(currentVideo, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Skin tone correction failed:', error.message);
      warnings.push('Skin tone correction failed: ' + error.message);
    }
  }

  if (plan.edit.lightingEnhancement) {
    try {
      updateProgress(job, 'שיפור תאורה...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.lightingEnhancement(currentVideo, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Lighting enhancement failed:', error.message);
      warnings.push('Lighting enhancement failed: ' + error.message);
    }
  }

  // === STEP 6: BACKGROUND BLUR ===
  if (plan.edit.backgroundBlur) {
    try {
      updateProgress(job, 'טשטוש רקע...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.backgroundBlur(currentVideo, 15, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Background blur failed:', error.message);
      warnings.push('Background blur failed: ' + error.message);
    }
  }

  // === STEP 7: SMART ZOOMS ===
  if (plan.edit.smartZooms && transcript) {
    try {
      updateProgress(job, 'זומים חכמים...');

      const zoomPlanResponse = await askClaude(
        'You plan smart zoom moments for video editing.',
        `Identify 3-5 moments in this transcript where a subtle zoom would add emphasis (important statements, numbers, emotional peaks).\n\nTranscript: ${transcript.fullText}\n\nZoom style: ${plan.edit.zoomStyle || 'subtle'}\nReturn JSON array: [{ "start": 5.2, "end": 6.5, "zoom_factor": 1.15, "reason": "key statement" }]`
      );

      const zooms = JSON.parse(zoomPlanResponse);
      for (const zoom of zooms) {
        const output = nextOutput();
        await ffmpeg.runFFmpeg(ffmpeg.addZoom(currentVideo, zoom.start, zoom.end, zoom.zoom_factor, output));
        currentVideo = output;
      }
    } catch (error: any) {
      console.error('Smart zooms failed:', error.message);
      warnings.push('Smart zooms failed: ' + error.message);
    }
  }

  // === STEP 8: PHOTO MOTION ===
  if (plan.edit.photoMotion) {
    try {
      updateProgress(job, 'אפקטי תנועה על תמונות...');
      const imageFiles = job.files.filter(f => f.type.startsWith('image/') && !f.name.includes('logo'));
      for (const img of imageFiles) {
        const output = `${editDir}/photo_motion_${img.name}.mp4`;
        await ffmpeg.runFFmpeg(ffmpeg.photoMotion(img.path, plan.edit.photoMotionStyle || 'ken-burns', 5, output));
        // These clips can be used as B-Roll
      }
    } catch (error: any) {
      console.error('Photo motion failed:', error.message);
      warnings.push('Photo motion failed: ' + error.message);
    }
  }

  // === STEP 9: SUBTITLES ===
  if (plan.edit.subtitles && transcript) {
    try {
      updateProgress(job, 'כתוביות...');

      // Generate SRT from transcript
      const srtPath = `${editDir}/subtitles.srt`;
      subtitles.generateSRT(transcript, srtPath);

      // Get keywords for highlighting (optional — for Remotion animated subtitles in Phase 6)
      if (plan.edit.subtitleHighlightKeywords) {
        try {
          await subtitles.getKeywordsForHighlight(transcript);
        } catch {
          // Non-critical, continue
        }
      }

      // Burn subtitles with FFmpeg (simple version — Remotion animated version comes in Phase 6)
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.addSubtitlesSimple(currentVideo, srtPath, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Subtitles failed:', error.message);
      warnings.push('Subtitles failed: ' + error.message);
    }
  }

  // === STEP 10: LOWER THIRDS ===
  if (plan.edit.lowerThirds && plan.edit.lowerThirdsName) {
    try {
      updateProgress(job, 'שם ותפקיד...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.addLowerThird(
        currentVideo,
        plan.edit.lowerThirdsName,
        plan.edit.lowerThirdsTitle || '',
        2, // appears at 2 seconds
        4, // holds for 4 seconds
        output
      ));
      currentVideo = output;
    } catch (error: any) {
      console.error('Lower thirds failed:', error.message);
      warnings.push('Lower thirds failed: ' + error.message);
    }
  }

  // === STEP 11: CTA ===
  if (plan.edit.cta && plan.edit.ctaText) {
    try {
      updateProgress(job, 'CTA...');
      const duration = await ffmpeg.getVideoDuration(currentVideo);
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.addCTA(
        currentVideo,
        plan.edit.ctaText,
        Math.max(0, duration - 5), // last 5 seconds
        duration,
        output
      ));
      currentVideo = output;
    } catch (error: any) {
      console.error('CTA failed:', error.message);
      warnings.push('CTA failed: ' + error.message);
    }
  }

  // === STEP 12: SOUND EFFECTS ===
  if (generateResult.sfxMoments.length > 0) {
    try {
      updateProgress(job, 'אפקטי סאונד...');
      const validSfx = generateResult.sfxMoments.filter(s => fs.existsSync(s.filePath));
      if (validSfx.length > 0) {
        const output = nextOutput();
        await ffmpeg.runFFmpeg(ffmpeg.overlaySFX(
          currentVideo,
          validSfx.map(s => ({ file: s.filePath, timestamp: s.timestamp, volume: s.volume })),
          output
        ));
        currentVideo = output;
      }
    } catch (error: any) {
      console.error('SFX overlay failed:', error.message);
      warnings.push('SFX overlay failed: ' + error.message);
    }
  }

  // === STEP 13: MUSIC + AUTO-DUCKING ===
  if (plan.edit.music) {
    try {
      updateProgress(job, 'מוזיקה...');

      // Choose music source
      let musicPath = generateResult.musicPath; // AI-generated music

      if (!musicPath) {
        // Use library music based on mood
        const mood = plan.generate.musicMood || 'calm';
        musicPath = `server/assets/music/${mood}_01.mp3`;
      }

      if (musicPath && fs.existsSync(musicPath)) {
        const output = nextOutput();

        if (plan.edit.autoDucking) {
          await ffmpeg.runFFmpeg(ffmpeg.mixMusicWithDucking(currentVideo, musicPath, output));
        } else {
          await ffmpeg.runFFmpeg(ffmpeg.mixMusicSimple(currentVideo, musicPath, 0.15, output));
        }
        currentVideo = output;
      } else {
        warnings.push('Music file not found: ' + (musicPath || 'none'));
      }
    } catch (error: any) {
      console.error('Music mixing failed:', error.message);
      warnings.push('Music mixing failed: ' + error.message);
    }
  }

  // === STEP 14: LOGO ===
  if (plan.edit.logoWatermark && plan.edit.logoFile) {
    try {
      updateProgress(job, 'לוגו...');
      if (fs.existsSync(plan.edit.logoFile)) {
        const output = nextOutput();
        await ffmpeg.runFFmpeg(ffmpeg.addLogo(currentVideo, plan.edit.logoFile, 'bottom-right', 0.7, output));
        currentVideo = output;
      } else {
        warnings.push('Logo file not found: ' + plan.edit.logoFile);
      }
    } catch (error: any) {
      console.error('Logo failed:', error.message);
      warnings.push('Logo failed: ' + error.message);
    }
  }

  // === STEP 15: NOISE REDUCTION + SPEECH ENHANCEMENT ===
  if (plan.edit.noiseReduction) {
    try {
      updateProgress(job, 'הפחתת רעש...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.noiseReduction(currentVideo, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Noise reduction failed:', error.message);
      warnings.push('Noise reduction failed: ' + error.message);
    }
  }

  if (plan.edit.enhanceSpeech) {
    try {
      updateProgress(job, 'שיפור דיבור...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.enhanceSpeech(currentVideo, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Speech enhancement failed:', error.message);
      warnings.push('Speech enhancement failed: ' + error.message);
    }
  }

  // === STEP 16: VFX AUTO (camera shakes, grain, etc.) ===
  if (plan.edit.vfxAuto && plan.edit.vfxTypes) {
    try {
      updateProgress(job, 'אפקטים ויזואליים...');
      for (const vfxType of plan.edit.vfxTypes) {
        const output = nextOutput();
        switch (vfxType) {
          case 'camera-shake':
            await ffmpeg.runFFmpeg(ffmpeg.cameraShake(currentVideo, 'small', output));
            break;
          case 'film-burn':
            await ffmpeg.runFFmpeg(ffmpeg.filmGrain(currentVideo, 15, output));
            break;
          case 'crt':
            await ffmpeg.runFFmpeg(ffmpeg.crtEffect(currentVideo, output));
            break;
          case 'glitch':
            await ffmpeg.runFFmpeg(ffmpeg.glitchEffect(currentVideo, output));
            break;
          default:
            continue;
        }
        currentVideo = output;
      }
    } catch (error: any) {
      console.error('VFX failed:', error.message);
      warnings.push('VFX failed: ' + error.message);
    }
  }

  // === FINAL: COPY TO OUTPUT ===
  const finalPath = `output/${job.id}/final.mp4`;
  fs.mkdirSync(`output/${job.id}`, { recursive: true });
  fs.copyFileSync(currentVideo, finalPath);

  // === EXPORT ADDITIONAL FORMATS ===
  if (plan.export.formats.length > 1 || !plan.export.formats.includes('16:9')) {
    for (const format of plan.export.formats) {
      if (format === '16:9') continue; // already done
      try {
        updateProgress(job, `ייצוא ${format}...`);
        const formatOutput = `output/${job.id}/final_${format.replace(':', 'x')}.mp4`;
        await ffmpeg.runFFmpeg(ffmpeg.exportFormat(finalPath, format, formatOutput));
      } catch (error: any) {
        console.error(`Export ${format} failed:`, error.message);
        warnings.push(`Export ${format} failed: ` + error.message);
      }
    }
  }

  // === HIGH BITRATE 4K EXPORT ===
  if (plan.export.highBitrate4K) {
    try {
      updateProgress(job, 'ייצוא 4K...');
      const hqOutput = `output/${job.id}/final_4k.mp4`;
      await ffmpeg.runFFmpeg(ffmpeg.highBitrateExport(finalPath, hqOutput));
    } catch (error: any) {
      console.error('4K export failed:', error.message);
      warnings.push('4K export failed: ' + error.message);
    }
  }

  // === COPY THUMBNAIL ===
  if (generateResult.thumbnailPath && fs.existsSync(generateResult.thumbnailPath)) {
    try {
      fs.copyFileSync(generateResult.thumbnailPath, `output/${job.id}/thumbnail.jpg`);
    } catch {
      // Non-critical
    }
  }

  let finalDuration = 0;
  try {
    finalDuration = await ffmpeg.getVideoDuration(finalPath);
  } catch {
    // If we can't get duration, estimate from source
    try {
      finalDuration = await ffmpeg.getVideoDuration(cleanVideoPath);
    } catch {
      finalDuration = 60; // fallback
    }
  }

  return {
    finalVideoPath: finalPath,
    duration: finalDuration,
    formats: plan.export.formats as string[],
    warnings,
  };
}

// Helper: build multi-cam video from switch plan
async function buildMultiCamVideo(jobId: string, cam1: string, cam2: string, switches: any[], output: string): Promise<void> {
  const segments: string[] = [];
  const tempDir = `temp/${jobId}/multicam`;
  fs.mkdirSync(tempDir, { recursive: true });

  for (let i = 0; i < switches.length; i++) {
    const sw = switches[i];
    const source = sw.camera === 1 ? cam1 : cam2;
    const segPath = `${tempDir}/seg_${i}.mp4`;

    await ffmpeg.runFFmpeg(
      `ffmpeg -i "${source}" -ss ${sw.start} -to ${sw.end} -c copy -y "${segPath}"`
    );
    segments.push(segPath);
  }

  // Concat all segments
  const listPath = `${tempDir}/concat_list.txt`;
  fs.writeFileSync(listPath, segments.map(s => `file '${s}'`).join('\n'));
  await ffmpeg.runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${output}"`);

  // Cleanup temp segments
  for (const seg of segments) {
    try { fs.unlinkSync(seg); } catch {}
  }
  try { fs.unlinkSync(listPath); } catch {}
}

// Build a timeline from the edit result for UI display
export function buildEditTimeline(generateResult: GenerateResult, duration: number): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  // Add B-Roll segments
  const sortedBroll = [...generateResult.brollClips].sort((a, b) => a.timestamp - b.timestamp);

  for (const clip of sortedBroll) {
    if (cursor < clip.timestamp) {
      segments.push({
        start: cursor,
        end: clip.timestamp,
        type: 'original',
        label: 'קטע מקורי',
      });
    }
    segments.push({
      start: clip.timestamp,
      end: clip.timestamp + clip.duration,
      type: 'broll',
      label: clip.isStock ? 'B-Roll סטוק' : 'B-Roll AI',
    });
    cursor = clip.timestamp + clip.duration;
  }

  // Fill remaining with original
  if (cursor < duration) {
    segments.push({
      start: cursor,
      end: duration,
      type: 'original',
      label: 'קטע מקורי',
    });
  }

  // Add SFX markers
  for (const sfx of generateResult.sfxMoments) {
    segments.push({
      start: sfx.timestamp,
      end: sfx.timestamp + 1,
      type: 'sfx',
      label: `SFX: ${sfx.sfx_keyword}`,
    });
  }

  // Add music track if present
  if (generateResult.musicPath) {
    segments.push({
      start: 0,
      end: duration,
      type: 'music',
      label: 'מוזיקת רקע',
    });
  }

  return segments;
}
