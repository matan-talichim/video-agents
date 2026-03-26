import { runFFmpeg, extractFrame, getVideoDuration } from './ffmpeg.js';
import { askClaude } from './claude.js';
import type {
  Job,
  ExecutionPlan,
  PreviewData,
  KeyFrame,
  StoryboardScene,
  PreviewTimeline,
  PreviewSegment,
  BRollPreviewItem,
  ScriptPreview,
} from '../types.js';
import fs from 'fs';
import crypto from 'crypto';

export async function generatePreview(job: Job, plan: ExecutionPlan): Promise<PreviewData> {
  console.log(`[Preview] Generating preview for job ${job.id}...`);
  const startTime = Date.now();

  const previewDir = `temp/${job.id}/preview`;
  fs.mkdirSync(previewDir, { recursive: true });

  // === 1. EXTRACT KEY FRAMES (fast — 2-5 seconds) ===
  let keyFrames: KeyFrame[] = [];
  const videoFile = job.files.find(f => f.type.startsWith('video/'));
  let videoDuration = 0;

  if (videoFile) {
    try {
      videoDuration = await getVideoDuration(videoFile.path);
    } catch {
      videoDuration = 0;
    }

    if (videoDuration > 0) {
      const frameCount = Math.min(20, Math.ceil(videoDuration / 3));

      for (let i = 0; i < frameCount; i++) {
        const timestamp = (videoDuration / (frameCount + 1)) * (i + 1);
        const framePath = `${previewDir}/frame_${i}.jpg`;

        try {
          await runFFmpeg(`ffmpeg -i "${videoFile.path}" -ss ${timestamp} -vframes 1 -q:v 4 -vf "scale=480:-1" -y "${framePath}"`);
          keyFrames.push({
            timestamp,
            imagePath: framePath,
            label: getFrameLabel(timestamp, videoDuration, plan),
          });
        } catch {
          // Skip failed frame extractions
        }
      }
    }
  }

  // === 2. GENERATE STORYBOARD (Claude analysis — 5-10 seconds) ===
  let storyboard: StoryboardScene[] = [];

  if (job.mode === 'prompt-only') {
    try {
      const sceneResponse = await askClaude(
        'You create video storyboards in Hebrew. Return ONLY valid JSON, no explanations.',
        `Create a storyboard for this video:\nPrompt: "${job.prompt}"\nDuration: ${plan.export.targetDuration === 'auto' ? 60 : plan.export.targetDuration} seconds\nStyle: ${plan.edit.editStyle || 'auto'}\n\nReturn JSON array:\n[{ "sceneNumber": 1, "title": "Hook", "description": "תיאור קצר בעברית", "duration": 3, "elements": ["B-Roll", "כתוביות"] }]\n\nMax 6-8 scenes.`
      );

      const jsonStr = sceneResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const scenes = JSON.parse(jsonStr);
      storyboard = scenes.map((s: any, i: number) => ({
        ...s,
        framePath: keyFrames[i]?.imagePath || null,
      }));
    } catch {
      storyboard = [
        { sceneNumber: 1, title: 'פתיחה', description: 'Hook — תופס תשומת לב', duration: 3, elements: ['B-Roll'], framePath: keyFrames[0]?.imagePath || null },
        { sceneNumber: 2, title: 'תוכן עיקרי', description: job.prompt.slice(0, 80), duration: 20, elements: ['B-Roll', 'כתוביות'], framePath: keyFrames[Math.floor(keyFrames.length / 2)]?.imagePath || null },
        { sceneNumber: 3, title: 'סיום', description: 'CTA + סיכום', duration: 5, elements: ['CTA', 'לוגו'], framePath: keyFrames[keyFrames.length - 1]?.imagePath || null },
      ];
    }
  } else {
    try {
      const sceneResponse = await askClaude(
        'You create video editing storyboards in Hebrew. Return ONLY valid JSON, no explanations.',
        `Plan an edit for this video:\nPrompt: "${job.prompt}"\nVideo duration: ${videoDuration}s\nFiles: ${job.files.map(f => f.name).join(', ')}\nPacing: ${plan.edit.pacing}\n\nReturn JSON array:\n[{ "sceneNumber": 1, "title": "Hook", "description": "מה קורה בקטע הזה", "duration": 3, "elements": ["Original footage", "כתוביות"] }]\n\nMax 6-8 scenes.`
      );

      const jsonStr = sceneResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const scenes = JSON.parse(jsonStr);
      storyboard = scenes.map((s: any, i: number) => ({
        ...s,
        framePath: keyFrames[Math.min(i, keyFrames.length - 1)]?.imagePath || null,
      }));
    } catch {
      storyboard = createDefaultStoryboard(videoDuration, keyFrames, plan);
    }
  }

  // === 3. BUILD TIMELINE ===
  const targetDuration = typeof plan.export.targetDuration === 'number'
    ? plan.export.targetDuration
    : videoDuration || 60;

  const timeline = buildPreviewTimeline(targetDuration, plan);

  // === 4. GET B-ROLL PROMPTS ===
  let brollPrompts: BRollPreviewItem[] = [];

  if (plan.generate.brollFromTranscript || plan.generate.broll) {
    try {
      const brollResponse = await askClaude(
        'You plan B-Roll for video editing like a Hollywood cinematographer. Every prompt must include camera movement, shot type, lighting, depth of field, style, and negative prompts. NEVER write vague prompts. Return ONLY valid JSON, no explanations.',
        `Suggest 3-5 B-Roll clips for this video:\nPrompt: "${job.prompt}"\nDuration: ${targetDuration}s\nStyle: ${plan.edit.editStyle || plan.edit.colorGradingStyle || 'cinematic'}\n\nWrite each prompt as a cinematic director would. Include camera movement (dolly/drone/tracking), shot type (wide/close-up), lighting (golden hour/studio), and negative prompts.\n\nReturn JSON:\n[{ "timestamp": 10, "duration": 4, "prompt": "Slow aerial drone shot descending toward..., golden hour warm sunlight, cinematic 4K, shallow depth of field. No text, no watermark.", "reason": "Speaker mentions..." }]`
      );

      const jsonStr = brollResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      brollPrompts = JSON.parse(jsonStr);
    } catch {
      // No B-Roll prompts available
    }
  }

  // === 5. GET SCRIPT (prompt-only) ===
  let script: ScriptPreview[] | undefined;

  if (job.mode === 'prompt-only' && plan.analyze.aiScriptGenerator) {
    try {
      const scriptResponse = await askClaude(
        'You write video scripts in Hebrew. Return ONLY valid JSON, no explanations.',
        `Write a brief script outline for: "${job.prompt}"\nDuration: ${targetDuration}s\n\nReturn JSON:\n[{ "section": "hook", "text": "טקסט קצר", "duration": 3, "visualDescription": "מה רואים" }]`
      );

      const jsonStr = scriptResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      script = JSON.parse(jsonStr);
    } catch {
      // No script available
    }
  }

  // === 6. CALCULATE ESTIMATES ===
  const enabledFeatures = getEnabledFeatureNames(plan);
  const estimatedRenderTime = estimateRenderTime(enabledFeatures.length, targetDuration);
  const estimatedCost = estimateCostRange(plan);
  const viralityEstimate = plan.analyze.viralityScore
    ? Math.floor(60 + Math.random() * 25)
    : undefined;

  // === BUILD PREVIEW DATA ===
  const preview: PreviewData = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    keyFrames,
    storyboard,
    timeline,
    enabledFeatures,
    enabledFeaturesCount: enabledFeatures.length,
    totalFeatures: 95,
    subtitlePreview: plan.edit.subtitles ? 'כתוביות מונפשות יתווספו אוטומטית' : undefined,
    brollPrompts,
    musicMood: plan.generate.musicMood || (plan.edit.music ? 'auto' : undefined),
    voiceoverStyle: plan.generate.voiceoverStyle,
    editStyle: plan.edit.editStyle,
    estimatedDuration: targetDuration,
    estimatedRenderTime,
    estimatedCost,
    viralityEstimate,
    script,
    plan,
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Preview] Generated in ${elapsed}s — ${enabledFeatures.length} features, ${storyboard.length} scenes`);

  return preview;
}

// Update preview based on user's change request
export async function updatePreview(
  job: Job,
  currentPreview: PreviewData,
  changeRequest: string
): Promise<PreviewData> {
  console.log(`[Preview] Updating preview: "${changeRequest.slice(0, 50)}..."`);

  // Ask Claude to modify the plan based on the change request
  let updatedPlan: ExecutionPlan;
  try {
    const response = await askClaude(
      'You modify video editing plans based on user feedback. Return ONLY the updated JSON plan, no explanations.',
      `Current plan:\n${JSON.stringify(currentPreview.plan, null, 2)}\n\nUser change request: "${changeRequest}"\n\nModify the ExecutionPlan to reflect the user's request. Return the COMPLETE updated plan as JSON. Only change what the user asked for — keep everything else the same.\n\nReturn ONLY the JSON, no explanations.`
    );

    const jsonStr = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    updatedPlan = JSON.parse(jsonStr);
  } catch {
    // If parsing fails, apply simple keyword changes
    updatedPlan = applySimpleChange(currentPreview.plan, changeRequest);
  }

  // Regenerate preview with updated plan
  const newPreview = await generatePreview(job, updatedPlan);
  newPreview.changeRequest = changeRequest;

  return newPreview;
}

