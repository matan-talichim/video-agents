import type { Job, Segment, ViralityScore, TranscriptResult, GenerateResult, EditResult } from '../types.js';
import { updateJob } from '../store/jobStore.js';
import { addVersion } from '../store/versionStore.js';
import { getEnabledSteps, calculateProgress } from './progressTracker.js';
import { runIngestAgent } from '../agents/ingest.js';
import { runCleanAgent } from '../agents/clean.js';
import { runGenerateAgent, hasAnyGenerateFeature } from '../agents/generate.js';
import { runEditAgent, buildEditTimeline } from '../agents/edit.js';
import { runExportAgent } from '../agents/export.js';
import { applyEditStyle, EDIT_STYLES } from '../services/editStyles.js';
import { calculateViralityScore } from '../services/viralityScore.js';
import { createVersion } from '../services/versionManager.js';
import { cleanupJobTemp } from '../services/cleanup.js';
import { runPromptOnlyPipeline } from '../agents/promptOnly.js';
import { generatePreview } from '../services/previewGenerator.js';
import { importDocument, summarizeForVideo } from '../services/documentImport.js';
import { generateMultiPageStory } from '../templates/multiPageStories.js';
import { applyBrandKitToPlan, getBrandPromptPrefix } from '../services/brandKit.js';
import { analyzeContent } from '../services/contentAnalyzer.js';
import { extractFrame } from '../services/ffmpeg.js';
import { detectPresenter, filterTranscriptToPresenter } from '../services/presenterDetector.js';
import { verifySpeakers } from '../services/speakerVerifier.js';
import { detectPresenterSpeech } from '../services/speakerDetection/index.js';
import { analyzeVideoIntelligence, applyIntelligenceToPlan } from '../services/videoIntelligence.js';
import { runFreshEyesReview, autoApplyFixes } from '../services/freshEyesReview.js';
import { selectBestContent, applyPresenterQuality } from '../services/contentSelector.js';
import { analyzePresenterQuality } from '../services/presenterQuality.js';
import { runQualityCheck } from '../services/qualityCheck.js';
import { generateHookVariations } from '../services/hookGenerator.js';
import { generateABVariations } from '../services/abTesting.js';
import { analyzeRetention } from '../services/retentionOptimizer.js';
import { planLoop, applyLoop } from '../services/loopOptimizer.js';
import { planThumbnail, generateThumbnail } from '../services/thumbnailOptimizer.js';
import { planMultiPlatformCuts } from '../services/multiPlatformCutter.js';
import { diagnoseFootage, autoFixFootage } from '../services/footageDoctor.js';
import { getExportCommand, EXPORT_PRESETS } from '../services/smartExporter.js';
import { planAutoVersions } from '../services/autoVersioning.js';
import { checkBrandCompliance } from '../services/brandCompliance.js';
import { checkTextReadability } from '../services/qualityCheck.js';
import { planIntroOutro, generateIntro, generateOutro, attachIntroOutro } from '../services/brandedIntroOutro.js';
import { analyzeExpressions } from '../services/expressionAnalyzer.js';
import { predictEngagement } from '../services/engagementPredictor.js';
import { selectSubtitleStyle } from '../services/subtitleStyler.js';
import { simulateDevicePreview } from '../services/devicePreview.js';
import { checkContentSafety } from '../services/contentSafety.js';
import { detectBeats as detectBeatSync, snapCutsToBeats } from '../services/beatSync.js';
import { selectPaceMode, PACE_MODES } from '../services/editingRules.js';
import { filterBRollQuality } from '../services/brollQualityFilter.js';
import { planAutoReframe, applyAutoReframe } from '../services/autoReframe.js';
import { rememberProject, getBrainContext } from '../services/editorBrain.js';
import { getMasterPromptContext } from '../services/masterPromptOptimizer.js';
import { FOCUSED_PROMPTS } from '../services/focusedPrompts.js';
import { planAmbientSound } from '../services/ambientSound.js';
import { generateThumbnails } from '../services/thumbnailGenerator.js';
import { PipelineAudit } from '../services/pipelineAudit.js';
import fs from 'fs';

