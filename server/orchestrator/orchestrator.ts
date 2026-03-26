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
import { analyzeVideoIntelligence, applyIntelligenceToPlan } from '../services/videoIntelligence.js';
import { runFreshEyesReview, autoApplyFixes } from '../services/freshEyesReview.js';
import { selectBestContent } from '../services/contentSelector.js';
import { runQualityCheck } from '../services/qualityCheck.js';
import { generateHookVariations } from '../services/hookGenerator.js';
import { generateABVariations } from '../services/abTesting.js';
import { analyzeRetention } from '../services/retentionOptimizer.js';
import { planLoop, applyLoop } from '../services/loopOptimizer.js';
import { planThumbnail, generateThumbnail } from '../services/thumbnailOptimizer.js';
import { planMultiPlatformCuts } from '../services/multiPlatformCutter.js';
import { diagnoseFootage, autoFixFootage } from '../services/footageDoctor.js';
import { getExportCommand, EXPORT_PRESETS } from '../services/smartExporter.js';
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

// startJob: generates plan + preview, then waits for user approval
export async function startJob(job: Job): Promise<void> {
  try {
    // Step 1: Brain already generated plan (done in routes/jobs.ts)
    // Step 2: Generate preview (NOT render — just plan + frames)
    updateJob(job.id, {
      status: 'planning',
      currentStep: 'מכין תצוגה מקדימה...',
      progress: 5,
    });

    const plan = job.plan;
    if (!plan) {
      throw new Error('No execution plan found');
    }

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

export async function runPipeline(job: Job): Promise<void> {
  try {
    // Phase 1: Planning
    updateJob(job.id, {
      status: 'planning',
      currentStep: 'המוח מתכנן את העריכה...',
      progress: 2,
    });
    await delay(1000);

    if (!job.plan) {
      throw new Error('No execution plan found');
    }

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
          updateJob(job.id, { currentStep: 'עריכה והרכבה...' });
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
            updateJob(job.id, { currentStep: 'ייצוא פורמטים...' });
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

      // Clean up temp files
      try {
        cleanupJobTemp(job.id);
      } catch (error: any) {
        console.error('Cleanup failed:', error.message);
      }

      clearTimeout(timeout);
      return;
    }

    // === RAW MODE (existing pipeline) ===

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
      } catch (error: any) {
        console.warn('[Pipeline] Footage doctor failed (non-critical):', error.message);
        allWarnings.push(`Footage diagnosis skipped: ${error.message}`);
      }
    }

    // --- REAL INGEST AGENT ---
    const hasIngestSteps =
      job.plan.ingest.transcribe ||
      job.plan.ingest.multiCamSync ||
      job.plan.ingest.lipSyncVerify ||
      job.plan.ingest.footageClassification ||
      job.plan.ingest.shotSelection ||
      job.plan.ingest.smartVariety ||
      job.plan.ingest.speakerClassification;

    let transcript: TranscriptResult | null = null;

    if (hasIngestSteps) {
      console.log(`[Pipeline] Running real ingest agent for job ${job.id}`);
      const ingestResult = await runIngestAgent(job, job.plan);
      transcript = ingestResult.transcript;
      allWarnings.push(...ingestResult.warnings);

      // Count completed ingest steps
      const ingestStepCount = steps.filter(s => s.stage === 'ingest').length;
      completedSteps += ingestStepCount;
      updateJob(job.id, {
        progress: calculateProgress(completedSteps, totalSteps),
      });
    }

    // --- PRESENTER DETECTION + SPEAKER VERIFICATION (3 Layers) ---
    let presenterTranscript: TranscriptResult | null = null;

    if (transcript && job.files.length > 0) {
      try {
        // Step 1: Basic presenter detection (Layer 1 audio + Layer 2 visual baseline)
        updateJob(job.id, { currentStep: 'מזהה את הפרזנטור...' });
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
      }
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
          targetDur
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
      } catch (error: any) {
        console.error('Content selection failed:', error.message);
        allWarnings.push('Content selection failed: ' + error.message);
      }
    }

    // --- CONTENT ANALYSIS (Smart Brain Editor) ---
    if (analysisTranscript && job.files.length > 0) {
      try {
        updateJob(job.id, { currentStep: 'מנתח תוכן ובוחר קטעים...' });
        console.log(`[Pipeline] Running content analysis for job ${job.id}`);

        const targetDur = job.plan.export.targetDuration === 'auto'
          ? undefined
          : job.plan.export.targetDuration as number;

        const contentAnalysis = await analyzeContent(
          job.files[0].path,
          analysisTranscript,
          targetDur
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

    // --- REAL GENERATE AGENT ---
    let generateResult: GenerateResult | null = null;

    if (hasAnyGenerateFeature(job.plan)) {
      console.log(`[Pipeline] Running real generate agent for job ${job.id}`);
      generateResult = await runGenerateAgent(job, job.plan, analysisTranscript || transcript);

      // Count completed generate steps
      const generateStepCount = steps.filter(s => s.stage === 'generate' || s.stage === 'analyze').length;
      completedSteps += generateStepCount;
      updateJob(job.id, {
        progress: calculateProgress(completedSteps, totalSteps),
      });
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
        updateJob(job.id, { currentStep: 'סקירת "עיניים רעננות" — בדיקה אחרונה...' });

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

    // --- REAL EDIT AGENT ---
    const hasEditSteps = steps.some(s => s.stage === 'edit' || s.stage === 'export');

    let editResult: EditResult | null = null;

    if (hasEditSteps) {
      console.log(`[Pipeline] Running real edit agent for job ${job.id}`);
      updateJob(job.id, { currentStep: 'עריכה והרכבה...' });

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

    // --- EXPORT AGENT ---
    let exportDuration = editResult?.duration || randomBetween(30, 180);
    let exportExports: Array<{ format: string; url: string }> = [];

    if (editResult) {
      try {
        console.log(`[Pipeline] Running export agent for job ${job.id}`);
        updateJob(job.id, { currentStep: 'ייצוא פורמטים...' });

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
        const { PLATFORM_CONTENT_STRATEGY_PROMPT: strategyPrompt } = await import('../services/editingRules.js');

        const platforms = job.plan.export.formats.map((f: string) =>
          f === '9:16' ? 'tiktok,instagram-reels' : f === '1:1' ? 'linkedin' : 'youtube'
        ).join(',').split(',');

        const uniquePlatforms = [...new Set(platforms)];
        const category = job.videoIntelligence?.concept?.category || 'talking-head';
        const prompt = job.prompt;

        const strategyResponse = await askClaudeForStrategy(
          strategyPrompt,
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
          'You plan ad localization for international markets. Return ONLY valid JSON.',
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
        const qaResult = await runQualityCheck(finalVideoPath, exportDuration, job.plan);
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

    // Phase 3: Finalize
    updateJob(job.id, {
      currentStep: 'מסיים עיבוד...',
      progress: 95,
    });
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

    // Clean up temp files
    try {
      cleanupJobTemp(job.id);
    } catch (error: any) {
      console.error('Cleanup failed:', error.message);
    }

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