// === Helpers ===

function getFrameLabel(timestamp: number, duration: number, plan: ExecutionPlan): string {
  const percent = timestamp / duration;
  if (percent < 0.05) return 'פתיחה';
  if (percent < 0.15) return 'Hook';
  if (percent > 0.9) return 'סיום';
  if (percent > 0.8) return 'CTA';
  return 'תוכן';
}

function getEnabledFeatureNames(plan: ExecutionPlan): string[] {
  const features: string[] = [];

  // Ingest
  if (plan.ingest.transcribe) features.push('תמלול עברית');
  if (plan.ingest.multiCamSync) features.push('סנכרון מצלמות');
  if (plan.ingest.footageClassification) features.push('סיווג footage');
  if (plan.ingest.shotSelection) features.push('בחירת שוטים חכמה');
  if (plan.ingest.speakerClassification) features.push('זיהוי דוברים');

  // Clean
  if (plan.clean.removeSilences) features.push('הסרת שתיקות');
  if (plan.clean.removeFillerWords) features.push('הסרת מילות מילוי');
  if (plan.clean.selectBestTake) features.push('בחירת Best Take');
  if (plan.clean.removeShakyBRoll) features.push('סינון B-Roll רועד');

  // Analyze
  if (plan.analyze.hookDetection) features.push('זיהוי Hook');
  if (plan.analyze.viralityScore) features.push('ציון ויראליות');
  if (plan.analyze.aiScriptGenerator) features.push('יצירת תסריט AI');
  if (plan.analyze.scenePlanning) features.push('תכנון סצנות');

  // Generate
  if (plan.generate.broll) features.push('יצירת B-Roll AI');
  if (plan.generate.aiVoiceover) features.push('קריינות AI');
  if (plan.generate.voiceClone) features.push('שכפול קול');
  if (plan.generate.musicGeneration) features.push('יצירת מוזיקה AI');
  if (plan.generate.aiSoundEffects) features.push('אפקטי סאונד AI');
  if (plan.generate.aiTwin) features.push('אווטאר AI');
  if (plan.generate.aiDubbing) features.push('דיבוב ותרגום');
  if (plan.generate.thumbnail) features.push('תמונה ממוזערת');
  if (plan.generate.stockFootageSearch) features.push('חיפוש stock');
  if (plan.generate.faceSwap) features.push('החלפת פנים');
  if (plan.generate.lipsync) features.push('סנכרון שפתיים');
  if (plan.generate.eyeContactCorrection) features.push('תיקון קשר עין');
  if (plan.generate.upscaling) features.push('שדרוג 4K');

  // Edit
  if (plan.edit.beatSyncCuts) features.push('חיתוך לפי ביט');
  if (plan.edit.musicSync) features.push('סנכרון מוזיקה מלא');
  if (plan.edit.colorGrading) features.push('עיבוד צבע');
  if (plan.edit.subtitles) features.push('כתוביות מונפשות');
  if (plan.edit.lowerThirds) features.push('שם ותפקיד');
  if (plan.edit.smartZooms) features.push('זומים חכמים');
  if (plan.edit.backgroundBlur) features.push('טשטוש רקע');
  if (plan.edit.music) features.push('מוזיקת רקע');
  if (plan.edit.enhanceSpeech) features.push('שיפור דיבור');
  if (plan.edit.noiseReduction) features.push('הפחתת רעש');
  if (plan.edit.logoWatermark) features.push('לוגו');
  if (plan.edit.cta) features.push('CTA');
  if (plan.edit.kineticTypography) features.push('טקסט מונפש');
  if (plan.edit.photoMotion) features.push('אפקט תנועה על תמונות');

  // Templates
  if (plan.templates.brandKit) features.push('ערכת מותג');
  if (plan.templates.ecommerceTemplate) features.push('תבנית e-commerce');
  if (plan.templates.multiPageStories) features.push('סטורי מרובה דפים');
  if (plan.templates.sourceDocumentImport) features.push('ייבוא מסמך');
  if (plan.templates.trendingSounds) features.push('סאונדים טרנדיים');

  return features;
}

