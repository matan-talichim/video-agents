import fs from 'fs';
import path from 'path';
import * as ffmpeg from '../services/ffmpeg.js';
import * as subtitles from '../services/subtitles.js';
import { askClaude } from '../services/claude.js';
import { updateJob } from '../store/jobStore.js';
import { detectBeats, getBeatsForMode, snapToNearestBeat } from '../services/beatDetect.js';
import { planKineticTypography, addKineticTextCommand } from '../services/kineticTypography.js';
import { buildRemotionProps } from '../services/remotionDataConverter.js';
import { renderVideo } from '../../src/remotion/render.js';
import { runSmartTrim } from './smartTrim.js';
import * as kie from '../services/kie.js';
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
  // STEP 0: CONTENT SELECTION (use scored segments)
  // ========================================================
  if (job.contentSelection?.suggestedOrder) {
    try {
      updateProgress(job, 'בונה timeline מהקטעים הנבחרים...');

      const orderedSegments = job.contentSelection.suggestedOrder
        .map(o => job.contentSelection!.segments[o.segmentIndex])
        .filter(s => s);

      // Build the video from ordered segments using FFmpeg
      const segmentFiles: string[] = [];
      for (let i = 0; i < orderedSegments.length; i++) {
        const seg = orderedSegments[i];
        const trimStart = seg.start + (seg.editNotes.trimStart || 0);
        const trimEnd = seg.end - (seg.editNotes.trimEnd || 0);
        const segPath = `${editDir}/selected_seg_${i}.mp4`;

        await ffmpeg.runFFmpeg(`ffmpeg -i "${currentVideo}" -ss ${trimStart} -to ${trimEnd} -c copy -y "${segPath}"`);
        segmentFiles.push(segPath);
      }

      // Concat selected segments
      const listPath = `${editDir}/selected_list.txt`;
      fs.writeFileSync(listPath, segmentFiles.map(s => `file '${s}'`).join('\n'));
      const selectedOutput = `${editDir}/selected_assembled.mp4`;
      await ffmpeg.runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${selectedOutput}"`);
      currentVideo = selectedOutput;

      // Cleanup
      for (const f of segmentFiles) { try { fs.unlinkSync(f); } catch {} }
      try { fs.unlinkSync(listPath); } catch {}

      console.log(`[Edit] Assembled ${orderedSegments.length} selected segments`);
    } catch (error: any) {
      console.error('Content selection assembly failed:', error.message);
      warnings.push('Content selection assembly failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 0.5: SMART TRIM (fallback — cut to best segments)
  // ========================================================
  if (!job.contentSelection?.suggestedOrder && job.contentAnalysis?.recommendedEdit?.segments) {
    try {
      updateProgress(job, 'חיתוך חכם — שומר רק את הקטעים הטובים...');

      const trimmedPath = `${editDir}/smart_trimmed.mp4`;
      await runSmartTrim(currentVideo, job.contentAnalysis, trimmedPath);
      currentVideo = trimmedPath;

      console.log(`[Edit] Smart trim: ${job.contentAnalysis.recommendedEdit.totalDuration}s from original`);
    } catch (error: any) {
      console.error('Smart trim failed:', error.message);
      warnings.push('Smart trim failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 0.5: USE CONTENT ANALYSIS FOR SMARTER EDITING
  // ========================================================
  const analysis = job.contentAnalysis;
  if (analysis) {
    // Apply footage issue solutions
    if (analysis.footageIssues) {
      for (const issue of analysis.footageIssues) {
        if (issue.solution.includes('background-blur')) plan.edit.backgroundBlur = true;
        if (issue.solution.includes('fast-pacing')) plan.edit.pacing = 'fast';
        if (issue.solution.includes('energetic-music')) {
          plan.edit.music = true;
          plan.generate.musicMood = 'energetic';
        }
        if (issue.solution.includes('frequent-broll')) plan.generate.broll = true;
        if (issue.solution.includes('noise-reduction')) plan.edit.noiseReduction = true;
        if (issue.solution.includes('speech-enhancement')) plan.edit.enhanceSpeech = true;
      }
    }

    // Add B-Roll cover moments to the B-Roll generation list (with word-level precision)
    if (analysis.brollCoverMoments && analysis.brollCoverMoments.length > 0) {
      for (const cover of analysis.brollCoverMoments) {
        // Use word-level precision: start 0.3s before trigger word if available
        const insertionPoint = cover.triggerWordTimestamp
          ? cover.triggerWordTimestamp - 0.3
          : cover.start;

        if (cover.triggerWord) {
          console.log(`[Edit] B-Roll at ${insertionPoint.toFixed(1)}s — trigger word: "${cover.triggerWord}" at ${cover.triggerWordTimestamp?.toFixed(1)}s`);
        }

        generateResult.brollClips.push({
          timestamp: insertionPoint,
          duration: cover.end - cover.start,
          prompt: cover.suggestedPrompt,
          path: '', // will be generated by generate agent
        });
      }
    }

    // Store emotional arc on job for music mood changes
    if (analysis.emotionalArc) {
      job.emotionalArc = analysis.emotionalArc;
    }

    // Store detailed emotional arc (rollercoaster) on job
    if (analysis.detailedEmotionalArc && analysis.detailedEmotionalArc.length > 0) {
      job.detailedEmotionalArc = analysis.detailedEmotionalArc;
    }

    // Store protected silences on job for clean agent
    if (analysis.protectedSilences && analysis.protectedSilences.length > 0) {
      job.protectedSilences = analysis.protectedSilences;
    }

    // Store cut transitions on job for assembly
    if (analysis.cutTransitions) {
      job.cutTransitions = analysis.cutTransitions;
    }

    // Store music sync and sound design plans on job
    if (analysis.musicSync) {
      (job as any).musicSyncPlan = analysis.musicSync;
    }
    if (analysis.soundDesign) {
      (job as any).soundDesignPlan = analysis.soundDesign;
    }
    if (analysis.zooms) {
      (job as any).blueprintZooms = analysis.zooms;
    }
    if (analysis.colorPlan) {
      (job as any).colorPlan = analysis.colorPlan;
    }
    if (analysis.platformOptimization) {
      (job as any).platformOptimization = analysis.platformOptimization;
    }
  }

  // === APPLY EDITING BLUEPRINT ===
  const blueprint = analysis?.editingBlueprint || job.editingBlueprint;
  if (blueprint) {
    console.log(`[Edit] Applying editing blueprint: ${blueprint.cuts?.length || 0} cuts, ${blueprint.zooms?.length || 0} zooms, ${blueprint.soundDesign?.sfx?.length || 0} SFX`);
    console.log(`[Edit] Murch average score: ${blueprint.murchAverageScore || 'N/A'}`);

    // Store blueprint on job for downstream steps
    job.editingBlueprint = blueprint;

    // Apply emotional arc from blueprint to adjust editing parameters per section
    const arcSource = blueprint.emotionalArc || job.detailedEmotionalArc;
    if (arcSource && arcSource.length > 0) {
      console.log(`[Edit] Applying emotional arc: ${arcSource.length} phases`);

      for (const phase of arcSource) {
        // Adjust music volume for this section
        if ((job as any).musicSyncPlan) {
          const musicLevel = phase.energy <= 3 ? -24 : phase.energy <= 5 ? -20 : phase.energy <= 7 ? -18 : phase.energy <= 9 ? -15 : -12;
          (job as any).musicSyncPlan.ducking = (job as any).musicSyncPlan.ducking || [];
          (job as any).musicSyncPlan.ducking.push({
            start: phase.start,
            end: phase.end,
            volume: musicLevel,
            reason: `emotional arc: ${phase.phase} (energy ${phase.energy})`,
          });
        }

        // Log the planned edit style for each phase (used by Remotion renderer)
        console.log(`[Edit] Phase "${phase.phase}" (${phase.start}-${phase.end}s): energy ${phase.energy} → ${phase.editStyle}`);
      }

      // Store arc on job for Remotion and Preview display
      job.detailedEmotionalArc = arcSource;
    }
  }

  // ========================================================
  // STEP 0.7: SPEED RAMPING (alters timeline — must run early)
  // ========================================================
  if (blueprint?.speedRamps && blueprint.speedRamps.length > 0) {
    try {
      updateProgress(job, 'מוסיף speed ramping...');

      const ramps = [...blueprint.speedRamps].sort((a: any, b: any) => a.start - b.start);
      const totalDuration = await ffmpeg.getVideoDuration(currentVideo);

      // Build segments: normal speed sections + ramped sections
      const segments: Array<{ start: number; end: number; speed: number }> = [];
      let lastEnd = 0;

      for (const ramp of ramps) {
        if (ramp.start > lastEnd) {
          segments.push({ start: lastEnd, end: ramp.start, speed: 1.0 });
        }
        segments.push({ start: ramp.start, end: ramp.end, speed: ramp.speed });
        lastEnd = ramp.end;
      }
      if (lastEnd < totalDuration) {
        segments.push({ start: lastEnd, end: totalDuration, speed: 1.0 });
      }

      // Process each segment
      const segmentFiles: string[] = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segPath = `${editDir}/speed_seg_${i}.mp4`;

        if (seg.speed === 1.0) {
          await ffmpeg.runFFmpeg(`ffmpeg -i "${currentVideo}" -ss ${seg.start} -to ${seg.end} -c copy -y "${segPath}"`);
        } else {
          const pts = (1 / seg.speed).toFixed(4);
          let atempoFilter: string;
          if (seg.speed >= 0.5 && seg.speed <= 2.0) {
            atempoFilter = `atempo=${seg.speed}`;
          } else if (seg.speed > 2.0) {
            atempoFilter = `atempo=2.0,atempo=${(seg.speed / 2.0).toFixed(4)}`;
          } else {
            atempoFilter = `atempo=${(seg.speed * 2).toFixed(4)},atempo=0.5`;
          }
          await ffmpeg.runFFmpeg(`ffmpeg -i "${currentVideo}" -ss ${seg.start} -to ${seg.end} -filter_complex "[0:v]setpts=${pts}*PTS[v];[0:a]${atempoFilter}[a]" -map "[v]" -map "[a]" -y "${segPath}"`);
        }
        segmentFiles.push(segPath);
      }

      // Concat all segments
      const listPath = `${editDir}/speed_list.txt`;
      fs.writeFileSync(listPath, segmentFiles.map(f => `file '${path.resolve(f)}'`).join('\n'));
      const speedOutput = `${editDir}/speed_ramped.mp4`;
      await ffmpeg.runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${speedOutput}"`);
      currentVideo = speedOutput;

      // Cleanup
      for (const f of segmentFiles) { try { fs.unlinkSync(f); } catch {} }
      try { fs.unlinkSync(listPath); } catch {}

      console.log(`[Edit] Applied ${ramps.length} speed ramps`);
    } catch (error: any) {
      console.error('Speed ramping failed:', error.message);
      warnings.push('Speed ramping failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 0.8: PATTERN INTERRUPTS (plan into existing systems)
  // ========================================================
  if (blueprint?.patternInterrupts && blueprint.patternInterrupts.length > 0) {
    try {
      console.log(`[Edit] Planning ${blueprint.patternInterrupts.length} pattern interrupts`);

      for (const interrupt of blueprint.patternInterrupts) {
        switch (interrupt.type) {
          case 'zoom-punch':
            (job as any).zoomPlan = (job as any).zoomPlan || [];
            (job as any).zoomPlan.push(
              { timestamp: interrupt.at, zoomFrom: 1.0, zoomTo: interrupt.zoomLevel || 1.2, duration: 0.15, reason: `pattern interrupt: ${interrupt.reason}` },
              { timestamp: interrupt.at + 0.25, zoomFrom: interrupt.zoomLevel || 1.2, zoomTo: 1.0, duration: 0.25, reason: 'zoom punch return' }
            );
            (job as any).sfxPlacements = (job as any).sfxPlacements || [];
            (job as any).sfxPlacements.push({ type: 'whoosh', at: interrupt.at, volume: -15, reason: 'zoom punch SFX' });
            break;

          case 'text-pop':
            (job as any).kineticTextPlan = (job as any).kineticTextPlan || [];
            (job as any).kineticTextPlan.push({
              text: interrupt.text || '',
              startTime: interrupt.at,
              endTime: interrupt.at + (interrupt.duration || 0.8),
              animation: 'pop-scale',
              fontSize: 'large',
              color: '#FFFFFF',
              type: 'pattern-interrupt',
            });
            break;

          case 'sfx-hit':
            (job as any).sfxPlacements = (job as any).sfxPlacements || [];
            (job as any).sfxPlacements.push({ type: interrupt.sfxType || 'impact', at: interrupt.at, volume: -12, reason: `pattern interrupt: ${interrupt.reason}` });
            break;

          case 'shake':
            (job as any).shakeEffects = (job as any).shakeEffects || [];
            (job as any).shakeEffects.push({ at: interrupt.at, duration: interrupt.duration || 0.5, intensity: interrupt.intensity === 'strong' ? 5 : 2 });
            break;

          case 'color-flash':
            (job as any).sfxPlacements = (job as any).sfxPlacements || [];
            (job as any).sfxPlacements.push({ type: 'impact', at: interrupt.at, volume: -15, reason: `color flash: ${interrupt.reason}` });
            break;

          case 'speed-change':
            // Handled by speed ramp system if blueprint includes it
            break;

          case 'music-change':
            // Handled by music ducking system
            break;

          default:
            console.log(`[Edit] Pattern interrupt type '${interrupt.type}' queued for Remotion render`);
            break;
        }
      }
    } catch (error: any) {
      console.error('Pattern interrupts failed:', error.message);
      warnings.push('Pattern interrupts failed: ' + error.message);
    }
  }

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
  // STEP 4.5: VISUAL DNA — STYLE TRANSFER FOR B-ROLL CONSISTENCY
  // ========================================================
  if (job.brandKit || job.videoIntelligence?.concept?.category) {
    try {
      const category = job.videoIntelligence?.concept?.category || 'general';
      const visualDNAMap: Record<string, { palette: string; lut: string; contrast: string }> = {
        'talking-head': { palette: 'warm-natural', lut: 'cinematic', contrast: 'medium' },
        'interview': { palette: 'warm-natural', lut: 'cinematic', contrast: 'medium' },
        'product-demo': { palette: 'clean-bright', lut: 'bright', contrast: 'medium' },
        'tour': { palette: 'warm-luxury', lut: 'cinematic', contrast: 'medium-high' },
        'testimonial': { palette: 'warm-natural', lut: 'none', contrast: 'low-medium' },
        'presentation': { palette: 'cool-professional', lut: 'corporate', contrast: 'medium' },
        'event': { palette: 'high-energy', lut: 'contrast', contrast: 'high' },
        'broll-only': { palette: 'cinematic', lut: 'cinematic', contrast: 'medium-high' },
        'screen-recording': { palette: 'clean-bright', lut: 'bright', contrast: 'low' },
        'mixed': { palette: 'warm-natural', lut: 'cinematic', contrast: 'medium' },
      };

      job.visualDNA = visualDNAMap[category] || { palette: 'warm-natural', lut: 'cinematic', contrast: 'medium' };
      updateJob(job.id, { visualDNA: job.visualDNA } as any);

      if (job.visualDNA.lut && job.visualDNA.lut !== 'none') {
        console.log(`[Edit] Visual DNA: ${job.visualDNA.palette} — applying ${job.visualDNA.lut} LUT to all B-Roll`);
      }
    } catch (error: any) {
      console.error('Visual DNA failed:', error.message);
      warnings.push('Visual DNA determination failed: ' + error.message);
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
  // STEP 5.5: AI TRANSITIONS BETWEEN B-ROLL CLIPS
  // ========================================================
  const aiTransitions = job.editingBlueprint?.aiTransitions || job.aiTransitions;
  if (aiTransitions && aiTransitions.length > 0) {
    try {
      updateProgress(job, 'יצירת מעברים AI...');
      const transitionDir = `temp/${job.id}/transitions`;
      fs.mkdirSync(transitionDir, { recursive: true });

      for (let i = 0; i < Math.min(aiTransitions.length, 3); i++) {
        const transition = aiTransitions[i];
        try {
          updateProgress(job, `מעבר AI ${i + 1}/${Math.min(aiTransitions.length, 3)}...`);

          // Extract last frame of clip A and first frame of clip B
          const lastFramePath = `${transitionDir}/from_${i}.jpg`;
          const firstFramePath = `${transitionDir}/to_${i}.jpg`;

          await ffmpeg.extractFrame(currentVideo, transition.fromClipEnd, lastFramePath);
          await ffmpeg.extractFrame(currentVideo, transition.toClipStart, firstFramePath);

          if (fs.existsSync(lastFramePath) && fs.existsSync(firstFramePath)) {
            const transitionPath = `${transitionDir}/transition_${i}.mp4`;
            await kie.firstLastFrame(lastFramePath, firstFramePath, transitionPath);

            if (fs.existsSync(transitionPath)) {
              // Insert the AI transition clip at the cut point
              const output = nextOutput();
              await ffmpeg.runFFmpeg(ffmpeg.replaceBRollSegment(
                currentVideo, transitionPath,
                transition.fromClipEnd,
                transition.fromClipEnd + transition.duration,
                output
              ));
              currentVideo = output;
              console.log(`[Edit] AI transition ${i}: ${transition.type} at ${transition.fromClipEnd}s`);
            }
          }
        } catch (transError: any) {
          console.error(`AI transition ${i} failed:`, transError.message);
          warnings.push(`AI transition ${i} failed: ${transError.message}`);
        }
      }
    } catch (error: any) {
      console.error('AI transitions failed:', error.message);
      warnings.push('AI transitions failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 5.7: APPLY VISUAL DNA LUT TO B-ROLL CLIPS
  // ========================================================
  if (job.visualDNA?.lut && job.visualDNA.lut !== 'none' && validBroll.length > 0) {
    try {
      const lutPath = `server/assets/luts/${job.visualDNA.lut}.cube`;
      if (fs.existsSync(lutPath)) {
        updateProgress(job, 'מתאים סגנון חזותי ל-B-Roll...');
        // Apply the brand-consistent LUT to ensure all B-Roll matches
        const output = nextOutput();
        await ffmpeg.runFFmpeg(`ffmpeg -i "${currentVideo}" -vf "lut3d='${lutPath}'" -c:a copy -y "${output}"`);
        currentVideo = output;
        console.log(`[Edit] Visual DNA: Applied ${job.visualDNA.lut} LUT for B-Roll consistency`);
      }
    } catch (error: any) {
      console.error('Visual DNA LUT failed:', error.message);
      warnings.push('Visual DNA LUT application failed: ' + error.message);
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
  // STEP 6.5: BLUEPRINT COLOR PLAN (per-segment color grading)
  // ========================================================
  const colorPlan = (job as any).colorPlan;
  if (colorPlan && colorPlan.length > 0 && !plan.edit.colorGrading) {
    try {
      updateProgress(job, 'מתאים צבעים...');

      for (const colorSegment of colorPlan) {
        if (colorSegment.lut && colorSegment.lut !== 'none') {
          const lutPath = `server/assets/luts/${colorSegment.lut}.cube`;
          if (fs.existsSync(lutPath)) {
            const output = nextOutput();
            await ffmpeg.runFFmpeg(`ffmpeg -i "${currentVideo}" -vf "lut3d='${lutPath}'" -c:a copy -y "${output}"`);
            currentVideo = output;
            break; // apply first matching LUT (full per-segment grading requires trim+concat)
          }
        }
      }
    } catch (error: any) {
      console.error('Blueprint color plan failed:', error.message);
      warnings.push('Blueprint color plan failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 6.7: AI BACKGROUND PLAN (blur bad backgrounds)
  // ========================================================
  const backgroundPlan = job.editingBlueprint?.backgroundPlan;
  if (backgroundPlan && backgroundPlan.recommendation === 'blur') {
    try {
      updateProgress(job, 'מטשטש רקע לא נקי...');
      const intensity = backgroundPlan.blurIntensity || 15;
      const output = nextOutput();
      // Center-focus blur: keep center sharp, blur edges (simulates depth of field)
      await ffmpeg.runFFmpeg(
        `ffmpeg -i "${currentVideo}" -vf "split[original][blur];[blur]boxblur=${intensity}[blurred];[original][blurred]overlay=(W-w)/2:(H-h)/2" -c:a copy -y "${output}"`
      );
      currentVideo = output;
      console.log(`[Edit] Background blur applied (intensity: ${intensity}) — issue: ${backgroundPlan.issue}`);
    } catch (error: any) {
      console.error('Background blur failed:', error.message);
      warnings.push('Background blur failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 6.8: AI RELIGHTING (FFmpeg lighting fixes)
  // ========================================================
  const lightingPlan = job.editingBlueprint?.lightingPlan;
  if (lightingPlan?.autoFix) {
    try {
      updateProgress(job, 'מתקן תאורה...');
      const fix = lightingPlan.autoFix;
      const filters: string[] = [];

      if (fix.brightness) filters.push(`eq=brightness=${fix.brightness}`);
      if (fix.contrast && fix.contrast !== 1.0) filters.push(`eq=contrast=${fix.contrast}`);
      if (fix.colorTemp === 'warm-shift') filters.push(`colorbalance=rs=0.05:gs=0.02`);
      if (fix.colorTemp === 'cool-shift') filters.push(`colorbalance=bs=0.05`);

      if (filters.length > 0) {
        const output = nextOutput();
        await ffmpeg.runFFmpeg(
          `ffmpeg -i "${currentVideo}" -vf "${filters.join(',')}" -c:a copy -y "${output}"`
        );
        currentVideo = output;
        console.log(`[Edit] Lighting fixes applied: ${filters.join(', ')} — issues: ${lightingPlan.issues.join(', ')}`);
      }
    } catch (error: any) {
      console.error('Lighting fix failed:', error.message);
      warnings.push('Lighting fix failed: ' + error.message);
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
  // STEP 8.5: FAKE CUT ZOOMS (simulate camera angle changes on hard cuts)
  // ========================================================
  if (analysis?.cutTransitions) {
    try {
      const fakeZoomCuts = analysis.cutTransitions.filter(
        (cut: any) => cut.type === 'hard' && cut.fakeZoom
      );
      if (fakeZoomCuts.length > 0) {
        updateProgress(job, 'זום מדומה לחיתוכים — סימולציית מצלמה...');
        let cutIndex = 0;
        for (const cut of fakeZoomCuts) {
          try {
            const isOdd = cutIndex % 2 === 0;
            const output = nextOutput();
            await ffmpeg.runFFmpeg(ffmpeg.addZoom(
              currentVideo,
              cut.at,
              cut.at + 0.3,
              isOdd ? 1.15 : 1.0,
              output
            ));
            currentVideo = output;
          } catch (zoomErr: any) {
            console.error(`Fake zoom at ${cut.at}s failed:`, zoomErr.message);
          }
          cutIndex++;
        }
      }
    } catch (error: any) {
      console.error('Fake cut zooms failed:', error.message);
      warnings.push('Fake cut zooms failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 8.7: BLUEPRINT ZOOMS (from content analysis zoom plan)
  // ========================================================
  const blueprintZooms = (job as any).blueprintZooms;
  if (blueprintZooms && blueprintZooms.length > 0) {
    try {
      updateProgress(job, 'מוסיף זומים חכמים...');

      const sortedZooms = [...blueprintZooms].sort((a: any, b: any) => a.timestamp - b.timestamp);
      zoomPlan = sortedZooms.map((z: any) => ({
        start: z.timestamp,
        end: z.timestamp + z.duration,
        zoom_factor: z.zoomTo,
        reason: z.reason,
      }));

      for (const zoom of sortedZooms) {
        try {
          const output = nextOutput();
          await ffmpeg.runFFmpeg(ffmpeg.addZoom(
            currentVideo,
            zoom.timestamp,
            zoom.timestamp + zoom.duration,
            zoom.zoomTo,
            output
          ));
          currentVideo = output;
        } catch (zoomErr: any) {
          console.error(`Blueprint zoom at ${zoom.timestamp}s failed:`, zoomErr.message);
        }
      }
    } catch (error: any) {
      console.error('Blueprint zooms failed:', error.message);
      warnings.push('Blueprint zooms failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 9: SMART ZOOMS (snapped to beats if musicSync enabled)
  // ========================================================
  if (plan.edit.smartZooms && transcript && !blueprintZooms?.length) {
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
  // STEP 11: KINETIC TYPOGRAPHY — plan data for Remotion
  // ========================================================
  let kineticTextPlan: any[] | null = null;
  if (plan.edit.kineticTypography && transcript) {
    try {
      updateProgress(job, 'תכנון טקסט מונפש...');
      const elements = await planKineticTypography(transcript);
      kineticTextPlan = elements;
      saveJSON(`temp/${job.id}/kinetic_typography.json`, elements);
      updateJob(job.id, { kineticTextPlan: elements });
    } catch (error: any) {
      console.error('Kinetic typography planning failed:', error.message);
      warnings.push('Kinetic typography planning failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 11.5: MARKETING STRATEGY — apply CTA, triggers, social proof to plan
  // ========================================================
  if (job.videoIntelligence?.marketingStrategy) {
    try {
      const strategy = job.videoIntelligence.marketingStrategy;
      console.log(`[Edit] Applying marketing strategy: ${strategy.videoAdType}`);

      // Apply text overlays based on video ad type
      if (strategy.textOverlaysByType) {
        (job as any).kineticTextPlan = (job as any).kineticTextPlan || [];
        for (const overlay of strategy.textOverlaysByType) {
          (job as any).kineticTextPlan.push({
            text: overlay.text,
            startTime: overlay.timestamp,
            endTime: overlay.timestamp + 3,
            animation: overlay.type === 'price' ? 'scale-up' : 'slide-up',
            fontSize: overlay.type === 'price' ? 'large' : 'medium',
            type: `marketing-${overlay.type}`,
          });
        }
      }

      // Apply CTA plan
      if (strategy.ctaPlan?.primaryCTA) {
        plan.edit.cta = true;
        plan.edit.ctaText = strategy.ctaPlan.primaryCTA.text;
      }
    } catch (error: any) {
      console.error('Marketing strategy application failed:', error.message);
      warnings.push('Marketing strategy application failed: ' + error.message);
    }
  }

  // Apply conversion triggers (countdown timers, price anchoring, etc.)
  if (job.videoIntelligence?.conversionStrategy?.triggerImplementation) {
    try {
      const videoDuration = await ffmpeg.getVideoDuration(currentVideo);
      (job as any).kineticTextPlan = (job as any).kineticTextPlan || [];

      for (const trigger of job.videoIntelligence.conversionStrategy.triggerImplementation) {
        if (trigger.visual === 'countdown-timer') {
          (job as any).kineticTextPlan.push({
            text: trigger.text,
            startTime: videoDuration - 5,
            endTime: videoDuration,
            animation: 'shake',
            fontSize: 'large',
            color: '#EF4444',
            type: 'conversion-countdown',
          });
        } else if (trigger.visual === 'strikethrough-animation') {
          const ts = typeof trigger.timestamp === 'number' ? trigger.timestamp : videoDuration * 0.6;
          (job as any).kineticTextPlan.push({
            text: trigger.text,
            startTime: ts,
            endTime: ts + 3,
            animation: 'scale-up',
            fontSize: 'large',
            type: 'conversion-anchoring',
          });
        } else if (trigger.visual === 'counter-animation') {
          const ts = typeof trigger.timestamp === 'number' ? trigger.timestamp : videoDuration * 0.5;
          (job as any).kineticTextPlan.push({
            text: trigger.text,
            startTime: ts,
            endTime: ts + 3,
            animation: 'bounce',
            fontSize: 'large',
            type: 'conversion-social-proof',
          });
        }
      }

      console.log(`[Edit] Applied ${job.videoIntelligence.conversionStrategy.triggerImplementation.length} conversion triggers`);
    } catch (error: any) {
      console.error('Conversion trigger application failed:', error.message);
      warnings.push('Conversion trigger application failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 11.6: MARKETING PLAN — apply framework, copywriting, colors, sound strategy
  // ========================================================
  if (job.videoIntelligence?.marketingPlan) {
    try {
      const mp = job.videoIntelligence.marketingPlan;

      // Apply framework-based segment ordering
      if (mp.framework) {
        console.log(`[Edit] Applying ${mp.framework.selectedFramework} framework`);
        // Framework mapping informs Remotion/overlay timing — stored for reference
      }

      // Apply copywriting text overlays
      if (mp.copywriting?.textOverlays) {
        (job as any).kineticTextPlan = (job as any).kineticTextPlan || [];

        for (const overlay of mp.copywriting.textOverlays) {
          // Special handling for price anchoring
          if (overlay.type === 'price' && overlay.originalPrice) {
            (job as any).kineticTextPlan.push({
              text: overlay.originalPrice,
              startTime: overlay.timestamp,
              endTime: overlay.timestamp + 1.5,
              animation: 'strikethrough',
              fontSize: 'medium',
              color: '#EF4444',
              type: 'price-original',
            });
            (job as any).kineticTextPlan.push({
              text: overlay.salePrice || overlay.text,
              startTime: overlay.timestamp + 1.5,
              endTime: overlay.timestamp + overlay.duration,
              animation: 'scale-up',
              fontSize: 'large',
              color: '#22C55E',
              type: 'price-sale',
            });
          } else {
            (job as any).kineticTextPlan.push({
              text: overlay.text,
              startTime: overlay.timestamp,
              endTime: overlay.timestamp + overlay.duration,
              animation: overlay.animation || 'slide-up',
              fontSize: overlay.fontSize === 'xl' ? 'large' : overlay.fontSize === 'lg' ? 'medium' : 'small',
              color: overlay.color || '#FFFFFF',
              type: `copywriting-${overlay.type}`,
            });
          }
        }

        console.log(`[Edit] Applied ${mp.copywriting.textOverlays.length} copywriting overlays`);
      }

      // Apply color strategy to CTA and highlights
      if (mp.colorStrategy) {
        if (plan.edit.cta) {
          (plan.edit as any).ctaBackgroundColor = mp.colorStrategy.primaryCTAColor;
        }
        if ((plan.edit as any).subtitleHighlightKeywords) {
          (plan.edit as any).subtitleHighlightColor = mp.colorStrategy.textHighlightColor;
        }
      }

      // Apply sound strategy
      if (mp.soundStrategy) {
        plan.generate.musicMood = mp.soundStrategy.genre;
      }
    } catch (error: any) {
      console.error('Marketing plan application failed:', error.message);
      warnings.push('Marketing plan application failed: ' + error.message);
    }
  }

  // Apply social proof overlays
  if (job.videoIntelligence?.socialProofPlan && job.videoIntelligence.socialProofPlan.length > 0) {
    try {
      (job as any).kineticTextPlan = (job as any).kineticTextPlan || [];

      for (const proof of job.videoIntelligence.socialProofPlan) {
        (job as any).kineticTextPlan.push({
          text: proof.text,
          startTime: proof.timestamp,
          endTime: proof.timestamp + 3,
          animation: proof.type === 'numbers' ? 'bounce' : 'fade-in',
          fontSize: proof.type === 'numbers' ? 'large' : 'medium',
          type: `social-proof-${proof.type}`,
        });
      }

      console.log(`[Edit] Applied ${job.videoIntelligence.socialProofPlan.length} social proof overlays`);
    } catch (error: any) {
      console.error('Social proof application failed:', error.message);
      warnings.push('Social proof application failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 12-14: REMOTION RENDER (subtitles, lower thirds, CTA, kinetic typography, logo)
  // Replaces individual FFmpeg text overlay steps with a single Remotion render
  // ========================================================
  const useRemotion = plan.edit.subtitles || plan.edit.lowerThirds || plan.edit.cta ||
                      plan.edit.kineticTypography || plan.edit.logoWatermark;

  if (useRemotion) {
    try {
      updateProgress(job, 'רינדור Remotion (כתוביות מונפשות, אנימציות)...');

      const videoDuration = await ffmpeg.getVideoDuration(currentVideo);

      // Store kinetic text plan and zoom plan on job for Remotion data converter
      if (kineticTextPlan) {
        (job as any).kineticTextPlan = kineticTextPlan;
      }
      if (zoomPlan) {
        (job as any).zoomPlan = zoomPlan;
      }

      // Build Remotion props from pipeline data
      const remotionProps = buildRemotionProps(
        job,
        plan,
        currentVideo, // the FFmpeg-processed video (trimmed, colored, with audio)
        transcript || null,
        generateResult || null,
        videoDuration
      );

      // Determine composition (landscape vs vertical)
      const compositionId = plan.export.formats.includes('9:16')
        ? 'VerticalComposition'
        : 'MainComposition';

      const remotionOutput = nextOutput();
      await renderVideo(remotionProps, remotionOutput, compositionId);
      currentVideo = remotionOutput;

    } catch (error: any) {
      console.error('Remotion render failed, falling back to FFmpeg:', error.message);
      warnings.push('Remotion render failed — using FFmpeg fallback for text overlays');

      // FALLBACK: use existing FFmpeg text rendering
      if (plan.edit.kineticTypography && kineticTextPlan) {
        try {
          for (const element of kineticTextPlan) {
            const output = nextOutput();
            await ffmpeg.runFFmpeg(addKineticTextCommand(currentVideo, element, output));
            currentVideo = output;
          }
        } catch {
          warnings.push('FFmpeg kinetic typography fallback also failed');
        }
      }
      if (plan.edit.subtitles && transcript) {
        try {
          const srtPath = `${editDir}/subtitles.srt`;
          subtitles.generateSRT(transcript, srtPath);
          const output = nextOutput();
          await ffmpeg.runFFmpeg(ffmpeg.addSubtitlesSimple(currentVideo, srtPath, output));
          currentVideo = output;
        } catch {
          warnings.push('FFmpeg subtitles fallback also failed');
        }
      }
      if (plan.edit.lowerThirds && plan.edit.lowerThirdsName) {
        try {
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
        } catch {
          warnings.push('FFmpeg lower thirds fallback also failed');
        }
      }
      if (plan.edit.cta && plan.edit.ctaText) {
        try {
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
        } catch {
          warnings.push('FFmpeg CTA fallback also failed');
        }
      }
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
  // STEP 15.5: VOICE PROCESSING (from sound design blueprint)
  // ========================================================
  const soundDesignPlan = (job as any).soundDesignPlan;
  if (soundDesignPlan?.voiceProcessing) {
    try {
      const vp = soundDesignPlan.voiceProcessing;
      const filters: string[] = [];
      if (vp.highPass) filters.push(`highpass=f=${vp.highPass}`);
      if (vp.compression) filters.push(`acompressor=ratio=3:threshold=-20dB`);
      if (vp.normalize) filters.push(`loudnorm=I=${vp.normalize}`);

      if (filters.length > 0) {
        updateProgress(job, 'מעבד אודיו...');
        const output = nextOutput();
        await ffmpeg.runFFmpeg(`ffmpeg -i "${currentVideo}" -af "${filters.join(',')}" -c:v copy -y "${output}"`);
        currentVideo = output;
      }
    } catch (error: any) {
      console.error('Voice processing failed:', error.message);
      warnings.push('Voice processing failed: ' + error.message);
    }
  }

  // ========================================================
  // STEP 16: MUSIC + AUTO-DUCKING (enhanced with blueprint ducking)
  // ========================================================
  if (plan.edit.music && musicPath && fs.existsSync(musicPath)) {
    try {
      updateProgress(job, 'מוזיקה...');
      const output = nextOutput();
      const musicSyncPlan = (job as any).musicSyncPlan;

      if (musicSyncPlan?.ducking && musicSyncPlan.ducking.length > 0) {
        // Use blueprint-driven ducking with per-segment volume control
        const duckingFilter = musicSyncPlan.ducking
          .map((d: any) => `volume=enable='between(t,${d.start},${d.end})':volume=${Math.pow(10, d.volume / 20).toFixed(3)}`)
          .join(',');

        await ffmpeg.runFFmpeg(
          `ffmpeg -i "${currentVideo}" -i "${musicPath}" -filter_complex "[1:a]${duckingFilter}[music];[0:a][music]amix=inputs=2:duration=first" -map 0:v -c:v copy -y "${output}"`
        );
      } else if (plan.edit.autoDucking) {
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
  // STEP 17: LOGO WATERMARK (only if Remotion was not used — Remotion handles logo too)
  // ========================================================
  if (plan.edit.logoWatermark && plan.edit.logoFile && !useRemotion) {
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
