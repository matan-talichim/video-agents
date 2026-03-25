import fs from 'fs';
import * as ffmpeg from '../services/ffmpeg.js';
import * as subtitles from '../services/subtitles.js';
import { askClaude } from '../services/claude.js';
import { updateJob } from '../store/jobStore.js';
import { detectBeats, getBeatsForMode, snapToNearestBeat } from '../services/beatDetect.js';
import { planKineticTypography, addKineticTextCommand } from '../services/kineticTypography.js';
import type { Job, ExecutionPlan, GenerateResult, TranscriptResult, EditResult, Segment } from '../types.js';

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
  console.log(`[Edit] ${job.id}: ${step}`);
}

function saveJSON(filePath: string, data: any): void {
  fs.mkdirSync(filePath.substring(0, filePath.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

  // Resolve music path early — needed for beat-sync and music sync
  let musicPath = generateResult.musicPath;
  if (!musicPath && plan.edit.music) {
    const mood = plan.generate.musicMood || 'calm';
    const libraryPath = `server/assets/music/${mood}_01.mp3`;
    if (fs.existsSync(libraryPath)) {
      musicPath = libraryPath;
    }
  }

  // Store zoom plan for potential music sync snapping
  let zoomPlan: any[] | null = null;

  // ========================================================
  // STEP 1: BEAT-SYNCED CUTS (restructures timeline — must be first)
  // ========================================================
  if (plan.edit.beatSyncCuts && musicPath) {
    try {
      updateProgress(job, 'חיתוך לפי ביט...');

      // Detect beats in the music
      const beatResult = await detectBeats(musicPath);
      const mode = plan.edit.beatMode || 'combined';
      const beats = getBeatsForMode(beatResult, mode);

      if (beats.length >= 2) {
        // Claude decides which clips to use at each beat point
        const videoFiles = job.files.filter(f => f.type.startsWith('video/'));
        const cutPlanResponse = await askClaude(
          'You plan beat-synced video cuts. Return only valid JSON array.',
          `BPM: ${beatResult.bpm}
Beat timestamps: ${beats.slice(0, 30).join(', ')}${beats.length > 30 ? '...' : ''}
Available clips: ${videoFiles.map(f => f.name).join(', ') || 'main video'}
Pacing: ${plan.edit.pacing}

Plan which video segment to show between each beat. Return JSON:
[{ "beat_start": 0.5, "beat_end": 1.0, "clip_file": "video.mp4", "clip_start": 5.2, "reason": "energetic moment" }]

Rules:
- Each segment = one beat interval
- ${plan.edit.pacing === 'fast' ? 'Cut on EVERY beat' : plan.edit.pacing === 'calm' ? 'Cut on every 4th beat' : 'Cut on every 2nd beat'}
- Never repeat the same clip segment twice in a row
- Match high-energy moments to downbeats
- Limit to 20 cuts maximum`
        );

        const jsonStr = cutPlanResponse
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const cuts = JSON.parse(jsonStr);

        // Build the cut video using FFmpeg
        const segments: string[] = [];
        for (let i = 0; i < cuts.length; i++) {
          const cut = cuts[i];
          const segPath = `${editDir}/beat_seg_${i}.mp4`;
          const sourceFile = job.files.find(f => f.name === cut.clip_file)?.path || currentVideo;
          const segDuration = cut.beat_end - cut.beat_start;

          if (segDuration <= 0) continue;

          try {
            await ffmpeg.runFFmpeg(
              `ffmpeg -i "${sourceFile}" -ss ${cut.clip_start} -t ${segDuration} -c copy -y "${segPath}"`
            );
            if (fs.existsSync(segPath)) {
              segments.push(segPath);
            }
          } catch {
            // Skip failed segments
          }
        }

        // Concat all beat-synced segments
        if (segments.length > 0) {
          const listPath = `${editDir}/beat_concat.txt`;
          fs.writeFileSync(listPath, segments.map(s => `file '${s}'`).join('\n'));
          const output = nextOutput();
          await ffmpeg.runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${output}"`);
          currentVideo = output;

          // Cleanup temp segments
          for (const seg of segments) {
            try { fs.unlinkSync(seg); } catch {}
          }
          try { fs.unlinkSync(listPath); } catch {}
        }
      }
    } catch (error: any) {
      console.error('Beat-sync cuts failed:', error.message);
      warnings.push('Beat-sync cuts failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 2: AUTO ANGLE SWITCHING (multi-cam)
  // ========================================================
  if (plan.edit.autoAngleSwitching && job.files?.length >= 2) {
    try {
      updateProgress(job, 'החלפת זוויות מצלמה...');

      const switchPlanResponse = await askClaude(
        'You plan camera angle switches for multi-cam video editing. Return only valid JSON array.',
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

  // ========================================================
  // STEP 3: COLOR MATCH CAMERAS
  // ========================================================
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

  // ========================================================
  // STEP 4: PHOTO MOTION EFFECTS (enhanced — creates B-Roll from photos)
  // ========================================================
  if (plan.edit.photoMotion) {
    try {
      updateProgress(job, 'אפקטי תנועה על תמונות...');
      const imageFiles = job.files.filter(f =>
        f.type.startsWith('image/') && !f.name.includes('logo') && !f.name.includes('selfie')
      );
      const style = plan.edit.photoMotionStyle || 'ken-burns';

      for (const img of imageFiles) {
        const safeName = img.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const motionPath = `${editDir}/photo_motion_${safeName}.mp4`;
        await ffmpeg.runFFmpeg(ffmpeg.photoMotion(img.path, style, 5, motionPath));

        // Add to B-Roll clips for insertion
        generateResult.brollClips.push({
          path: motionPath,
          timestamp: -1, // Claude will decide placement
          duration: 5,
          prompt: `Photo motion: ${img.name}`,
        });
      }

      // Let Claude decide where to place photo motion clips
      if (transcript && generateResult.brollClips.some(c => c.timestamp === -1)) {
        try {
          let videoDuration = 60;
          try { videoDuration = await ffmpeg.getVideoDuration(currentVideo); } catch {}

          const placementPlan = await askClaude(
            'You place photo/image clips in video timelines. Return only valid JSON array.',
            `Transcript: ${transcript.fullText.slice(0, 500)}\n\nI have ${imageFiles.length} photo clips to place in the video (${videoDuration} seconds). Suggest timestamps for each. Return JSON: [{ "index": 0, "timestamp": 15.5 }]`
          );

          const jsonStr = placementPlan.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          const placements = JSON.parse(jsonStr);
          const unplacedClips = generateResult.brollClips.filter(c => c.timestamp === -1);
          for (const placement of placements) {
            if (unplacedClips[placement.index]) {
              unplacedClips[placement.index].timestamp = placement.timestamp;
            }
          }
        } catch {
          // Assign evenly spaced timestamps as fallback
          let videoDuration = 60;
          try { videoDuration = await ffmpeg.getVideoDuration(currentVideo); } catch {}
          const unplacedClips = generateResult.brollClips.filter(c => c.timestamp === -1);
          const spacing = videoDuration / (unplacedClips.length + 1);
          unplacedClips.forEach((clip, i) => { clip.timestamp = spacing * (i + 1); });
        }
      }
    } catch (error: any) {
      console.error('Photo motion failed:', error.message);
      warnings.push('Photo motion failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 5: INSERT B-ROLL (including photo motion clips)
  // ========================================================
  const validBroll = generateResult.brollClips.filter(c => c.timestamp >= 0);
  if (validBroll.length > 0) {
    try {
      updateProgress(job, 'הכנסת B-Roll...');
      // Sort B-Roll by timestamp (descending so we don't shift timestamps)
      const sortedBroll = [...validBroll].sort((a, b) => b.timestamp - a.timestamp);

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

  // ========================================================
  // STEP 6: COLOR GRADING (LUT)
  // ========================================================
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

  // ========================================================
  // STEP 7: SKIN TONE + LIGHTING
  // ========================================================
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

  // ========================================================
  // STEP 8: BACKGROUND BLUR / PRESENTER SEPARATION
  // ========================================================
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

  // ========================================================
  // STEP 9: SMART ZOOMS (snapped to beats if musicSync enabled)
  // ========================================================
  if (plan.edit.smartZooms && transcript) {
    try {
      updateProgress(job, 'זומים חכמים...');

      const zoomPlanResponse = await askClaude(
        'You plan smart zoom moments for video editing. Return only valid JSON array.',
        `Identify 3-5 moments in this transcript where a subtle zoom would add emphasis (important statements, numbers, emotional peaks).\n\nTranscript: ${transcript.fullText}\n\nZoom style: ${plan.edit.zoomStyle || 'subtle'}\nReturn JSON array: [{ "start": 5.2, "end": 6.5, "zoom_factor": 1.15, "reason": "key statement" }]`
      );

      const jsonStr = zoomPlanResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const zooms = JSON.parse(jsonStr);
      zoomPlan = zooms; // Save for potential music sync snapping

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

  // ========================================================
  // STEP 10: MUSIC SYNC (snap all elements to beat)
  // ========================================================
  if (plan.edit.musicSync && musicPath) {
    try {
      updateProgress(job, 'סנכרון מוזיקה מלא...');

      const beatResult = await detectBeats(musicPath);
      const beats = beatResult.beats;

      // Snap zoom timestamps to nearest beat
      if (zoomPlan && zoomPlan.length > 0) {
        for (const zoom of zoomPlan) {
          zoom.start = snapToNearestBeat(zoom.start, beats);
          zoom.end = snapToNearestBeat(zoom.end, beats);
        }
      }

      // Snap B-Roll insertion points to nearest beat
      if (generateResult.brollClips.length > 0) {
        for (const clip of generateResult.brollClips) {
          if (clip.timestamp >= 0) {
            clip.timestamp = snapToNearestBeat(clip.timestamp, beats);
          }
        }
      }

      // Store music sync data on job for future Remotion use (Phase 9)
      const musicSyncData = {
        bpm: beatResult.bpm,
        beats,
        snappedZooms: zoomPlan || [],
        snappedBroll: generateResult.brollClips.map(c => c.timestamp),
      };

      updateJob(job.id, { musicSyncData });
      saveJSON(`temp/${job.id}/music_sync.json`, musicSyncData);
    } catch (error: any) {
      console.error('Music sync failed:', error.message);
      warnings.push('Music sync failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 11: KINETIC TYPOGRAPHY (basic FFmpeg version)
  // ========================================================
  if (plan.edit.kineticTypography && transcript) {
    try {
      updateProgress(job, 'טקסט מונפש...');

      const elements = await planKineticTypography(transcript);

      // Save kinetic data for Remotion (Phase 9)
      saveJSON(`temp/${job.id}/kinetic_typography.json`, elements);

      // Apply basic FFmpeg text overlays
      for (const element of elements) {
        const output = nextOutput();
        await ffmpeg.runFFmpeg(addKineticTextCommand(currentVideo, element, output));
        currentVideo = output;
      }
    } catch (error: any) {
      console.error('Kinetic typography failed:', error.message);
      warnings.push('Kinetic typography failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 12: SUBTITLES
  // ========================================================
  if (plan.edit.subtitles && transcript) {
    try {
      updateProgress(job, 'כתוביות...');

      const srtPath = `${editDir}/subtitles.srt`;
      subtitles.generateSRT(transcript, srtPath);

      if (plan.edit.subtitleHighlightKeywords) {
        try {
          await subtitles.getKeywordsForHighlight(transcript);
        } catch {
          // Non-critical
        }
      }

      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.addSubtitlesSimple(currentVideo, srtPath, output));
      currentVideo = output;
    } catch (error: any) {
      console.error('Subtitles failed:', error.message);
      warnings.push('Subtitles failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 13: LOWER THIRDS
  // ========================================================
  if (plan.edit.lowerThirds && plan.edit.lowerThirdsName) {
    try {
      updateProgress(job, 'שם ותפקיד...');
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.addLowerThird(
        currentVideo,
        plan.edit.lowerThirdsName,
        plan.edit.lowerThirdsTitle || '',
        2,
        4,
        output
      ));
      currentVideo = output;
    } catch (error: any) {
      console.error('Lower thirds failed:', error.message);
      warnings.push('Lower thirds failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 14: CTA
  // ========================================================
  if (plan.edit.cta && plan.edit.ctaText) {
    try {
      updateProgress(job, 'CTA...');
      const duration = await ffmpeg.getVideoDuration(currentVideo);
      const output = nextOutput();
      await ffmpeg.runFFmpeg(ffmpeg.addCTA(
        currentVideo,
        plan.edit.ctaText,
        Math.max(0, duration - 5),
        duration,
        output
      ));
      currentVideo = output;
    } catch (error: any) {
      console.error('CTA failed:', error.message);
      warnings.push('CTA failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 15: SOUND EFFECTS OVERLAY
  // ========================================================
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

  // ========================================================
  // STEP 16: MUSIC + AUTO-DUCKING
  // ========================================================
  if (plan.edit.music && musicPath && fs.existsSync(musicPath)) {
    try {
      updateProgress(job, 'מוזיקה...');
      const output = nextOutput();

      if (plan.edit.autoDucking) {
        await ffmpeg.runFFmpeg(ffmpeg.mixMusicWithDucking(currentVideo, musicPath, output));
      } else {
        await ffmpeg.runFFmpeg(ffmpeg.mixMusicSimple(currentVideo, musicPath, 0.15, output));
      }
      currentVideo = output;
    } catch (error: any) {
      console.error('Music mixing failed:', error.message);
      warnings.push('Music mixing failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 17: LOGO WATERMARK
  // ========================================================
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

  // ========================================================
  // STEP 18: NOISE REDUCTION + SPEECH ENHANCEMENT
  // ========================================================
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

  // ========================================================
  // STEP 19: VFX EFFECTS (camera shake, grain, CRT, glitch)
  // ========================================================
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

  // ========================================================
  // FINAL: COPY TO OUTPUT
  // ========================================================
  const finalPath = `output/${job.id}/final.mp4`;
  fs.mkdirSync(`output/${job.id}`, { recursive: true });
  fs.copyFileSync(currentVideo, finalPath);

  // === EXPORT ADDITIONAL FORMATS ===
  if (plan.export.formats.length > 1 || !plan.export.formats.includes('16:9')) {
    for (const format of plan.export.formats) {
      if (format === '16:9') continue;
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
    try {
      finalDuration = await ffmpeg.getVideoDuration(cleanVideoPath);
    } catch {
      finalDuration = 60;
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

  const listPath = `${tempDir}/concat_list.txt`;
  fs.writeFileSync(listPath, segments.map(s => `file '${s}'`).join('\n'));
  await ffmpeg.runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${output}"`);

  for (const seg of segments) {
    try { fs.unlinkSync(seg); } catch {}
  }
  try { fs.unlinkSync(listPath); } catch {}
}

// Build a timeline from the edit result for UI display
export function buildEditTimeline(generateResult: GenerateResult, duration: number): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  const sortedBroll = [...generateResult.brollClips]
    .filter(c => c.timestamp >= 0)
    .sort((a, b) => a.timestamp - b.timestamp);

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

  if (cursor < duration) {
    segments.push({
      start: cursor,
      end: duration,
      type: 'original',
      label: 'קטע מקורי',
    });
  }

  for (const sfx of generateResult.sfxMoments) {
    segments.push({
      start: sfx.timestamp,
      end: sfx.timestamp + 1,
      type: 'sfx',
      label: `SFX: ${sfx.sfx_keyword}`,
    });
  }

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
