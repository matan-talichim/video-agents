import type { Job, Segment, ViralityScore } from '../types.js';
import { updateJob } from '../store/jobStore.js';
import { addVersion } from '../store/versionStore.js';
import { getEnabledSteps, calculateProgress } from './progressTracker.js';

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

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = calculateProgress(i, totalSteps);

      updateJob(job.id, {
        currentStep: `${step.name}...`,
        progress,
      });

      // Simulate processing time — varies by stage
      const delayMs = step.stage === 'generate' ? randomBetween(1000, 2000) :
                      step.stage === 'edit' ? randomBetween(800, 1500) :
                      randomBetween(500, 1000);
      await delay(delayMs);
    }

    // Phase 3: Finalize
    updateJob(job.id, {
      currentStep: 'מסיים עיבוד...',
      progress: 95,
    });
    await delay(500);

    const duration = randomBetween(30, 180);
    const timeline = generateSimulatedTimeline(duration);
    const videoUrl = `/api/jobs/${job.id}/video`;

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
        thumbnailUrl: `/api/jobs/${job.id}/thumbnail`,
        duration,
        timeline,
      },
      versions: [version.id],
      viralityScore,
      enabledFeaturesCount: totalSteps,
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
