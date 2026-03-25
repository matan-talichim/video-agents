import type { Job, Segment, ViralityScore, TranscriptResult, GenerateResult, EditResult } from '../types.js';
import { updateJob } from '../store/jobStore.js';
import { addVersion } from '../store/versionStore.js';
import { getEnabledSteps, calculateProgress } from './progressTracker.js';
import { runIngestAgent } from '../agents/ingest.js';
import { runCleanAgent } from '../agents/clean.js';
import { runGenerateAgent, hasAnyGenerateFeature } from '../agents/generate.js';
import { runEditAgent, buildEditTimeline } from '../agents/edit.js';

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

    // Phase 2: Processing
    updateJob(job.id, { status: 'processing' });

    const steps = getEnabledSteps(job.plan);
    const totalSteps = steps.length;
    let completedSteps = 0;
    const allWarnings: string[] = [];

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

    // --- REAL CLEAN AGENT ---
    const hasCleanSteps =
      job.plan.clean.removeSilences ||
      job.plan.clean.removeFillerWords ||
      job.plan.clean.selectBestTake ||
      job.plan.clean.removeShakyBRoll;

    if (hasCleanSteps) {
      console.log(`[Pipeline] Running real clean agent for job ${job.id}`);
      const cleanResult = await runCleanAgent(job, job.plan, transcript);
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

    // --- REAL GENERATE AGENT ---
    let generateResult: GenerateResult | null = null;

    if (hasAnyGenerateFeature(job.plan)) {
      console.log(`[Pipeline] Running real generate agent for job ${job.id}`);
      generateResult = await runGenerateAgent(job, job.plan, transcript);

      // Count completed generate steps
      const generateStepCount = steps.filter(s => s.stage === 'generate' || s.stage === 'analyze').length;
      completedSteps += generateStepCount;
      updateJob(job.id, {
        progress: calculateProgress(completedSteps, totalSteps),
      });
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
        transcript
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

    // Phase 3: Finalize
    updateJob(job.id, {
      currentStep: 'מסיים עיבוד...',
      progress: 95,
    });
    await delay(500);

    const videoUrl = `/api/jobs/${job.id}/video`;
    const duration = editResult?.duration || randomBetween(30, 180);
    const timeline = editResult
      ? buildEditTimeline(generateResult || { brollClips: [], voiceoverPath: null, musicPath: null, sfxMoments: [], thumbnailPath: null, stockClips: [], additionalAssets: {} }, duration)
      : generateSimulatedTimeline(duration);

    // Generate virality score if enabled
    const viralityScore = job.plan.analyze.viralityScore
      ? generateViralityScore()
      : undefined;

    // Create version
    const version = addVersion({
      jobId: job.id,
      prompt: job.prompt,
      type: 'original',
      timeline,
      videoUrl,
    });

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
      },
      versions: [version.id],
      viralityScore,
      enabledFeaturesCount: totalSteps,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Pipeline error for job ${job.id}:`, message);
    updateJob(job.id, {
      status: 'error',
      currentStep: `שגיאה: ${message}`,
    });
  }
}