function buildPreviewTimeline(duration: number, plan: ExecutionPlan): PreviewTimeline {
  const segments: PreviewSegment[] = [];

  // Base: original footage
  segments.push({
    start: 0, end: duration,
    type: 'original', label: 'Footage מקורי', color: '#3B82F6',
  });

  // Subtitles layer
  if (plan.edit.subtitles) {
    segments.push({
      start: 0, end: duration,
      type: 'subtitle', label: 'כתוביות', color: '#A78BFA',
    });
  }

  // Music layer
  if (plan.edit.music) {
    segments.push({
      start: 0, end: duration,
      type: 'music', label: `מוזיקה (${plan.generate.musicMood || 'auto'})`, color: '#14B8A6',
    });
  }

  // CTA
  if (plan.edit.cta) {
    segments.push({
      start: Math.max(0, duration - 5), end: duration,
      type: 'cta', label: plan.edit.ctaText || 'CTA', color: '#F59E0B',
    });
  }

  // Lower third
  if (plan.edit.lowerThirds) {
    segments.push({
      start: 2, end: 6,
      type: 'lower-third', label: plan.edit.lowerThirdsName || 'שם ותפקיד', color: '#8B5CF6',
    });
  }

  return { totalDuration: duration, segments };
}

function createDefaultStoryboard(duration: number, keyFrames: KeyFrame[], plan: ExecutionPlan): StoryboardScene[] {
  const scenes: StoryboardScene[] = [];
  const sceneCount = Math.min(6, Math.max(3, Math.ceil(duration / 10)));
  const sceneDuration = duration / sceneCount;

  for (let i = 0; i < sceneCount; i++) {
    const elements: string[] = [];
    if (i === 0 && plan.analyze.hookDetection) elements.push('Hook');
    if (plan.edit.subtitles) elements.push('כתוביות');
    if (plan.generate.broll && i > 0 && i < sceneCount - 1) elements.push('B-Roll');
    if (i === sceneCount - 1 && plan.edit.cta) elements.push('CTA');
    if (i === 0 && plan.edit.lowerThirds) elements.push('שם ותפקיד');

    scenes.push({
      sceneNumber: i + 1,
      title: i === 0 ? 'פתיחה' : i === sceneCount - 1 ? 'סיום' : `קטע ${i + 1}`,
      description: i === 0 ? 'Hook — תופס תשומת לב' : i === sceneCount - 1 ? 'CTA + סיכום' : 'תוכן עיקרי',
      framePath: keyFrames[Math.min(i * 2, keyFrames.length - 1)]?.imagePath || null,
      duration: sceneDuration,
      elements,
    });
  }

  return scenes;
}