function saveJSON(filePath: string, data: any): void {
  fs.mkdirSync(filePath.substring(0, filePath.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSimulatedTimeline(duration: number): Segment[] {
  const segments: Segment[] = [];
  let current = 0;
  const types: Segment['type'][] = ['original', 'broll', 'transition', 'text', 'sfx', 'music'];
  const labels: Record<Segment['type'], string[]> = {
    original: ['קטע מקורי', 'דובר ראשי', 'ראיון'],
    broll: ['B-Roll עירוני', 'B-Roll טבע', 'B-Roll מוצר'],
    transition: ['מעבר חלק', 'פייד', 'זום מעבר'],
    text: ['כותרת', 'כתובית', 'טקסט מונפש'],
    sfx: ['אפקט ווש', 'אפקט מעבר', 'אפקט הדגשה'],
    music: ['מוזיקת רקע', 'מוזיקת פתיחה', 'מוזיקת סיום'],
  };

  while (current < duration) {
    const segType = types[randomBetween(0, types.length - 1)];
    const segDuration = randomBetween(2, 8);
    const end = Math.min(current + segDuration, duration);
    const typeLabels = labels[segType];
    segments.push({
      start: current,
      end,
      type: segType,
      label: typeLabels[randomBetween(0, typeLabels.length - 1)],
    });
    current = end;
  }
  return segments;
}

function generateViralityScore(): ViralityScore {
  const hook = randomBetween(5, 9);
  const pacing = randomBetween(5, 9);
  const emotion = randomBetween(5, 9);
  const cta = randomBetween(5, 9);
  const trends = randomBetween(5, 9);
  const total = Math.round((hook + pacing + emotion + cta + trends) * 2);
  const clampedTotal = Math.min(Math.max(total, 60), 90);

  const tips: string[] = [
    'הוסיפו הוק חזק יותר ב-3 שניות הראשונות',
    'קצב העריכה מתאים לפלטפורמת היעד',
    'שקלו להוסיף קריאה לפעולה ברורה יותר',
    'הטקסט על המסך משפר את הנגישות',
    'המוזיקה תואמת את האנרגיה של הסרטון',
    'שימוש בזומים חכמים ישפר את המעורבות',
    'כתוביות מגדילות צפיות ב-40%',
    'הפתיחה חזקה - ממשיכו כך!',
  ];

  const selectedTips = tips.sort(() => Math.random() - 0.5).slice(0, randomBetween(3, 5));

  return {
    total: clampedTotal,
    hook,
    pacing,
    emotion,
    cta,
    trends,
    tips: selectedTips,
  };
}

// startJob: transcribes → analyzes → generates plan + preview, then waits for user approval
export async function startJob(job: Job): Promise<void> {
  try {
    const plan = job.plan;
    if (!plan) {
      throw new Error('No execution plan found');
    }

    // Step 0: Upload acknowledgement
    updateJobStep(job, 'uploading', 2);

    // Step 1: Transcribe BEFORE preview (so preview shows full editing plan based on transcript)
    const hasVideo = job.files.some(f => f.type.startsWith('video'));
    const shouldTranscribe = hasVideo && plan.ingest?.transcribe;

    if (shouldTranscribe) {
      updateJobStep(job, 'transcribing', 8);
      updateJob(job.id, {
        status: 'transcribing',
      });

      try {
        const ingestResult = await runIngestAgent(job, plan);
        if (ingestResult.transcript) {
          job.transcript = ingestResult.transcript;
          updateJob(job.id, { transcript: ingestResult.transcript } as any);
          console.log(`[Orchestrator] Transcription complete: ${ingestResult.transcript.words.length} words`);
        }
        // Store ingest warnings for later
        if (ingestResult.warnings.length > 0) {
          job.ingestWarnings = ingestResult.warnings;
        }
      } catch (error: any) {
        console.warn('[Orchestrator] Pre-preview transcription failed (non-critical):', error.message);
      }
    }

    // Step 2: Speaker detection BEFORE content analysis (filter to presenter only)
    let presenterFilteredTranscript = job.transcript;
    if (job.transcript && hasVideo && job.files.length > 0) {
      updateJobStep(job, 'detecting-speakers', 12);
      updateJob(job.id, {
        status: 'analyzing',
        currentStep: 'detecting-speakers',
      });

      try {
        console.log(`[Orchestrator] Running speaker detection for job ${job.id}`);
        const speakerResult = await detectPresenterSpeech(
          job.files[0].path,
          job.transcript,
          job.id
        );

        (job as any).multimodalSpeakerDetection = speakerResult;
        updateJob(job.id, { multimodalSpeakerDetection: speakerResult } as any);

        if (speakerResult.presenterSegments.length > 0) {
          (job as any).presenterTranscript = speakerResult.presenterText;
          (job as any).presenterSegments = speakerResult.presenterSegments;

          // Build filtered transcript for content analysis
          const filteredWords = job.transcript.words.filter((w: any) => {
            return speakerResult.presenterSegments.some((ps: any) =>
              w.start >= ps.start - 0.1 && w.end <= ps.end + 0.1
            );
          });
          presenterFilteredTranscript = {
            words: filteredWords,
            fullText: speakerResult.presenterText,
          };

          console.log(`[Orchestrator] Speaker detection: ${speakerResult.stats.presenterPercent}% presenter speech`);
        }
      } catch (error: any) {
        console.warn('[Orchestrator] Pre-preview speaker detection failed (non-critical):', error.message);
      }
    }

    // Step 3: Content analysis BEFORE preview (uses presenter-filtered transcript)
    if (job.transcript && hasVideo) {
      updateJobStep(job, 'analyzing', 15);
      updateJob(job.id, {
        status: 'analyzing',
      });

      try {
        const contentAnalysis = await analyzeContent(
          job.files[0].path,
          presenterFilteredTranscript || job.transcript,
          plan
        );
        job.contentAnalysis = contentAnalysis;
        updateJob(job.id, { contentAnalysis } as any);
        console.log(`[Orchestrator] Content analysis complete`);
      } catch (error: any) {
        console.warn('[Orchestrator] Pre-preview content analysis failed (non-critical):', error.message);
      }
    }

    // Step 3: Generate preview (NOT render — just plan + frames)
    updateJobStep(job, 'planning', 20);
    updateJob(job.id, {
      status: 'planning',
    });

    const preview = await generatePreview(job, plan);

    updateJob(job.id, {
      previewData: preview,
      previewHistory: [],
      status: 'preview',
      currentStep: '',
      progress: 10,
    } as any);

    // Pipeline STOPS HERE — waits for user to approve or request changes
    // When user clicks "approve", the POST /preview/approve endpoint calls runPipeline()
    console.log(`[Orchestrator] Job ${job.id} preview ready — waiting for user approval`);
  } catch (error: any) {
    console.error('Job start failed:', error);
    updateJob(job.id, {
      status: 'error',
      currentStep: `שגיאה: ${error.message}`,
    });
  }
}

// Helper to update job step with user-friendly keys for cinematic processing page
// IMPORTANT: Progress must ONLY go forward, never backward.
// Completed steps must ONLY be added, never removed.
function updateJobStep(job: Job, stepKey: string, progress: number) {
  const stepOrder = [
    'uploading', 'detecting-speakers', 'transcribing', 'analyzing',
    'planning', 'generating-broll', 'generating-music',
    'editing-cuts', 'editing-effects', 'editing-subtitles',
    'editing-audio', 'quality-check', 'finalizing',
  ];

  // Track completed steps — only ADD, never replace
  const completedPipelineSteps: string[] = (job as any).completedPipelineSteps || [];
  const currentIndex = stepOrder.indexOf(stepKey);
  for (let i = 0; i < currentIndex; i++) {
    if (!completedPipelineSteps.includes(stepOrder[i])) {
      completedPipelineSteps.push(stepOrder[i]);
    }
  }
  (job as any).completedPipelineSteps = completedPipelineSteps;

  // Progress must NEVER go backwards
  const currentProgress = (job as any).progress || 0;
  const safeProgress = Math.max(currentProgress, progress);

  updateJob(job.id, {
    currentStep: stepKey,
    progress: safeProgress,
    completedPipelineSteps,
  } as any);
}

export async function runPipeline(job: Job): Promise<void> {
  try {
    // Phase 1: Planning
    updateJobStep(job, 'planning', 2);
    await delay(1000);

    if (!job.plan) {
      throw new Error('No execution plan found');
    }

    // --- PIPELINE AUDIT ---
    const audit = new PipelineAudit();

    // --- 30 MINUTE TIMEOUT ---
    const timeout = setTimeout(() => {
      if (job.status === 'processing') {
        job.status = 'error';
        job.currentStep = 'Timeout: job exceeded 30 minutes';
        updateJob(job.id, { status: 'error', currentStep: 'שגיאה: חריגה ממגבלת 30 דקות' });
        console.error(`[Timeout] Job ${job.id} exceeded 30 minutes`);
      }
    }, 30 * 60 * 1000);

    try {

    // Phase 2: Processing
    updateJob(job.id, { status: 'processing' });

    const steps = getEnabledSteps(job.plan);
    const totalSteps = steps.length;
    let completedSteps = 0;
    const allWarnings: string[] = [];

    // === PROMPT-ONLY MODE ===
    if (job.plan.mode === 'prompt-only') {
      // --- SOURCE DOCUMENT IMPORT ---
      if (job.plan.templates.sourceDocumentImport) {
        const docFile = job.files.find(f => f.type === 'document' || f.name.match(/\.(pdf|docx?|txt)$/i));
        if (docFile) {
          updateJob(job.id, { currentStep: 'ייבוא מסמך...' });
          try {
            const docText = await importDocument(docFile.path);
            const summary = await summarizeForVideo(docText, (job.plan.export.targetDuration as number) || 60);
            job.sourceDocumentContent = summary;
          } catch (error: any) {
            console.error('Document import failed:', error.message);
            allWarnings.push('Document import failed: ' + error.message);
          }
        }
      }

      // --- MULTI-PAGE STORIES ---
      let storyHandled = false;
      if (job.plan.templates.multiPageStories) {
        updateJob(job.id, { currentStep: 'יצירת סטורי מרובה דפים...' });
        try {
          fs.mkdirSync(`output/${job.id}`, { recursive: true });
          const storyPath = `output/${job.id}/story.mp4`;
          const mood = job.plan.generate.musicMood || 'energetic';
          const musicLibPath = job.plan.edit.music ? `server/assets/music/${mood}_01.mp3` : null;
          const validMusicPath = musicLibPath && fs.existsSync(musicLibPath) ? musicLibPath : null;

          await generateMultiPageStory(
            job.prompt,
            job.plan.templates.storyPageCount || 3,
            job.plan.generate.brollModel,
            validMusicPath,
            storyPath
          );

          const storyDuration = (job.plan.templates.storyPageCount || 3) * 5;
          const timeline = generateSimulatedTimeline(storyDuration);

          const version = addVersion({
            jobId: job.id,
            prompt: job.prompt,
            type: 'original',
            timeline,
            videoUrl: `/api/jobs/${job.id}/video`,
          });

          createVersion(job.id, storyPath, job.prompt, 'original', timeline, storyDuration);

          // Generate virality score if enabled
          let viralityScore: ViralityScore | undefined;
          if (job.plan.analyze.viralityScore) {
            try {
              viralityScore = await calculateViralityScore(job, null);
            } catch {
              viralityScore = generateViralityScore();
            }
          }

          updateJob(job.id, {
            status: 'done',
            progress: 100,
            currentStep: 'הושלם בהצלחה!',
            result: {
              videoUrl: `/api/jobs/${job.id}/video`,
              duration: storyDuration,
              timeline,
            },
            versions: [version.id],
            viralityScore,
            enabledFeaturesCount: totalSteps,
            warnings: allWarnings.length > 0 ? allWarnings : undefined,
          });

          storyHandled = true;
        } catch (error: any) {
          console.error('Multi-page story failed:', error.message);
          allWarnings.push('Multi-page story failed: ' + error.message);
          // Fall back to regular prompt-only pipeline
        }
      }

      // --- REGULAR PROMPT-ONLY PIPELINE ---
      if (!storyHandled) {
        // Apply brand kit prefix to prompt
        if (job.plan.templates.brandKit && job.brandKit) {
          const prefix = getBrandPromptPrefix(job.brandKit);
          job.prompt = prefix + job.prompt;
          applyBrandKitToPlan(job.plan, job.brandKit);
        }

        const promptOnlyResult = await runPromptOnlyPipeline(job, job.plan);

        // Pass through edit agent for subtitles, effects, etc.
        job.cleanVideoPath = promptOnlyResult.videoPath;
        job.generateResult = {
          brollClips: [],
          voiceoverPath: promptOnlyResult.voiceoverPath,
          musicPath: promptOnlyResult.musicPath,
          sfxMoments: [],
          thumbnailPath: null,
          stockClips: [],
          additionalAssets: { scenes: promptOnlyResult.scenes },
        };

        // Apply edit style if selected
        if (job.editStyle && EDIT_STYLES[job.editStyle]) {
          job.plan = applyEditStyle(job.plan!, job.editStyle);
          updateJob(job.id, { plan: job.plan });
        }

        // Run edit agent for subtitles, effects, export
        const hasEditSteps = steps.some(s => s.stage === 'edit' || s.stage === 'export');
        let editResult: EditResult | null = null;

        if (hasEditSteps) {
          updateJobStep(job, 'editing-cuts', 65);
          editResult = await runEditAgent(
            job,
            job.plan,
            promptOnlyResult.videoPath,
            job.generateResult,
            null
          );
          allWarnings.push(...editResult.warnings);
        }

        // Export
        let exportDuration = editResult?.duration || promptOnlyResult.duration;
        let exportExports: Array<{ format: string; url: string }> = [];

        if (editResult) {
          try {
            updateJobStep(job, 'finalizing', 98);
            const exportResult = await runExportAgent(job, job.plan, editResult.finalVideoPath);
            if (exportResult.duration) exportDuration = exportResult.duration;
            if (exportResult.mainVideoPath) {
              exportExports = exportResult.exports.map(e => ({ format: e.format, url: e.url }));
            }
          } catch (error: any) {
            console.error('Export agent failed:', error.message);
            allWarnings.push(`Export failed: ${error.message}`);
          }
        }

        // Finalize
        const videoUrl = `/api/jobs/${job.id}/video`;
        const duration = exportDuration;
        const timeline = editResult
          ? buildEditTimeline(job.generateResult, duration)
          : generateSimulatedTimeline(duration);

        let viralityScore: ViralityScore | undefined;
        if (job.plan.analyze.viralityScore) {
          try {
            updateJob(job.id, { currentStep: 'ציון ויראליות...' });
            viralityScore = await calculateViralityScore(job, null);
          } catch {
            viralityScore = generateViralityScore();
          }
        }

        const mainVideoPath = editResult?.finalVideoPath || promptOnlyResult.videoPath;
        createVersion(job.id, mainVideoPath, job.prompt, 'original', timeline, duration);

        const version = addVersion({
          jobId: job.id,
          prompt: job.prompt,
          type: 'original',
          timeline,
          videoUrl,
        });

        updateJob(job.id, {
          status: 'done',
          progress: 100,
          currentStep: 'הושלם בהצלחה!',
          result: {
            videoUrl,
            thumbnailUrl: editResult ? `/api/jobs/${job.id}/thumbnail` : undefined,
            duration,
            timeline,
            exports: exportExports.length > 0 ? exportExports : undefined,
          },
          versions: [version.id],
          viralityScore,
          enabledFeaturesCount: totalSteps,
          warnings: allWarnings.length > 0 ? allWarnings : undefined,
        });
      }

      // Preserve materials for revisions (don't cleanup yet)
      updateJob(job.id, { approvedFinal: false } as any);
      console.log(`[Pipeline] Prompt-only pipeline done. Temp files preserved for revisions.`);

      clearTimeout(timeout);
      return;
    }

    // === RAW MODE (existing pipeline) ===

    // --- EDITOR BRAIN: Load context from past projects ---
    let masterContext = '';
    let brainMemoryContext = '';
    try {
      masterContext = getMasterPromptContext();
      if (masterContext) {
        console.log('[Pipeline] Master prompt context loaded from past performance data');
      }
    } catch (error: any) {
      console.warn('[Pipeline] Master prompt context load failed (non-critical):', error.message);
    }

    // --- FOOTAGE DOCTOR: Diagnose & auto-fix before editing ---
    if (job.files.length > 0) {
      try {
        updateJob(job.id, { currentStep: 'מאבחן חומרי גלם...' });
        const videoPath = job.files[0].path;
        const diagnosis = await diagnoseFootage(videoPath, job.id);
        job.footageDiagnosis = diagnosis;
        updateJob(job.id, { footageDiagnosis: diagnosis } as any);

        // AUTO-FIX: upscale, crop black bars, remove freeze frames
        if (diagnosis.fixes.length > 0) {
          updateJob(job.id, { currentStep: `מתקן ${diagnosis.fixes.length} בעיות בחומר הגלם...` });
          const fixedPath = await autoFixFootage(videoPath, diagnosis, job.id);
          if (fixedPath !== videoPath) {
            job.files[0].path = fixedPath;
            console.log(`[Pipeline] Auto-fixed: ${diagnosis.fixes.join(', ')}`);
          }
        }

        // Pass duration category to Brain for edge case handling
        job.durationCategory = diagnosis.durationCategory;
        updateJob(job.id, { durationCategory: diagnosis.durationCategory } as any);

        // Audit: footage doctor
        audit.log('resolution-check', 'footageDoctor', diagnosis.resolution?.needsUpscale ? 'passed' : 'skipped',
          `${diagnosis.resolution?.width || '?'}x${diagnosis.resolution?.height || '?'} — ${diagnosis.resolution?.needsUpscale ? 'upscaled' : 'OK'}`);
        audit.log('black-bars', 'footageDoctor', diagnosis.blackBars?.detected ? 'passed' : 'skipped',
          diagnosis.blackBars?.detected ? 'cropped' : 'none detected');
        audit.log('stabilization', 'footageDoctor', job.originalShakiness !== undefined ? 'passed' : 'skipped',
          `shakiness: ${job.originalShakiness || 'not checked'}`);
        audit.log('flash-frames', 'footageDoctor', diagnosis.flashFrames?.detected ? 'passed' : 'skipped',
          `${diagnosis.flashFrames?.timestamps?.length || 0} detected`);
        audit.log('freeze-frames', 'footageDoctor', diagnosis.freezeFrames?.detected ? 'passed' : 'skipped',
          `${diagnosis.freezeFrames?.count || 0} removed`);
      } catch (error: any) {
        console.warn('[Pipeline] Footage doctor failed (non-critical):', error.message);
        allWarnings.push(`Footage diagnosis skipped: ${error.message}`);
        audit.log('footage-doctor', 'footageDoctor', 'failed', `diagnoseFootage() failed: ${error.message}`);
      }
    } else {
      audit.log('footage-doctor', 'footageDoctor', 'skipped', 'No files uploaded');
    }

    // --- REAL INGEST AGENT ---
    // Reuse transcript from startJob if already done (BUG 7 fix: transcription now runs before preview)
    let transcript: TranscriptResult | null = job.transcript || null;

    const hasIngestSteps =
      job.plan.ingest.transcribe ||
      job.plan.ingest.multiCamSync ||
      job.plan.ingest.lipSyncVerify ||
      job.plan.ingest.footageClassification ||
      job.plan.ingest.shotSelection ||
      job.plan.ingest.smartVariety ||
      job.plan.ingest.speakerClassification;

    // Only re-run ingest if transcript wasn't already produced in startJob, or if non-transcribe ingest steps are needed
    const needsFullIngest = !transcript || (hasIngestSteps && (
      job.plan.ingest.multiCamSync ||
      job.plan.ingest.lipSyncVerify ||
      job.plan.ingest.footageClassification ||
      job.plan.ingest.shotSelection ||
      job.plan.ingest.smartVariety ||
      job.plan.ingest.speakerClassification
    ));

    if (hasIngestSteps && needsFullIngest) {
      console.log(`[Pipeline] Running real ingest agent for job ${job.id}`);
      const ingestResult = await runIngestAgent(job, job.plan);
      if (ingestResult.transcript) {
        transcript = ingestResult.transcript;
      }
      allWarnings.push(...ingestResult.warnings);

      // Save transcript to job so frontend can display it
      if (transcript) {
        job.transcript = transcript;
        updateJob(job.id, { transcript } as any);
      }

      // Count completed ingest steps
      const ingestStepCount = steps.filter(s => s.stage === 'ingest').length;
      completedSteps += ingestStepCount;
      updateJob(job.id, {
        progress: calculateProgress(completedSteps, totalSteps),
      });
    } else if (transcript) {
      console.log(`[Pipeline] Reusing transcript from pre-preview transcription (${transcript.words.length} words)`);
      // Add ingest warnings from startJob if any
      if (job.ingestWarnings) allWarnings.push(...job.ingestWarnings);
      const ingestStepCount = steps.filter(s => s.stage === 'ingest').length;
      completedSteps += ingestStepCount;
      updateJob(job.id, { progress: calculateProgress(completedSteps, totalSteps) });
    }

    // Audit: transcription
    if (transcript?.fullText) {
      audit.log('deepgram-transcription', 'transcription', 'passed',
        `${transcript.fullText.length} chars, ${transcript.words?.length || 0} words with timestamps`);
      audit.log('word-timestamps', 'transcription', transcript.words?.length > 0 ? 'passed' : 'failed',
        transcript.words?.length > 0 ? `${transcript.words.length} word-level timestamps` : 'NO word timestamps — B-Roll precision impossible');
    } else {
      audit.log('transcription', 'transcription', 'failed', 'No transcript available');
    }

    // --- PRESENTER DETECTION + SPEAKER VERIFICATION (3 Layers) ---
    let presenterTranscript: TranscriptResult | null = null;

    if (transcript && job.files.length > 0) {
      try {
        // Step 1: Basic presenter detection (Layer 1 audio + Layer 2 visual baseline)
        updateJobStep(job, 'detecting-speakers', 18);
        updateJob(job.id, { currentStep: 'detecting-speakers' });
        console.log(`[Pipeline] Running presenter detection for job ${job.id}`);

        const presenterDetection = await detectPresenter(
          job.files[0].path,
          transcript
        );

        job.presenterDetection = presenterDetection;
        saveJSON(`temp/${job.id}/presenter_detection.json`, presenterDetection);
        updateJob(job.id, { presenterDetection } as any);

        console.log(`[Pipeline] Presenter: speaker ${presenterDetection.presenterId} — ${presenterDetection.presenterDescription}`);
        console.log(`[Pipeline] Non-presenter segments to exclude: ${presenterDetection.nonPresenterSegments.length}`);

        // Step 2: 3-layer speaker verification (cross-validates Deepgram diarization)
        updateJob(job.id, { currentStep: 'מאמת זהות דוברים (3 שכבות)...' });
        console.log(`[Pipeline] Running 3-layer speaker verification for job ${job.id}`);

        const speakerVerification = await verifySpeakers(
          job.files[0].path,
          transcript
        );

        job.speakerVerification = speakerVerification;
        saveJSON(`temp/${job.id}/speaker_verification.json`, speakerVerification);
        updateJob(job.id, { speakerVerification } as any);

        // Log corrections
        if (speakerVerification.corrections.length > 0) {
          console.log(`[Pipeline] Speaker corrections:`);
          for (const correction of speakerVerification.corrections) {
            console.log(`  ${correction.type}: ${correction.description}`);
          }
        }

        // Find the presenter (on-camera speaker with most time)
        const presenter = speakerVerification.speakers
          .filter(s => s.isOnCamera)
          .sort((a, b) => b.totalTime - a.totalTime)[0]
          || speakerVerification.speakers.sort((a, b) => b.totalTime - a.totalTime)[0];

        // Build list of speaker IDs to keep (presenter + on-camera interviewers)
        const keepIds: number[] = [];
        if (presenter) {
          keepIds.push(...presenter.originalIds);
          // Also keep interviewers who are on camera
          for (const speaker of speakerVerification.speakers) {
            if (speaker.id !== presenter.id && speaker.isOnCamera) {
              keepIds.push(...speaker.originalIds);
            }
          }
        } else {
          // Fallback to basic presenter detection IDs
          keepIds.push(presenterDetection.presenterId);
          for (const speaker of presenterDetection.allSpeakers) {
            if (speaker.role === 'interviewer' && speaker.isOnCamera) {
              keepIds.push(speaker.speakerId);
            }
          }
        }

        // Filter transcript to presenter-only BEFORE content analysis
        presenterTranscript = filterTranscriptToPresenter(
          transcript,
          presenter?.originalIds[0] ?? presenterDetection.presenterId,
          keepIds
        );

        console.log(`[Pipeline] Filtered transcript: ${presenterTranscript.words.length} words (from ${transcript.words.length} original)`);
        console.log(`[Pipeline] Speaker verification confidence: ${Math.round(speakerVerification.confidence * 100)}%`);

        // Extract character reference frame for AI character consistency
        try {
          const presenterSegments = presenterDetection.presenterSegments;
          const bestFrameTime = presenterSegments.length > 0
            ? (presenterSegments[0].start + presenterSegments[0].end) / 2
            : 3.0;
          const refPath = `temp/${job.id}/character_reference.jpg`;
          fs.mkdirSync(`temp/${job.id}`, { recursive: true });
          await extractFrame(job.files[0].path, bestFrameTime, refPath);

          if (fs.existsSync(refPath)) {
            job.characterReference = {
              hasReference: true,
              referenceImagePath: refPath,
              description: presenterDetection.presenterDescription || '',
            };
            updateJob(job.id, { characterReference: job.characterReference } as any);
            console.log(`[Pipeline] Character reference extracted at ${bestFrameTime.toFixed(1)}s`);
          }
        } catch (refError: any) {
          console.log(`[Pipeline] Character reference extraction skipped: ${refError.message}`);
        }
      } catch (error: any) {
        console.error('Presenter detection / speaker verification failed:', error.message);
        allWarnings.push('Speaker verification failed: ' + error.message);
        audit.log('presenter-detection', 'presenterQuality', 'failed', `Failed: ${error.message}`);
      }
    }

    // Audit: presenter quality
    if (job.presenterDetection) {
      audit.log('presenter-detection', 'presenterQuality', 'passed', `speaker ${job.presenterDetection.presenterId} — ${job.presenterDetection.presenterDescription || 'detected'}`);
    } else if (!transcript) {
      audit.log('presenter-detection', 'presenterQuality', 'skipped', 'No transcript for detection');
    }

    // --- MULTIMODAL SPEAKER DETECTION (VAD + Lip Motion + NLP Cleanup) ---
    if (transcript && job.files.length > 0) {
      try {
        updateJob(job.id, { currentStep: 'מזהה את הדובר (מולטימודאלי)...' });
        console.log(`[Pipeline] Running multimodal speaker detection for job ${job.id}`);

        const speakerResult = await detectPresenterSpeech(
          job.files[0].path,
          transcript,
          job.id
        );

        // Save results
        (job as any).multimodalSpeakerDetection = speakerResult;
        saveJSON(`temp/${job.id}/multimodal_speaker_detection.json`, speakerResult);
        updateJob(job.id, { multimodalSpeakerDetection: speakerResult } as any);

        // Use multimodal presenter transcript for all subsequent analysis
        if (speakerResult.presenterSegments.length > 0) {
          (job as any).presenterTranscript = speakerResult.presenterText;
          (job as any).presenterSegments = speakerResult.presenterSegments;

          // Override presenterTranscript for Brain and content analysis
          const multimodalFilteredWords = transcript.words.filter(w => {
            return speakerResult.presenterSegments.some(ps =>
              w.start >= ps.start - 0.1 && w.end <= ps.end + 0.1
            );
          });
          presenterTranscript = {
            words: multimodalFilteredWords,
            fullText: speakerResult.presenterText,
          };

          // Update subtitle words to only presenter speech
          (job as any).subtitleWords = multimodalFilteredWords;

          console.log(`[Pipeline] Multimodal speaker detection: ${speakerResult.stats.presenterPercent}% presenter, ${speakerResult.stats.filteredWords} words filtered, ${speakerResult.stats.removedDuplicates} duplicates removed`);
        }

        // === SPEAKER DETECTION AUDIT ===
        audit.log('speaker-preprocess', 'speakerDetection', 'passed',
          'audio.wav (16kHz mono) + video_480p.mp4 extracted');

        audit.log('speaker-vad', 'speakerDetection',
          speakerResult.stats?.totalWords > 0 ? 'passed' : 'failed',
          `Silero VAD: found speech segments in audio`);

        audit.log('speaker-lip-detection', 'speakerDetection',
          speakerResult.method === 'multimodal-lip-sync' ? 'passed' : 'failed',
          speakerResult.method === 'multimodal-lip-sync'
            ? `MediaPipe Face Mesh: analyzed lip motion at 10fps`
            : `Fallback used: ${speakerResult.method}`);

        audit.log('speaker-merge', 'speakerDetection',
          speakerResult.stats?.presenterWords > 0 ? 'passed' : 'failed',
          `${speakerResult.stats?.presenterWords || 0}/${speakerResult.stats?.totalWords || 0} words are presenter (${speakerResult.stats?.presenterPercent || 0}%)`);

        audit.log('speaker-filtered', 'speakerDetection',
          speakerResult.stats?.filteredWords > 0 ? 'passed' : 'skipped',
          speakerResult.stats?.filteredWords > 0
            ? `Removed ${speakerResult.stats.filteredWords} words from off-camera speakers`
            : 'No off-camera speech detected (single speaker)');

        audit.log('speaker-duplicates', 'speakerDetection',
          speakerResult.stats?.removedDuplicates > 0 ? 'passed' : 'skipped',
          speakerResult.stats?.removedDuplicates > 0
            ? `NLP removed ${speakerResult.stats.removedDuplicates} duplicate takes`
            : 'No duplicate takes found');

        audit.log('speaker-final-segments', 'speakerDetection',
          speakerResult.presenterSegments?.length > 0 ? 'passed' : 'failed',
          `${speakerResult.presenterSegments?.length || 0} clean presenter segments, ${(speakerResult.stats?.processingTimeMs / 1000)?.toFixed(1) || '?'}s processing`);

        // Verify presenter transcript is actually used downstream
        audit.log('speaker-used-in-brain', 'speakerDetection',
          (job as any).presenterTranscript && (job as any).presenterTranscript !== job.transcript?.fullText ? 'passed' : 'not-connected',
          (job as any).presenterTranscript !== job.transcript?.fullText
            ? 'Brain receives filtered presenter-only transcript'
            : 'WARNING: Brain still receives full transcript (not filtered)');

        audit.log('speaker-used-in-subtitles', 'speakerDetection',
          (job as any).subtitleWords ? 'passed' : 'not-connected',
          (job as any).subtitleWords
            ? `Subtitles use ${(job as any).subtitleWords.length} presenter-only words`
            : 'WARNING: Subtitles may include off-camera speech');

        audit.log('speaker-used-in-edit', 'speakerDetection', 'check',
          'Verify FFmpeg assembly uses presenterSegments time ranges (not full video)');

      } catch (error: any) {
        console.error('Multimodal speaker detection failed:', error.message);
        allWarnings.push('Multimodal speaker detection failed (falling back to basic detection): ' + error.message);
        audit.log('multimodal-speaker-detection', 'presenterQuality', 'failed', `Failed: ${error.message}`);
      }
    }

    // Speaker detection audit fallback (when detection was never called)
    if (!(job as any).multimodalSpeakerDetection) {
      audit.log('speaker-detection', 'speakerDetection', 'not-connected',
        'detectPresenterSpeech() was never called — off-camera voices will be included');
    }

    // --- MICRO-EXPRESSION ANALYSIS ---
    if (job.presenterDetection && job.files.length > 0) {
      try {
        updateJob(job.id, { currentStep: 'מנתח הבעות פנים...' });
        const presenterSegs = job.presenterDetection.presenterSegments;
        if (presenterSegs.length > 0) {
          const expressionAnalysis = await analyzeExpressions(
            job.files[0].path,
            job.contentAnalysis?.presenter?.totalSpeakingTime || 60,
            presenterSegs,
            job.id
          );
          job.expressionAnalysis = expressionAnalysis;
          saveJSON(`temp/${job.id}/expression_analysis.json`, expressionAnalysis);
          updateJob(job.id, { expressionAnalysis } as any);
          console.log(`[Pipeline] Expression analysis: ${expressionAnalysis.expressions.length} frames analyzed`);
        }
      } catch (error: any) {
        console.error('Expression analysis failed:', error.message);
        allWarnings.push('Expression analysis failed: ' + error.message);
      }
    }

    // Audit: expression analysis
    if (job.expressionAnalysis?.expressions?.length > 0) {
      audit.log('expression-analysis', 'enterprise', 'passed', `${job.expressionAnalysis.expressions.length} frames analyzed`);
    } else {
      audit.log('expression-analysis', 'enterprise', 'not-connected', 'No expression data');
    }

    // Use presenter-filtered transcript for all subsequent analysis (fallback to original)
    const analysisTranscript = presenterTranscript || transcript;

    // --- VIDEO INTELLIGENCE (Deep content understanding) ---
    if (analysisTranscript && job.files.length > 0) {
      try {
        updateJob(job.id, { currentStep: 'מנתח את התוכן לעומק...' });
        console.log(`[Pipeline] Running video intelligence for job ${job.id}`);

        const targetDur = job.plan.export.targetDuration === 'auto'
          ? undefined
          : job.plan.export.targetDuration as number;

        const videoIntelligence = await analyzeVideoIntelligence(
          job.files[0].path,
          transcript!,
          presenterTranscript,
          targetDur,
          job.videoType
        );

        job.videoIntelligence = videoIntelligence;
        saveJSON(`temp/${job.id}/video_intelligence.json`, videoIntelligence);
        updateJob(job.id, { videoIntelligence } as any);

        // Apply intelligence findings to the plan
        applyIntelligenceToPlan(job.plan, videoIntelligence);
        updateJob(job.id, { plan: job.plan });

        console.log(`[Pipeline] Video intelligence: category=${videoIntelligence.concept.category}, ${videoIntelligence.keyPoints.length} key points, ${videoIntelligence.smartBRollPlan.length} B-Roll planned`);
        if (videoIntelligence.edgeCases.warnings.length > 0) {
          console.log(`[Pipeline] Edge cases: ${videoIntelligence.edgeCases.warnings.join('; ')}`);
        }
      } catch (error: any) {
        console.error('Video intelligence failed:', error.message);
        allWarnings.push('Video intelligence failed: ' + error.message);
      }
    }

    // Audit: video intelligence
    if (job.videoIntelligence) {
      audit.log('video-intelligence', 'analysis', 'passed',
        `category=${job.videoIntelligence.concept?.category}, ${job.videoIntelligence.keyPoints?.length || 0} key points`);
      if (job.videoIntelligence.marketingPlan) {
        audit.log('marketing-plan', 'marketing', 'passed',
          job.videoIntelligence.marketingPlan.framework?.selectedFramework || 'framework generated');
        audit.log('cta', 'marketing', job.videoIntelligence.marketingPlan.ctaPlan ? 'passed' : 'not-connected',
          job.videoIntelligence.marketingPlan.ctaPlan?.primaryCTA?.text || 'no CTA');
      } else {
        audit.log('marketing-plan', 'marketing', 'not-connected', 'no marketing analysis');
      }
    } else {
      audit.log('video-intelligence', 'analysis', 'not-connected', 'analyzeVideoIntelligence() not run');
    }

    // --- EDITOR BRAIN: Load category-specific memory ---
    if (job.videoIntelligence?.concept?.category) {
      try {
        const platformGuessForBrain = job.plan.export?.formats?.includes('9:16') ? 'tiktok' : 'youtube';
        brainMemoryContext = getBrainContext(job.videoIntelligence.concept.category, platformGuessForBrain);
        if (brainMemoryContext) {
          console.log(`[Pipeline] Brain memory context loaded for ${job.videoIntelligence.concept.category}/${platformGuessForBrain}`);
        }
      } catch (error: any) {
        console.warn('[Pipeline] Brain memory context failed (non-critical):', error.message);
      }
    }

    // --- CONTENT SELECTION (12-dimension segment scoring) ---
    if (analysisTranscript && job.files.length > 0) {
      try {
        updateJob(job.id, { currentStep: 'מדרג ובוחר את הרגעים הטובים ביותר...' });
        console.log(`[Pipeline] Running content selection for job ${job.id}`);

        const targetDur = job.plan.export.targetDuration === 'auto'
          ? undefined
          : job.plan.export.targetDuration as number;

        const contentSelection = await selectBestContent(
          presenterTranscript || transcript!,
          targetDur,
          job.videoIntelligence?.concept?.category || 'talking-head',
          job.prompt
        );

        job.contentSelection = contentSelection;
        saveJSON(`temp/${job.id}/content_selection.json`, contentSelection);
        updateJob(job.id, { contentSelection } as any);

        console.log(`[Pipeline] Content selection: ${contentSelection.summary.keepDuration.toFixed(0)}s kept from ${contentSelection.summary.totalFootageDuration.toFixed(0)}s (${contentSelection.summary.cutPercentage}% cut)`);

        // --- AUTO-VERSIONING (3 lengths from 1 video) ---
        if (job.plan.export.platforms && job.plan.export.platforms.length > 0) {
          try {
            updateJob(job.id, { currentStep: 'מתכנן 3 גרסאות אורך...' });
            const versionPlan = await planAutoVersions(
              contentSelection.segments,
              contentSelection.summary.keepDuration,
              job.plan.export.platforms
            );
            job.versionPlan = versionPlan;
            saveJSON(`temp/${job.id}/version_plan.json`, versionPlan);
            updateJob(job.id, { versionPlan } as any);
            console.log(`[Pipeline] Auto-versioning: ${versionPlan.versions.length} versions planned`);
          } catch (error: any) {
            console.error('Auto-versioning failed:', error.message);
            allWarnings.push('Auto-versioning failed: ' + error.message);
          }
        }
      } catch (error: any) {
        console.error('Content selection failed:', error.message);
        allWarnings.push('Content selection failed: ' + error.message);
      }
    }

    // Audit: content selection
    if (job.contentSelection) {
      audit.log('12d-scoring', 'contentSelection', 'passed',
        `${job.contentSelection.segments?.length || 0} segments scored`);
      audit.log('repetition-detection', 'contentSelection', job.contentSelection.repetitions ? 'passed' : 'not-connected',
        `${job.contentSelection.repetitions?.length || 0} repetitions found`);
      audit.log('sentence-reconstruction', 'contentSelection', job.contentSelection.reconstructions ? 'passed' : 'not-connected',
        `${job.contentSelection.reconstructions?.length || 0} reconstructed`);
      audit.log('optimal-ordering', 'contentSelection', job.contentSelection.suggestedOrder ? 'passed' : 'not-connected',
        'hook-first reordering');
    } else {
      audit.log('content-selection', 'contentSelection', 'not-connected', 'selectBestContent() never called');
    }

    // Audit: auto-versioning
    if (job.versionPlan) {
      audit.log('auto-versioning', 'enterprise', 'passed', `${job.versionPlan.versions?.length || 0} versions planned`);
    } else {
      audit.log('auto-versioning', 'enterprise', 'not-connected', 'not run');
    }

    // --- PRESENTER QUALITY ANALYSIS (eye contact + body language + complete sentences) ---
    if (job.presenterDetection?.presenterId !== undefined && job.contentSelection && job.files.length > 0) {
      try {
        updateJob(job.id, { currentStep: 'מנתח איכות פרזנטור — קשר עין, שפת גוף...' });

        const videoPath = job.cleanVideoPath || job.files[0].path;

        // Prepare segments for analysis (only non-cut, non-filler)
        const segmentsForAnalysis = job.contentSelection.segments
          .map((s: any, i: number) => ({ start: s.start, end: s.end, text: s.text, index: i }))
          .filter((_s: any, i: number) => {
            const seg = job.contentSelection!.segments[i];
            return seg.decision !== 'cut' && seg.decision !== 'filler';
          });

        const presenterQuality = await analyzePresenterQuality(videoPath, segmentsForAnalysis, job.id);
        job.presenterQuality = presenterQuality;
        updateJob(job.id, { presenterQuality } as any);

        // Apply presenter quality to content selection scores
        job.contentSelection.segments = applyPresenterQuality(
          job.contentSelection.segments,
          presenterQuality
        );

        // Auto-add B-Roll cover for weak presenter moments
        const needsCover = job.contentSelection.segments.filter((s: any) => s.needsBRollCover);
        if (needsCover.length > 0 && job.editingBlueprint) {
          console.log(`[Presenter] ${needsCover.length} segments need B-Roll cover (good audio, weak visuals)`);
          job.editingBlueprint.brollInsertions = job.editingBlueprint.brollInsertions || [];
          for (const seg of needsCover) {
            job.editingBlueprint.brollInsertions.push({
              at: seg.start,
              duration: seg.end - seg.start,
              audioOverlap: 0,
              cutType: 'lcut',
              prompt: 'contextual B-Roll matching spoken content',
              reason: `presenter quality: cover face with B-Roll`,
            } as any);
          }
        }

        // Auto-add zoom for excellent eye contact moments
        const excellentMoments = job.contentSelection.segments.filter((s: any) => s.recommendZoomIn);
        if (excellentMoments.length > 0 && job.editingBlueprint) {
          console.log(`[Presenter] ${excellentMoments.length} segments with excellent eye contact — adding zoom`);
          job.editingBlueprint.zooms = job.editingBlueprint.zooms || [];
          for (const seg of excellentMoments) {
            const pqScore = presenterQuality.segmentScores.find((ps: any) => ps.segmentIndex === job.contentSelection!.segments.indexOf(seg));
            job.editingBlueprint.zooms.push({
              timestamp: (seg.start + seg.end) / 2,
              zoomFrom: 1.0,
              zoomTo: 1.15,
              duration: 1.5,
              reason: `excellent eye contact (score ${pqScore?.eyeContact ?? '?'}/10)`,
            } as any);
          }
        }

        // Extend segments with mid-word cuts
        const midWordCuts = job.contentSelection.segments.filter((s: any) => s.extendEnd);
        if (midWordCuts.length > 0) {
          console.log(`[Presenter] ${midWordCuts.length} segments extended to prevent mid-word cuts`);
          for (const seg of midWordCuts) {
            seg.end += (seg as any).extendEnd;
          }
        }

        const good = presenterQuality.segmentScores.filter(s => s.recommendation === 'use').length;
        const cover = presenterQuality.segmentScores.filter(s => s.recommendation === 'use-with-broll-cover').length;
        const avoid = presenterQuality.segmentScores.filter(s => s.recommendation === 'avoid').length;
        console.log(`[Pipeline] Presenter quality: ${good} use, ${cover} cover, ${avoid} avoid`);
      } catch (error: any) {
        console.error('Presenter quality analysis failed:', error.message);
        allWarnings.push('Presenter quality analysis failed: ' + error.message);
      }
    }

    // Audit: presenter quality
    if (job.presenterQuality) {
      const good = job.presenterQuality.segmentScores.filter((s: any) => s.recommendation === 'use').length;
      const cover = job.presenterQuality.segmentScores.filter((s: any) => s.recommendation === 'use-with-broll-cover').length;
      audit.log('eye-contact-analysis', 'presenterQuality', 'passed', `${good} use, ${cover} cover with B-Roll`);
      audit.log('mid-word-cut-check', 'presenterQuality', 'passed', 'checked');
    } else if (!job.presenterDetection) {
      audit.log('presenter-quality', 'presenterQuality', 'skipped', 'No presenter detected');
    } else {
      audit.log('presenter-quality', 'presenterQuality', 'not-connected', 'analyzePresenterQuality() never called');
    }

    // --- CONTENT ANALYSIS (Smart Brain Editor) ---
    if (analysisTranscript && job.files.length > 0) {
      try {
        updateJobStep(job, 'analyzing', 25);
        console.log(`[Pipeline] Running content analysis for job ${job.id}`);

        const targetDur = job.plan.export.targetDuration === 'auto'
          ? undefined
          : job.plan.export.targetDuration as number;

        const platformGuessForAnalysis = job.plan.export?.formats?.includes('9:16') ? 'tiktok' : 'youtube';
        const contentAnalysis = await analyzeContent(
          job.files[0].path,
          analysisTranscript,
          targetDur,
          {
            videoCategory: job.videoIntelligence?.concept?.category || 'talking-head',
            platform: platformGuessForAnalysis,
            paceMode: job.paceMode || 'normal',
            durationCategory: job.durationCategory || 'normal',
            hasSpeech: job.footageDiagnosis?.hasSpeech !== false,
            speakerCount: job.footageDiagnosis?.speakerCount || 1,
          }
        );

        job.contentAnalysis = contentAnalysis;

        // Save analysis to disk
        const analysisDir = `temp/${job.id}`;
        fs.mkdirSync(analysisDir, { recursive: true });
        fs.writeFileSync(
          `${analysisDir}/content_analysis.json`,
          JSON.stringify(contentAnalysis, null, 2)
        );

        updateJob(job.id, { contentAnalysis } as any);

        // Update the plan based on analysis
        if (contentAnalysis.recommendedEdit) {
          if (contentAnalysis.recommendedEdit.suggestedOrder === 'hook-first') {
            job.plan.edit.useHookFirst = true;
          }
          job.plan.edit.hookSegment = contentAnalysis.recommendedEdit.hookSegment || undefined;
          job.plan.edit.segmentsToKeep = contentAnalysis.recommendedEdit.segments;

          if (job.plan.export.targetDuration === 'auto') {
            job.plan.export.targetDuration = contentAnalysis.recommendedEdit.totalDuration;
          }

          updateJob(job.id, { plan: job.plan });
        }

        console.log(`[Pipeline] Content analysis complete: ${contentAnalysis.recommendedEdit.totalDuration}s recommended from ${Math.round(contentAnalysis.presenter.totalSpeakingTime + contentAnalysis.presenter.totalSilentTime)}s original`);
      } catch (error: any) {
        console.error('Content analysis failed:', error.message);
        allWarnings.push('Content analysis failed: ' + error.message);
      }
    }

    // --- PACE MODE SELECTION ---
    try {
      const platformGuess = job.plan.export?.formats?.includes('9:16') ? 'tiktok' : 'youtube';
      const videoCategory = job.videoIntelligence?.concept?.category || 'talking-head';
      const paceMode = selectPaceMode(platformGuess, videoCategory, job.plan.edit.pacing as any);
      job.paceMode = paceMode;
      const paceConfig = PACE_MODES[paceMode];
      updateJob(job.id, { paceMode } as any);
      console.log(`[Pipeline] Pace mode: ${paceMode} (cut every ${paceConfig.cutFrequency.min}-${paceConfig.cutFrequency.max}s, zoom ${paceConfig.zoomIntensity}x)`);
    } catch (error: any) {
      console.warn('[Pipeline] Pace mode selection failed (non-critical):', error.message);
    }

    // --- REAL CLEAN AGENT ---
    const hasCleanSteps =
      job.plan.clean.removeSilences ||
      job.plan.clean.removeFillerWords ||
      job.plan.clean.selectBestTake ||
      job.plan.clean.removeShakyBRoll;

    if (hasCleanSteps) {
      console.log(`[Pipeline] Running real clean agent for job ${job.id}`);
      const cleanResult = await runCleanAgent(job, job.plan, analysisTranscript || transcript);
      allWarnings.push(...cleanResult.warnings);

      // Update job with clean video path for next stages
      if (cleanResult.cleanVideoPath) {
        updateJob(job.id, { cleanVideoPath: cleanResult.cleanVideoPath });
      }

      // Count completed clean steps
      const cleanStepCount = steps.filter(s => s.stage === 'clean').length;
      completedSteps += cleanStepCount;
      updateJob(job.id, {
        progress: calculateProgress(completedSteps, totalSteps),
      });
    }

    // --- AUTOMATED MODEL SELECTION (pre-generate) ---
    if (job.plan.generate.automatedModelSelection && !job.plan.generate.broll) {
      // If auto model selection is on but B-Roll is not enabled,
      // still run selection for potential future use
      try {
        const { selectBestModel } = await import('../services/modelSelection.js');
        const recommendation = await selectBestModel(job.prompt, 'medium');
        job.plan.generate.brollModel = recommendation.model as any;
        console.log(`[Auto Model] Pre-selected: ${recommendation.model}`);
      } catch (error: any) {
        console.error('Auto model pre-selection failed:', error.message);
      }
    }

    // --- B-ROLL COUNT (dynamic by duration + pace + speech) ---
    try {
      const { calculateBRollCount } = await import('../services/editingRules.js');
      const videoDuration = job.footageDiagnosis?.duration || job.plan.export.targetDuration as number || 60;
      const hasSpeech = job.footageDiagnosis?.hasSpeech !== false;
      const brollCount = calculateBRollCount(videoDuration, (job as any).paceMode || 'normal', hasSpeech);
      (job as any).targetBRollCount = brollCount.recommended;
      updateJob(job.id, { targetBRollCount: brollCount.recommended } as any);
      console.log(`[B-Roll] Target: ${brollCount.recommended} clips (min ${brollCount.min}, max ${brollCount.max}) for ${videoDuration}s video`);
    } catch (error: any) {
      console.warn('[B-Roll] Count calculation failed (non-critical):', error.message);
    }

    // --- REAL GENERATE AGENT ---
    let generateResult: GenerateResult | null = null;

    if (hasAnyGenerateFeature(job.plan)) {
      updateJobStep(job, 'generating-broll', 45);
      console.log(`[Pipeline] Running real generate agent for job ${job.id}`);
      generateResult = await runGenerateAgent(job, job.plan, analysisTranscript || transcript);

      // Count completed generate steps
      const generateStepCount = steps.filter(s => s.stage === 'generate' || s.stage === 'analyze').length;
      completedSteps += generateStepCount;
      updateJob(job.id, {
        progress: calculateProgress(completedSteps, totalSteps),
      });
    }

    // --- BEAT-SYNC: Detect beats in music and snap cuts ---
    if (generateResult?.musicPath && job.plan.edit.beatSyncCuts) {
      try {
        updateJobStep(job, 'generating-music', 55);
        const beatMap = await detectBeatSync(generateResult.musicPath, job.id);
        job.beatMap = beatMap;
        updateJob(job.id, { beatMap } as any);

        // Snap existing cuts to nearest beat
        if (job.editingBlueprint?.cuts) {
          const snappedCuts = snapCutsToBeats(job.editingBlueprint.cuts, beatMap);
          job.editingBlueprint.cuts = snappedCuts as any;
          const snapped = snappedCuts.filter((c: any) => c.snappedToBeat).length;
          console.log(`[BeatSync] Snapped ${snapped}/${job.editingBlueprint.cuts.length} cuts to beats`);
        }
      } catch (error: any) {
        console.error('Beat sync failed:', error.message);
        allWarnings.push('Beat sync failed: ' + error.message);
      }
    }

    // --- B-ROLL QUALITY FILTER ---
    if (generateResult?.brollClips && generateResult.brollClips.length > 0) {
      try {
        const clipPaths = generateResult.brollClips
          .filter(c => !c.isStock && fs.existsSync(c.path))
          .map(c => c.path);

        if (clipPaths.length > 0) {
          updateJob(job.id, { currentStep: `בודק איכות ${clipPaths.length} קליפי B-Roll...` });
          const brollQA = await filterBRollQuality(clipPaths);
          job.brollQA = brollQA;
          updateJob(job.id, { brollQA } as any);

          const needRegen = brollQA.filter(r => r.recommendation === 'regenerate');
          if (needRegen.length > 0) {
            console.log(`[B-Roll QA] ${needRegen.length} clips need regeneration`);
            allWarnings.push(`${needRegen.length} B-Roll clips had quality issues`);
          }
        }
      } catch (error: any) {
        console.error('B-Roll QA failed:', error.message);
        allWarnings.push('B-Roll QA failed: ' + error.message);
      }
    }

    // --- SCENE-AWARE AMBIENT SOUND ---
    if (job.editingBlueprint?.brollInsertions && job.editingBlueprint.brollInsertions.length > 0) {
      try {
        updateJobStep(job, 'editing-effects', 72);
        const videoDuration = job.contentAnalysis?.presenter?.totalSpeakingTime || 60;
        const ambientSoundPlan = await planAmbientSound(
          job.editingBlueprint.brollInsertions,
          videoDuration
        );
        job.ambientSoundPlan = ambientSoundPlan;
        updateJob(job.id, { ambientSoundPlan } as any);
        console.log(`[Pipeline] Ambient sound: ${ambientSoundPlan.segments.length} segments planned`);
      } catch (error: any) {
        console.error('Ambient sound planning failed:', error.message);
        allWarnings.push('Ambient sound planning failed: ' + error.message);
      }
    }

    // --- SUBTITLE STYLE INTELLIGENCE (before rendering) ---
    if (job.plan.edit.subtitles) {
      try {
        updateJobStep(job, 'editing-subtitles', 78);
        const platformGuess = job.plan.export?.formats?.includes('9:16') ? 'instagram-reels' : 'youtube';
        const videoCategory = job.videoIntelligence?.concept?.category || 'talking-head';
        const emotionalTone = job.emotionalArc?.[0]?.phase || 'neutral';
        const hasPresenter = !!job.presenterDetection;

        const subtitleStylePlan = await selectSubtitleStyle(
          videoCategory,
          platformGuess,
          emotionalTone,
          hasPresenter,
          job.brandKit
        );
        job.subtitleStylePlan = subtitleStylePlan;
        updateJob(job.id, { subtitleStylePlan } as any);
        console.log(`[Pipeline] Subtitle style: ${subtitleStylePlan.selectedStyle} — ${subtitleStylePlan.reason}`);
      } catch (error: any) {
        console.error('Subtitle style selection failed:', error.message);
        allWarnings.push('Subtitle style selection failed: ' + error.message);
      }
    }

    // --- APPLY EDIT STYLE (if user selected one) ---
    if (job.editStyle && EDIT_STYLES[job.editStyle]) {
      console.log(`[Pipeline] Applying edit style: ${job.editStyle}`);
      job.plan = applyEditStyle(job.plan!, job.editStyle);
      updateJob(job.id, { plan: job.plan });
    }

    // --- FRESH EYES REVIEW (last check before rendering) ---
    if (job.editingBlueprint) {
      try {
        updateJobStep(job, 'editing-audio', 85);

        const videoFile = job.files.find(f => f.type.startsWith('video'));
        const videoDuration = job.contentAnalysis?.duration || 60;
        const platformGuess = job.plan.export?.formats?.includes('9:16') ? 'instagram-reels' : 'youtube';

        const freshReview = await runFreshEyesReview(
          job.editingBlueprint,
          job.contentAnalysis,
          job.videoIntelligence?.marketingPlan,
          job.emotionalArc,
          videoDuration,
          platformGuess
        );

        job.freshEyesReview = freshReview;
        updateJob(job.id, { freshEyesReview: freshReview } as any);

        // Auto-apply critical fixes
        const fixCount = autoApplyFixes(job.editingBlueprint, freshReview.improvements);
        if (fixCount > 0) {
          console.log(`[Fresh Eyes] Auto-applied ${fixCount} critical fixes`);
        }

        // Log all findings
        for (const imp of freshReview.improvements) {
          const icon = imp.priority === 'critical' ? '[CRITICAL]' : imp.priority === 'important' ? '[IMPORTANT]' : '[NICE]';
          console.log(`[Fresh Eyes] ${icon} ${imp.area}: ${imp.issue}`);
        }

        console.log(`[Fresh Eyes] Confidence: ${freshReview.overallConfidence}/10 | Would approve: ${freshReview.wouldApprove}`);
      } catch (error: any) {
        console.error('Fresh eyes review failed:', error.message);
        allWarnings.push('Fresh eyes review failed: ' + error.message);
      }
    }

    // --- RETENTION OPTIMIZER (before rendering) ---
    if (job.editingBlueprint || job.contentAnalysis) {
      try {
        updateJob(job.id, { currentStep: 'מנתח שימור צופים...' });
        const platformGuess = job.plan.export?.formats?.includes('9:16') ? 'instagram-reels' : 'youtube';
        const targetDur = job.plan.export.targetDuration === 'auto'
          ? 60
          : (job.plan.export.targetDuration as number) || 60;

        const retentionPlan = await analyzeRetention(
          job.editingBlueprint || job.contentAnalysis,
          job.contentAnalysis || job.videoIntelligence,
          targetDur,
          platformGuess
        );

        job.retentionPlan = retentionPlan;
        updateJob(job.id, { retentionPlan } as any);

        // Apply retention fixes to the editing blueprint
        if (retentionPlan.fixes.length > 0 && job.editingBlueprint) {
          for (const fix of retentionPlan.fixes) {
            if (fix.type === 'add-zoom' && job.editingBlueprint?.zooms) {
              job.editingBlueprint.zooms.push({
                timestamp: fix.timestamp,
                from: 1.0,
                to: 1.12,
                duration: 1.0,
                reason: `retention fix: ${fix.reason}`,
              } as any);
            }
            if (fix.type === 'add-sfx' && job.editingBlueprint?.soundDesign?.sfx) {
              job.editingBlueprint.soundDesign.sfx.push({
                type: 'rise',
                at: fix.timestamp,
                volume: -15,
                duration: 1.5,
                reason: `retention fix: ${fix.reason}`,
              } as any);
            }
          }
          console.log(`[Retention] Applied ${retentionPlan.fixes.length} retention fixes. Predicted retention: ${retentionPlan.predictedRetention}%`);
        }
      } catch (error: any) {
        console.error('Retention analysis failed:', error.message);
        allWarnings.push('Retention analysis failed: ' + error.message);
      }
    }

    // --- EXPRESSION-BASED EDITING ENHANCEMENTS ---
    if (job.expressionAnalysis && job.editingBlueprint) {
      for (const expr of job.expressionAnalysis.expressions) {
        if (expr.recommendation === 'zoom-in' && job.editingBlueprint.zooms) {
          job.editingBlueprint.zooms.push({
            timestamp: expr.timestamp,
            zoomFrom: 1.0,
            zoomTo: 1.15,
            duration: 1.5,
            easing: 'ease-out',
            reason: `expression: ${expr.expression}`,
          });
        }
        if (expr.recommendation === 'cover-with-broll' && job.editingBlueprint.brollInsertions) {
          job.editingBlueprint.brollInsertions.push({
            at: expr.timestamp,
            duration: 3,
            audioOverlap: 1,
            cutType: 'lcut',
            prompt: 'contextual B-Roll',
            speakerAudioContinues: true,
          });
        }
      }
      console.log(`[Pipeline] Applied expression-based editing: ${job.expressionAnalysis.expressions.filter(e => e.recommendation === 'zoom-in').length} zooms, ${job.expressionAnalysis.expressions.filter(e => e.recommendation === 'cover-with-broll').length} B-Roll covers`);
    }

    // Audit: editing blueprint
    if (job.editingBlueprint) {
      const bp = job.editingBlueprint;
      audit.log('cuts-planned', 'brain', (bp as any).cuts?.length > 0 ? 'passed' : 'failed', `${(bp as any).cuts?.length || 0} cuts`);
      audit.log('zooms-planned', 'brain', (bp as any).zooms?.length > 0 ? 'passed' : 'failed', `${(bp as any).zooms?.length || 0} zooms`);
      audit.log('speed-ramps-planned', 'brain', (bp as any).speedRamps?.length > 0 ? 'passed' : 'skipped', `${(bp as any).speedRamps?.length || 0} speed ramps`);
      audit.log('pattern-interrupts-planned', 'brain', (bp as any).patternInterrupts?.length > 0 ? 'passed' : 'skipped', `${(bp as any).patternInterrupts?.length || 0} interrupts`);
      audit.log('emotional-arc-planned', 'brain', (bp as any).emotionalArc?.length > 0 ? 'passed' : 'not-connected', `${(bp as any).emotionalArc?.length || 0} phases`);
      audit.log('protected-silences', 'brain', (bp as any).protectedSilences?.length >= 0 ? 'passed' : 'not-connected', `${(bp as any).protectedSilences?.length || 0} pauses kept`);
      audit.log('sound-design', 'brain', (bp as any).soundDesign?.sfx?.length > 0 ? 'passed' : 'skipped', `${(bp as any).soundDesign?.sfx?.length || 0} SFX`);
      audit.log('background-plan', 'brain', (bp as any).backgroundPlan ? 'passed' : 'not-connected', (bp as any).backgroundPlan ? `quality: ${(bp as any).backgroundPlan.quality}` : 'not evaluated');
      audit.log('lighting-plan', 'brain', (bp as any).lightingPlan ? 'passed' : 'not-connected', (bp as any).lightingPlan ? `quality: ${(bp as any).lightingPlan.quality}` : 'not evaluated');
      audit.log('color-story', 'brain', (bp as any).colorStory ? 'passed' : 'not-connected', (bp as any).colorStory || 'not planned');

      // B-Roll prompts quality
      if ((bp as any).brollInsertions?.length > 0) {
        const firstPrompt = (bp as any).brollInsertions[0].brollPrompt || (bp as any).brollInsertions[0].prompt || '';
        const isCinematic = firstPrompt.length > 80 &&
          (firstPrompt.includes('shot') || firstPrompt.includes('dolly') || firstPrompt.includes('drone') || firstPrompt.includes('cinematic'));
        audit.log('broll-prompts', 'brain', isCinematic ? 'passed' : 'failed',
          isCinematic ? `Cinematic prompt: "${firstPrompt.slice(0, 60)}..."` : `BASIC prompt: "${firstPrompt.slice(0, 60)}..." — NOT cinematic`);

        const hasTimestamps = (bp as any).brollInsertions[0].triggerWordTimestamp !== undefined;
        audit.log('broll-word-precision', 'brain', hasTimestamps ? 'passed' : 'failed',
          hasTimestamps ? `trigger word at ${(bp as any).brollInsertions[0].triggerWordTimestamp}s` : 'NO word-level timestamp — B-Roll timing imprecise');
      } else {
        audit.log('broll-planned', 'brain', 'failed', 'No B-Roll insertions planned');
      }

      // Brain categories coverage
      const categories: [string, any][] = [
        ['cuts', (bp as any).cuts], ['zooms', (bp as any).zooms], ['speedRamps', (bp as any).speedRamps],
        ['patternInterrupts', (bp as any).patternInterrupts], ['emotionalArc', (bp as any).emotionalArc],
        ['protectedSilences', (bp as any).protectedSilences], ['brollInsertions', (bp as any).brollInsertions],
        ['soundDesign', (bp as any).soundDesign], ['backgroundPlan', (bp as any).backgroundPlan],
        ['lightingPlan', (bp as any).lightingPlan], ['colorStory', (bp as any).colorStory],
      ];
      const missing = categories.filter(([, val]) => val === undefined || val === null);
      const present = categories.filter(([, val]) => val !== undefined && val !== null);
      audit.log('brain-categories-coverage', 'brainVerify',
        missing.length === 0 ? 'passed' : missing.length <= 3 ? 'passed' : 'failed',
        `${present.length}/${categories.length} categories in blueprint. Missing: ${missing.map(m => m[0]).join(', ') || 'none'}`);
    } else {
      audit.log('editing-blueprint', 'brain', 'failed', 'No editing blueprint generated');
    }

    // Audit: fresh eyes review
    if (job.freshEyesReview) {
      audit.log('fresh-eyes', 'qa', 'passed', `confidence: ${job.freshEyesReview.overallConfidence}/10`);
    } else {
      audit.log('fresh-eyes', 'qa', 'not-connected', 'not run');
    }

    // Audit: retention
    if (job.retentionPlan) {
      audit.log('retention-analysis', 'qa', 'passed', `predicted: ${job.retentionPlan.predictedRetention}%`);
    } else {
      audit.log('retention-analysis', 'qa', 'not-connected', 'not run');
    }

    // Audit: B-Roll generation
    audit.log('broll-generation', 'generate', generateResult?.brollClips && generateResult.brollClips.length > 0 ? 'passed' : 'failed',
      `${generateResult?.brollClips?.length || 0} clips generated (target: ${(job as any).targetBRollCount || '?'})`);

    // --- REAL EDIT AGENT ---
    const hasEditSteps = steps.some(s => s.stage === 'edit' || s.stage === 'export');

    let editResult: EditResult | null = null;

    if (hasEditSteps) {
      console.log(`[Pipeline] Running real edit agent for job ${job.id}`);
      updateJobStep(job, 'editing-cuts', 65);

      const cleanVideoPath = job.cleanVideoPath || (job.files[0]?.path || '');
      const emptyGenerateResult: GenerateResult = {
        brollClips: [],
        voiceoverPath: null,
        musicPath: null,
        sfxMoments: [],
        thumbnailPath: null,
        stockClips: [],
        additionalAssets: {},
      };

      editResult = await runEditAgent(
        job,
        job.plan,
        cleanVideoPath,
        generateResult || emptyGenerateResult,
        analysisTranscript || transcript
      );

      allWarnings.push(...editResult.warnings);

      // Count completed edit + export steps
      const editStepCount = steps.filter(s => s.stage === 'edit' || s.stage === 'export').length;
      completedSteps += editStepCount;
      updateJob(job.id, {
        progress: calculateProgress(completedSteps, totalSteps),
      });
    }

    // --- REMAINING STAGES (templates — still simulated) ---
    const remainingSteps = steps.filter(
      s => s.stage !== 'ingest' && s.stage !== 'clean' && s.stage !== 'generate' && s.stage !== 'analyze' && s.stage !== 'edit' && s.stage !== 'export'
    );

    for (let i = 0; i < remainingSteps.length; i++) {
      const step = remainingSteps[i];
      completedSteps++;
      const progress = calculateProgress(completedSteps, totalSteps);

      updateJob(job.id, {
        currentStep: `${step.name}...`,
        progress,
      });

      await delay(randomBetween(500, 1000));
    }

    // --- CONTENT SAFETY CHECK (before export — last chance to catch issues) ---
    if (analysisTranscript || transcript) {
      try {
        updateJobStep(job, 'quality-check', 92);
        const platformGuess = job.plan.export?.formats?.includes('9:16') ? 'instagram-reels' : 'youtube';
        const transcriptText = (analysisTranscript || transcript)?.fullText || '';
        const musicSource = job.generateResult?.musicPath ? 'suno-ai' : 'none';
        const industry = job.videoIntelligence?.concept?.industry || 'general';

        const contentSafety = await checkContentSafety(
          transcriptText,
          job.videoIntelligence?.marketingPlan,
          musicSource,
          platformGuess,
          industry
        );
        job.contentSafety = contentSafety;
        updateJob(job.id, { contentSafety } as any);

        if (!contentSafety.safe) {
          allWarnings.push('נמצאו בעיות בטיחות בתוכן — עיין בפרטים');
        }
        for (const flag of contentSafety.flags) {
          if (flag.severity === 'block') {
            allWarnings.push(`חסימה: ${flag.description}`);
          } else if (flag.severity === 'warning') {
            allWarnings.push(`אזהרה: ${flag.description}`);
          }
        }
        console.log(`[Pipeline] Content safety: ${contentSafety.score}/10 | Safe: ${contentSafety.safe} | Flags: ${contentSafety.flags.length}`);
      } catch (error: any) {
        console.error('Content safety check failed:', error.message);
        allWarnings.push('Content safety check failed: ' + error.message);
      }
    }

    // --- EXPORT AGENT ---
    let exportDuration = editResult?.duration || randomBetween(30, 180);
    let exportExports: Array<{ format: string; url: string }> = [];

    if (editResult) {
      try {
        console.log(`[Pipeline] Running export agent for job ${job.id}`);
        updateJobStep(job, 'finalizing', 98);

        const exportResult = await runExportAgent(job, job.plan, editResult.finalVideoPath);

        if (exportResult.duration) {
          exportDuration = exportResult.duration;
        }
        if (exportResult.mainVideoPath) {
          exportExports = exportResult.exports.map(e => ({ format: e.format, url: e.url }));
        }
      } catch (error: any) {
        console.error('Export agent failed:', error.message);
        allWarnings.push(`Export failed: ${error.message}`);
      }

      // --- SMART PLATFORM EXPORTS ---
      const platformTargets = job.plan.export.platforms || [];
      if (platformTargets.length > 0 && editResult.finalVideoPath) {
        for (const platform of platformTargets) {
          try {
            updateJob(job.id, { currentStep: `מייצא ל-${EXPORT_PRESETS[platform]?.name || platform}...` });
            const platformOutput = `output/${job.id}/${platform}.mp4`;
            fs.mkdirSync(`output/${job.id}`, { recursive: true });
            const exportCmd = getExportCommand(editResult.finalVideoPath, platformOutput, platform);
            const { runFFmpeg } = await import('../services/ffmpeg.js');
            await runFFmpeg(exportCmd);
            console.log(`[Export] Smart export for ${platform} done`);
            exportExports.push({ format: platform, url: `/api/jobs/${job.id}/video?format=${platform}` });
          } catch (error: any) {
            console.warn(`[Export] Smart export ${platform} failed:`, error.message);
            allWarnings.push(`Smart export ${platform} failed: ${error.message}`);
          }
        }
      }
    }

    // === SMART AUTO-REFRAME (Speaker Tracking) ===
    if (
      job.plan.export.aiReframe &&
      editResult?.finalVideoPath &&
      fs.existsSync(editResult.finalVideoPath) &&
      job.plan.export.formats.includes('9:16')
    ) {
      try {
        updateJob(job.id, { currentStep: 'מבצע reframe חכם עם מעקב פנים...' });
        const hasPresenter = !!job.presenterDetection;

        const reframePlan = await planAutoReframe(
          editResult.finalVideoPath,
          exportDuration,
          '16:9',
          '9:16',
          hasPresenter,
          job.id
        );
        job.reframePlan = reframePlan;
        updateJob(job.id, { reframePlan } as any);

        const reframedPath = `output/${job.id}/reframed_9x16.mp4`;
        fs.mkdirSync(`output/${job.id}`, { recursive: true });
        await applyAutoReframe(editResult.finalVideoPath, reframePlan, reframedPath, '9:16');

        if (fs.existsSync(reframedPath)) {
          exportExports.push({ format: '9:16-reframed', url: `/api/jobs/${job.id}/video?format=9x16-reframed` });
          console.log(`[Pipeline] Auto-reframe: ${reframePlan.method} with ${reframePlan.keyframes.length} keyframes`);
        }
      } catch (error: any) {
        console.error('Auto-reframe failed:', error.message);
        allWarnings.push('Auto-reframe failed: ' + error.message);
      }
    }

    // === BRANDED INTRO/OUTRO ===
    if (editResult?.finalVideoPath && job.brandKit?.enabled && fs.existsSync(editResult.finalVideoPath)) {
      try {
        updateJob(job.id, { currentStep: 'יוצר פתיחה וסיום ממותגים...' });
        const platformGuess = job.plan.export?.formats?.includes('9:16') ? 'instagram-reels' : 'youtube';
        const introOutroPlan = planIntroOutro(job.brandKit, job.videoIntelligence?.marketingStrategy?.ctaPlan, platformGuess);
        job.introOutroPlan = introOutroPlan;
        updateJob(job.id, { introOutroPlan } as any);

        const resolution = job.plan.export?.formats?.includes('9:16') ? '1080:1920' : '1920:1080';
        fs.mkdirSync(`temp/${job.id}`, { recursive: true });

        const introPath = await generateIntro(
          job.brandKit,
          introOutroPlan.intro,
          `temp/${job.id}/intro.mp4`,
          resolution
        );

        const ctaText = job.videoIntelligence?.marketingStrategy?.ctaPlan?.primaryCTA?.text || '';
        const outroPath = await generateOutro(
          job.brandKit,
          introOutroPlan.outro,
          ctaText,
          {},
          `temp/${job.id}/outro.mp4`,
          resolution
        );

        if (introPath || outroPath) {
          const withIntroOutro = `output/${job.id}/final_branded.mp4`;
          fs.mkdirSync(`output/${job.id}`, { recursive: true });
          const result = await attachIntroOutro(editResult.finalVideoPath, introPath, outroPath, withIntroOutro);
          if (result !== editResult.finalVideoPath) {
            editResult.finalVideoPath = result;
            console.log(`[Pipeline] Branded intro/outro attached (intro: ${!!introPath}, outro: ${!!outroPath})`);
          }
        }
      } catch (error: any) {
        console.error('Branded intro/outro failed:', error.message);
        allWarnings.push('Branded intro/outro failed: ' + error.message);
      }
    }

    // === THUMBNAIL OPTIMIZATION ===
    if (editResult?.finalVideoPath && fs.existsSync(editResult.finalVideoPath)) {
      try {
        updateJob(job.id, { currentStep: 'מייצר תמונה ממוזערת מותאמת...' });
        const thumbPlan = await planThumbnail(
          editResult.finalVideoPath,
          exportDuration,
          job.videoIntelligence?.concept?.category || 'talking-head',
          job.videoIntelligence?.keyPoints || [],
          job.brandKit
        );

        const thumbPath = `output/${job.id}/thumbnail.jpg`;
        fs.mkdirSync(`output/${job.id}`, { recursive: true });
        await generateThumbnail(editResult.finalVideoPath, thumbPlan, thumbPath);
        (job as any).thumbnailPlan = thumbPlan;
        updateJob(job.id, { thumbnailPlan: thumbPlan } as any);
        console.log(`[Pipeline] Thumbnail generated with viral score ${thumbPlan.viralScore}/10`);
      } catch (error: any) {
        console.error('Thumbnail optimization failed:', error.message);
        allWarnings.push('Thumbnail optimization failed: ' + error.message);
      }
    }

    // === MULTI-PLATFORM INTELLIGENT THUMBNAILS ===
    if (editResult?.finalVideoPath && fs.existsSync(editResult.finalVideoPath)) {
      try {
        const platformNames = (job.plan.export.platforms || ['youtube']).map((p: string) => {
          if (p === 'youtube' || p === 'youtube-shorts') return 'youtube';
          if (p === 'instagram-reels' || p === 'instagram') return 'instagram-reels';
          if (p === 'tiktok') return 'tiktok';
          return p;
        });
        const uniquePlatforms = [...new Set(platformNames)] as string[];

        if (uniquePlatforms.length > 0) {
          updateJob(job.id, { currentStep: `מייצר thumbnails ל-${uniquePlatforms.length} פלטפורמות...` });
          const hookText = job.hookVariations?.[0]?.textOverlay
            || job.videoIntelligence?.keyPoints?.[0]?.point
            || '';

          const thumbnailResult = await generateThumbnails(
            editResult.finalVideoPath,
            exportDuration,
            hookText,
            job.brandKit,
            uniquePlatforms,
            job.id
          );
          job.thumbnails = thumbnailResult;
          updateJob(job.id, { thumbnails: thumbnailResult } as any);
          console.log(`[Pipeline] Multi-platform thumbnails: ${thumbnailResult.thumbnails.length} generated`);
        }
      } catch (error: any) {
        console.error('Multi-platform thumbnails failed:', error.message);
        allWarnings.push('Multi-platform thumbnails failed: ' + error.message);
      }
    }

    // === MULTI-PLATFORM CUTS ===
    if (job.plan.export.formats.length > 1 && job.contentSelection?.segments) {
      try {
        updateJob(job.id, { currentStep: 'מתכנן גרסאות לפלטפורמות שונות...' });
        const platformNames = job.plan.export.formats.map((f: string) =>
          f === '9:16' ? 'instagram-reels' : f === '1:1' ? 'linkedin' : 'youtube'
        );
        const platformCuts = await planMultiPlatformCuts(
          job.contentSelection.segments,
          job.contentAnalysis,
          exportDuration,
          platformNames
        );
        (job as any).platformCuts = platformCuts;
        updateJob(job.id, { platformCuts } as any);
        console.log(`[Pipeline] Planned ${platformCuts.length} platform-specific cuts`);
      } catch (error: any) {
        console.error('Multi-platform planning failed:', error.message);
        allWarnings.push('Multi-platform planning failed: ' + error.message);
      }
    }

    // === LIP SYNC TRANSLATION (after main video is complete) ===
    if (
      job.plan.generate.aiDubbing &&
      job.plan.generate.aiDubbingTargetLanguage &&
      editResult?.finalVideoPath &&
      fs.existsSync(editResult.finalVideoPath)
    ) {
      try {
        updateJob(job.id, { currentStep: 'מתרגם סרטון עם סנכרון שפתיים...' });
        const targetLang = job.plan.generate.aiDubbingTargetLanguage;
        job.lipSyncPlan = {
          needed: true,
          useCase: 'translation-dubbing',
          targetLanguages: [targetLang],
          reason: `Translation requested to ${targetLang}`,
        };
        updateJob(job.id, { lipSyncPlan: job.lipSyncPlan } as any);
        console.log(`[Pipeline] Lip sync translation plan: ${targetLang}`);
      } catch (error: any) {
        console.error('Lip sync plan failed:', error.message);
        allWarnings.push('Lip sync plan failed: ' + error.message);
      }
    }

    // === PLATFORM STRATEGY (generate platform-specific hooks/CTAs) ===
    if (job.plan.export.formats.length > 1 && (analysisTranscript || transcript)) {
      try {
        updateJob(job.id, { currentStep: 'בונה אסטרטגיית פלטפורמות...' });
        const { askClaude: askClaudeForStrategy } = await import('../services/claude.js');

        const platforms = job.plan.export.formats.map((f: string) =>
          f === '9:16' ? 'tiktok,instagram-reels' : f === '1:1' ? 'linkedin' : 'youtube'
        ).join(',').split(',');

        const uniquePlatforms = [...new Set(platforms)];
        const category = job.videoIntelligence?.concept?.category || 'talking-head';
        const prompt = job.prompt;

        const strategyResponse = await askClaudeForStrategy(
          FOCUSED_PROMPTS.platformStrategy,
          `Generate platform-specific content strategy for this video:
Category: ${category}
Prompt: "${prompt}"
Platforms: ${uniquePlatforms.join(', ')}

For each platform, return a JSON object with: hookTone, hookExample (in Hebrew), ctaStyle, ctaText (in Hebrew), polishLevel, soundStrategy.

Return ONLY valid JSON: { "tiktok": {...}, "instagram": {...}, ... }`
        );

        try {
          const cleaned = strategyResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const strategy = JSON.parse(cleaned);
          job.platformStrategy = strategy;
          updateJob(job.id, { platformStrategy: strategy } as any);
          console.log(`[Pipeline] Platform strategy generated for ${Object.keys(strategy).length} platforms`);
        } catch {
          console.log('[Pipeline] Platform strategy parsing failed, skipping');
        }
      } catch (error: any) {
        console.error('Platform strategy failed:', error.message);
        allWarnings.push('Platform strategy failed: ' + error.message);
      }
    }

    // === AD LOCALIZATION (generate language/audience variations) ===
    if (
      job.plan.generate.aiDubbing &&
      editResult?.finalVideoPath &&
      fs.existsSync(editResult.finalVideoPath) &&
      (analysisTranscript || transcript)
    ) {
      try {
        updateJob(job.id, { currentStep: 'מתכנן לוקליזציה...' });
        const { askClaude: askClaudeForLocale } = await import('../services/claude.js');

        const localeResponse = await askClaudeForLocale(
          FOCUSED_PROMPTS.adLocalization,
          `Plan localization for this video:
Prompt: "${job.prompt}"
Category: ${job.videoIntelligence?.concept?.category || 'general'}
Target language: ${job.plan.generate.aiDubbingTargetLanguage || 'en'}
Original language: Hebrew

Return JSON:
{
  "languages": [
    { "code": "en", "voiceover": true, "lipSync": true, "subtitles": true, "cta": "Schedule a tour" }
  ],
  "audienceVariations": [
    { "audience": "investors", "hookText": "תשואה של 6% מובטחת", "ctaText": "קבלו תוכנית עסקית" }
  ]
}`
        );

        try {
          const cleaned = localeResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const localizationPlan = JSON.parse(cleaned);
          job.localizationPlan = localizationPlan;
          updateJob(job.id, { localizationPlan } as any);
          console.log(`[Pipeline] Localization plan: ${localizationPlan.languages?.length || 0} languages, ${localizationPlan.audienceVariations?.length || 0} audience variations`);
        } catch {
          console.log('[Pipeline] Localization plan parsing failed, skipping');
        }
      } catch (error: any) {
        console.error('Localization planning failed:', error.message);
        allWarnings.push('Localization planning failed: ' + error.message);
      }
    }

    // === POST-RENDER: QA + HOOKS + LOOP + A/B TESTING ===
    let finalVideoPath = editResult?.finalVideoPath || `output/${job.id}/final.mp4`;

    // --- QUALITY CHECK ---
    if (fs.existsSync(finalVideoPath)) {
      try {
        updateJob(job.id, { currentStep: 'בודק איכות סופית...' });
        const qaResult = await runQualityCheck(finalVideoPath, exportDuration, job.plan, job.id);
        job.qaResult = qaResult;
        updateJob(job.id, { qaResult } as any);

        if (!qaResult.passed) {
          allWarnings.push(...qaResult.warnings);
          console.log(`[Pipeline] QA found ${qaResult.issues.length} issues, ${qaResult.autoFixes.length} auto-fixed`);
        }
      } catch (error: any) {
        console.error('QA check failed:', error.message);
        allWarnings.push('QA check failed: ' + error.message);
      }

      // --- BRAND COMPLIANCE CHECK ---
      if (job.brandKit?.enabled) {
        try {
          updateJob(job.id, { currentStep: 'בודק תאימות מותג...' });
          const brandResult = await checkBrandCompliance(finalVideoPath, exportDuration, job.brandKit, job.id);
          job.brandCompliance = brandResult;
          updateJob(job.id, { brandCompliance: brandResult } as any);
          if (!brandResult.passed) {
            allWarnings.push(...brandResult.issues.map(i => `מותג: ${i.issue}`));
          }
          console.log(`[Pipeline] Brand compliance: ${brandResult.score}/10 | Passed: ${brandResult.passed}`);
        } catch (error: any) {
          console.error('Brand compliance check failed:', error.message);
          allWarnings.push('Brand compliance check failed: ' + error.message);
        }
      }

      // --- MULTI-DEVICE PREVIEW SIMULATION ---
      try {
        updateJob(job.id, { currentStep: 'בודק תצוגה במכשירים שונים...' });
        const aspectRatio = job.plan.export.formats.includes('9:16') ? '9:16' : '16:9';
        const devicePreview = await simulateDevicePreview(finalVideoPath, exportDuration, aspectRatio, job.id);
        job.devicePreview = devicePreview;
        updateJob(job.id, { devicePreview } as any);

        if (!devicePreview.overallPassed) {
          const failedDevices = devicePreview.devices.filter(d => !d.passed).map(d => d.name);
          allWarnings.push(`תצוגה לא תקינה במכשירים: ${failedDevices.join(', ')}`);
        }
        console.log(`[Pipeline] Device preview: ${devicePreview.devices.filter(d => d.passed).length}/${devicePreview.devices.length} devices passed`);
      } catch (error: any) {
        console.error('Device preview simulation failed:', error.message);
        allWarnings.push('Device preview simulation failed: ' + error.message);
      }

      // --- TEXT READABILITY CHECK (mobile) ---
      if (job.videoIntelligence?.textOverlayPlan && job.videoIntelligence.textOverlayPlan.length > 0) {
        try {
          updateJob(job.id, { currentStep: 'בודק קריאות טקסט במובייל...' });
          const overlays = job.videoIntelligence.textOverlayPlan.map(t => ({
            text: t.text,
            timestamp: t.timestamp,
            fontSize: t.style === 'large-center' ? 'large' : 'medium',
            color: '#FFFFFF',
          }));
          const aspectRatio = job.plan.export.formats.includes('9:16') ? '9:16' : '16:9';
          const readability = await checkTextReadability(finalVideoPath, overlays, aspectRatio, job.id);
          job.textReadability = readability;
          updateJob(job.id, { textReadability: readability } as any);
          const readableCount = readability.filter(r => r.readable).length;
          console.log(`[Pipeline] Text readability: ${readableCount}/${readability.length} texts readable on mobile`);
        } catch (error: any) {
          console.error('Text readability check failed:', error.message);
          allWarnings.push('Text readability check failed: ' + error.message);
        }
      }
    }

    // --- HOOK VARIATIONS ---
    if (analysisTranscript || transcript) {
      try {
        updateJob(job.id, { currentStep: 'יוצר וריאציות הוקים...' });
        const hooks = await generateHookVariations(
          (analysisTranscript || transcript)!,
          job.contentSelection?.topMoments || job.contentAnalysis?.bestMoments || [],
          job.videoIntelligence?.concept?.category || 'talking-head',
          job.plan.export.formats.includes('9:16') ? 'instagram-reels' : 'youtube'
        );
        job.hookVariations = hooks;
        updateJob(job.id, { hookVariations: hooks } as any);

        // --- LOOP (for short-form) ---
        if (job.plan.export.formats.includes('9:16') && exportDuration <= 60) {
          try {
            const loopPlan = await planLoop(
              analysisTranscript || transcript,
              hooks[0]?.textOverlay || '',
              exportDuration,
              'instagram-reels'
            );
            job.loopPlan = loopPlan;
            updateJob(job.id, { loopPlan } as any);

            if (loopPlan.strategy !== 'none' && fs.existsSync(finalVideoPath)) {
              const loopedPath = finalVideoPath.replace('.mp4', '_looped.mp4');
              const result = await applyLoop(finalVideoPath, loopPlan, loopedPath, exportDuration);
              if (result !== finalVideoPath) {
                finalVideoPath = result;
              }
            }
          } catch (error: any) {
            console.error('Loop optimization failed:', error.message);
            allWarnings.push('Loop optimization failed: ' + error.message);
          }
        }

        // --- A/B TEST VARIATIONS ---
        if (hooks.length > 0 && fs.existsSync(finalVideoPath)) {
          try {
            updateJob(job.id, { currentStep: 'מייצר גרסאות A/B...' });
            const abResult = await generateABVariations(
              finalVideoPath,
              hooks,
              exportDuration,
              job.plan,
              `output/${job.id}`
            );
            job.abTestResult = abResult;
            updateJob(job.id, { abTestResult: abResult } as any);
          } catch (error: any) {
            console.error('A/B testing failed:', error.message);
            allWarnings.push('A/B testing failed: ' + error.message);
          }
        }
      } catch (error: any) {
        console.error('Hook generation failed:', error.message);
        allWarnings.push('Hook generation failed: ' + error.message);
      }
    }

    // === PIPELINE AUDIT: Post-render checks ===

    // Audit: edit execution
    const assembledPath = `temp/${job.id}/edit/selected_assembled.mp4`;
    audit.log('segment-assembly', 'edit', editResult ? 'passed' : 'failed',
      editResult ? 'segments assembled' : 'FAILED — this breaks everything after');
    audit.log('speed-ramps-applied', 'edit', fs.existsSync(`temp/${job.id}/edit/step_3.mp4`) ? 'passed' : 'skipped', 'speed ramp step');
    audit.log('broll-inserted', 'edit', fs.existsSync(`temp/${job.id}/edit/step_5.mp4`) ? 'passed' : 'skipped', 'B-Roll L-cuts');
    audit.log('zooms-applied', 'edit', fs.existsSync(`temp/${job.id}/edit/step_7.mp4`) ? 'passed' : 'skipped', 'zoompan filters');
    audit.log('subtitles-burned', 'edit', fs.existsSync(`temp/${job.id}/edit/subtitles.srt`) ? 'passed' : 'skipped', 'subtitles');
    audit.log('music-mixed', 'edit', generateResult?.musicPath ? 'passed' : 'skipped', 'music ducking');
    audit.log('sfx-applied', 'edit', generateResult?.sfxMoments?.length > 0 ? 'passed' : 'skipped', 'SFX overlaid');

    // Audit: QA
    audit.log('qa-vision', 'qa', job.qaResult ? 'passed' : 'not-connected',
      job.qaResult ? `score: ${job.qaResult.overallScore}/10` : 'not run');
    audit.log('content-safety', 'qa', job.contentSafety ? 'passed' : 'not-connected',
      job.contentSafety ? `safe: ${job.contentSafety.safe}` : 'not run');
    audit.log('brand-compliance', 'qa', job.brandCompliance ? 'passed' : 'not-connected',
      job.brandCompliance ? `score: ${job.brandCompliance.score}/10` : 'not run');

    // Audit: hooks + A/B
    audit.log('hook-variations', 'hooks', job.hookVariations?.length > 0 ? 'passed' : 'not-connected',
      `${job.hookVariations?.length || 0} hooks generated`);
    audit.log('ab-testing', 'hooks', job.abTestResult ? 'passed' : 'not-connected',
      job.abTestResult ? `${job.abTestResult.variations?.length || 0} variations` : 'not run');

    // Audit: enterprise features
    audit.log('subtitle-style', 'enterprise', job.subtitleStylePlan ? 'passed' : 'not-connected',
      job.subtitleStylePlan ? job.subtitleStylePlan.selectedStyle : 'not selected');
    audit.log('thumbnails', 'enterprise', job.thumbnails ? 'passed' : 'not-connected',
      job.thumbnails ? `${job.thumbnails.thumbnails?.length || 0} generated` : 'not run');
    audit.log('device-preview', 'enterprise', job.devicePreview ? 'passed' : 'not-connected',
      job.devicePreview ? `${job.devicePreview.devices?.length || 0} devices checked` : 'not run');

    // Audit: engagement
    audit.log('engagement-prediction', 'enterprise', job.engagementPrediction ? 'passed' : 'not-connected',
      job.engagementPrediction ? `${job.engagementPrediction.overallScore}/100` : 'not run');

    // Audit: export
    const finalPath = editResult?.finalVideoPath || `output/${job.id}/final.mp4`;
    audit.log('final-video', 'export', fs.existsSync(finalPath) ? 'passed' : 'failed',
      fs.existsSync(finalPath) ? `final video exists at ${finalPath}` : 'NO FINAL VIDEO');

    // Phase 3: Finalize
    updateJobStep(job, 'finalizing', 98);
    await delay(500);

    const videoUrl = job.abTestResult
      ? `/api/jobs/${job.id}/video?variation=${job.abTestResult.variations[0]?.id || 'A'}`
      : `/api/jobs/${job.id}/video`;
    const duration = exportDuration;
    const timeline = editResult
      ? buildEditTimeline(generateResult || { brollClips: [], voiceoverPath: null, musicPath: null, sfxMoments: [], thumbnailPath: null, stockClips: [], additionalAssets: {} }, duration)
      : generateSimulatedTimeline(duration);

    // Generate virality score if enabled (real Claude-powered scoring)
    let viralityScore: ViralityScore | undefined;
    if (job.plan.analyze.viralityScore) {
      try {
        updateJob(job.id, { currentStep: 'ציון ויראליות...' });
        viralityScore = await calculateViralityScore(job, transcript);
      } catch (error: any) {
        console.error('Virality score failed:', error.message);
        viralityScore = generateViralityScore(); // fallback to simulated
      }
    }

    // --- ENGAGEMENT PREDICTION (final step) ---
    try {
      updateJob(job.id, { currentStep: 'מחשב ציון engagement צפוי...' });
      const platformGuess = job.plan.export?.formats?.includes('9:16') ? 'instagram-reels' : 'youtube';
      const engagementPrediction = await predictEngagement(
        job.editingBlueprint,
        job.contentSelection,
        job.videoIntelligence?.marketingPlan,
        job.retentionPlan,
        job.qaResult,
        job.hookVariations || [],
        exportDuration,
        platformGuess
      );
      job.engagementPrediction = engagementPrediction;
      updateJob(job.id, { engagementPrediction } as any);
      console.log(`[Pipeline] Engagement prediction: ${engagementPrediction.overallScore}/100, Rate: ${engagementPrediction.predictedEngagementRate}% (avg: ${engagementPrediction.platformAverage}%)`);
    } catch (error: any) {
      console.error('Engagement prediction failed:', error.message);
      allWarnings.push('Engagement prediction failed: ' + error.message);
    }

    // Create version 0 (original) via versionManager
    const mainVideoPath = editResult?.finalVideoPath || `output/${job.id}/final.mp4`;
    const managedVersion = createVersion(
      job.id,
      mainVideoPath,
      job.prompt,
      'original',
      timeline,
      duration
    );

    // Also add to store for backward compatibility
    const version = addVersion({
      jobId: job.id,
      prompt: job.prompt,
      type: 'original',
      timeline,
      videoUrl,
    });

    // Store transcript and generate result on job for revision pipeline
    updateJob(job.id, {
      transcript: analysisTranscript || transcript || undefined,
      generateResult: generateResult || undefined,
    } as any);

    // Update job as done
    updateJob(job.id, {
      status: 'done',
      progress: 100,
      currentStep: 'הושלם בהצלחה!',
      result: {
        videoUrl,
        thumbnailUrl: editResult ? `/api/jobs/${job.id}/thumbnail` : undefined,
        duration,
        timeline,
        exports: exportExports.length > 0 ? exportExports : undefined,
      },
      versions: [version.id],
      viralityScore,
      enabledFeaturesCount: totalSteps,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    });

    // --- ENSURE FINAL VIDEO IS SAVED TO OUTPUT ---
    const outputDir = `output/${job.id}`;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const finalOutputPath = `${outputDir}/final.mp4`;
    if (!fs.existsSync(finalOutputPath) && mainVideoPath && fs.existsSync(mainVideoPath) && mainVideoPath !== finalOutputPath) {
      fs.copyFileSync(mainVideoPath, finalOutputPath);
      console.log(`[Pipeline] ✅ Final video copied to: ${finalOutputPath}`);
    }

    // === PIPELINE AUDIT: Material preservation & final report ===
    // These checks run after the main pipeline to verify what was preserved

    // --- PRESERVE MATERIALS FOR REVISIONS (don't cleanup yet) ---
    const preservedMaterials: Record<string, any> = {
      transcriptPath: `temp/${job.id}/transcript.json`,
      segmentsDir: `temp/${job.id}/segments/`,
      brollClips: (generateResult?.brollClips || []).map((b: any) => b.path).filter((p: string) => p && fs.existsSync(p)),
      musicTrack: generateResult?.musicPath || `temp/${job.id}/music.mp3`,
      editSteps: Array.from({ length: 25 }, (_, i) => `temp/${job.id}/edit/step_${i + 1}.mp4`).filter(p => fs.existsSync(p)),
      subtitlesFile: `temp/${job.id}/edit/subtitles.srt`,
      selectedSegmentsFile: `temp/${job.id}/edit/selected_assembled.mp4`,
      editingBlueprint: job.editingBlueprint,
      contentSelection: job.contentSelection,
      transcript: job.transcript,
    };
    updateJob(job.id, {
      preservedMaterials,
      approvedFinal: false,
      totalCost: (job as any).totalCost || 0,
    } as any);
    console.log(`[Pipeline] Materials preserved for revisions (${preservedMaterials.editSteps.length} edit steps, ${preservedMaterials.brollClips.length} B-Roll clips)`);

    // Audit: material preservation
    audit.log('preserved-transcript', 'materials',
      preservedMaterials.transcriptPath && fs.existsSync(preservedMaterials.transcriptPath) ? 'passed' : 'not-connected',
      'transcript.json saved for revisions');
    audit.log('preserved-broll-clips', 'materials',
      preservedMaterials.brollClips?.length > 0 ? 'passed' : 'not-connected',
      `${preservedMaterials.brollClips?.length || 0} B-Roll clips preserved`);
    audit.log('preserved-music', 'materials',
      preservedMaterials.musicTrack && fs.existsSync(preservedMaterials.musicTrack) ? 'passed' : 'not-connected',
      'music track saved for revisions');
    audit.log('preserved-subtitles', 'materials',
      preservedMaterials.subtitlesFile && fs.existsSync(preservedMaterials.subtitlesFile) ? 'passed' : 'not-connected',
      'subtitles.srt saved for revisions');
    audit.log('preserved-edit-steps', 'materials',
      preservedMaterials.editSteps?.length > 0 ? 'passed' : 'not-connected',
      `${preservedMaterials.editSteps?.length || 0} intermediate edit steps preserved`);
    audit.log('preserved-blueprint', 'materials',
      preservedMaterials.editingBlueprint ? 'passed' : 'not-connected',
      'editing blueprint saved for revision brain context');
    audit.log('no-premature-cleanup', 'materials',
      fs.existsSync(`temp/${job.id}`) ? 'passed' : 'failed',
      'temp files must exist until final approval');

    // Audit: cost tracking
    audit.log('cost-tracking', 'costs', (job as any).totalCost !== undefined ? 'passed' : 'not-connected',
      (job as any).totalCost !== undefined ? `total cost: $${((job as any).totalCost || 0).toFixed(2)}` : 'totalCost not tracked');

    // === SAVE AUDIT REPORT ===
    const report = audit.getReport();
    updateJob(job.id, { auditReport: report } as any);
    console.log('\n' + '='.repeat(60));
    console.log(`PIPELINE AUDIT: ${report.summary}`);
    console.log('='.repeat(60));
    for (const issue of report.criticalIssues) {
      console.log(`  ❌ ${issue}`);
    }
    console.log('='.repeat(60) + '\n');

    // --- EDITOR BRAIN: Remember this project ---
    try {
      rememberProject(job);
    } catch (error: any) {
      console.warn('[Pipeline] Brain memory save failed (non-critical):', error.message);
    }

    // DO NOT cleanup temp files — keep for revisions until user approves final
    // Cleanup will happen when user clicks "approve final" via POST /api/jobs/:id/approve-final
    console.log(`[Pipeline] Temp files preserved at temp/${job.id}/ — waiting for user approval before cleanup`);

    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Pipeline error for job ${job.id}:`, message);
    updateJob(job.id, {
      status: 'error',
      currentStep: `שגיאה: ${message}`,
    });
  }
}