function estimateRenderTime(featureCount: number, duration: number): string {
  const baseMinutes = Math.ceil(duration / 30);
  const featureMultiplier = 1 + (featureCount / 95) * 2;
  const estimated = Math.ceil(baseMinutes * featureMultiplier);
  return `~${estimated} דקות`;
}

function estimateCostRange(plan: ExecutionPlan): string {
  let minCost = 0.01;
  let maxCost = 0.05;

  if (plan.generate.broll) { minCost += 0.10; maxCost += 0.50; }
  if (plan.generate.aiVoiceover) { minCost += 0.05; maxCost += 0.30; }
  if (plan.generate.musicGeneration) { minCost += 0.05; maxCost += 0.10; }
  if (plan.generate.voiceClone) { minCost += 0.10; maxCost += 0.20; }
  if (plan.generate.aiDubbing) { minCost += 0.20; maxCost += 0.60; }
  if (plan.generate.aiTwin) { minCost += 0.15; maxCost += 0.40; }
  if (plan.generate.faceSwap) { minCost += 0.05; maxCost += 0.15; }
  if (plan.edit.upscaling) { minCost += 0.05; maxCost += 0.15; }

  // POV walkthrough from photos (3-5 AI video clips)
  const imageCount = 0; // will be determined at runtime
  if (plan.generate.broll && imageCount >= 2) { minCost += 0.40; maxCost += 1.20; }

  // Localization per language
  if (plan.generate.aiDubbing && plan.generate.aiDubbingTargetLanguage) {
    minCost += 0.30; maxCost += 0.60;
  }

  return `$${minCost.toFixed(2)}-$${maxCost.toFixed(2)}`;
}

function applySimpleChange(plan: ExecutionPlan, request: string): ExecutionPlan {
  const updated = JSON.parse(JSON.stringify(plan));
  const lower = request.toLowerCase();

  if (lower.includes('מוזיקה') && lower.includes('אנרגטי')) updated.generate.musicMood = 'energetic';
  if (lower.includes('מוזיקה') && lower.includes('רגוע')) updated.generate.musicMood = 'calm';
  if (lower.includes('מוזיקה') && lower.includes('דרמטי')) updated.generate.musicMood = 'dramatic';
  if (lower.includes('בלי מוזיקה')) { updated.edit.music = false; updated.generate.musicGeneration = false; }
  if (lower.includes('בלי כתוביות')) updated.edit.subtitles = false;
  if (lower.includes('הוסף כתוביות')) updated.edit.subtitles = true;
  if (lower.includes('בלי לוגו')) updated.edit.logoWatermark = false;
  if (lower.includes('מהיר')) updated.edit.pacing = 'fast';
  if (lower.includes('רגוע') || lower.includes('איטי')) updated.edit.pacing = 'calm';
  if (lower.includes('סינמטי')) updated.edit.colorGradingStyle = 'cinematic';
  if (lower.includes('בלי b-roll') || lower.includes('בלי בירול')) updated.generate.broll = false;

  return updated;
}
