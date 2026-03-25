import type { ExecutionPlan } from '../types.js';

interface StepInfo {
  key: string;
  name: string;
  stage: string;
}

export function getEnabledSteps(plan: ExecutionPlan): StepInfo[] {
  const steps: StepInfo[] = [];

  // Stage 1: Ingest
  if (plan.ingest.transcribe) steps.push({ key: 'transcribe', name: 'תמלול אוטומטי', stage: 'ingest' });
  if (plan.ingest.multiCamSync) steps.push({ key: 'multiCamSync', name: 'סנכרון מולטי-קאם', stage: 'ingest' });
  if (plan.ingest.lipSyncVerify) steps.push({ key: 'lipSyncVerify', name: 'אימות סנכרון שפתיים', stage: 'ingest' });
  if (plan.ingest.footageClassification) steps.push({ key: 'footageClassification', name: 'סיווג חומרי גלם', stage: 'ingest' });
  if (plan.ingest.shotSelection) steps.push({ key: 'shotSelection', name: 'בחירת שוטים', stage: 'ingest' });
  if (plan.ingest.smartVariety) steps.push({ key: 'smartVariety', name: 'גיוון חכם', stage: 'ingest' });
  if (plan.ingest.speakerClassification) steps.push({ key: 'speakerClassification', name: 'זיהוי דוברים', stage: 'ingest' });

  // Stage 2: Clean
  if (plan.clean.removeSilences) steps.push({ key: 'removeSilences', name: 'הסרת שקטים', stage: 'clean' });
  if (plan.clean.removeFillerWords) steps.push({ key: 'removeFillerWords', name: 'הסרת מילות מילוי', stage: 'clean' });
  if (plan.clean.selectBestTake) steps.push({ key: 'selectBestTake', name: 'בחירת טייק מיטבי', stage: 'clean' });
  if (plan.clean.removeShakyBRoll) steps.push({ key: 'removeShakyBRoll', name: 'הסרת צילומי B-Roll רועדים', stage: 'clean' });

  // Stage 3: Analyze
  if (plan.analyze.hookDetection) steps.push({ key: 'hookDetection', name: 'זיהוי הוקים', stage: 'analyze' });
  if (plan.analyze.quoteDetection) steps.push({ key: 'quoteDetection', name: 'זיהוי ציטוטים', stage: 'analyze' });
  if (plan.analyze.scenePlanning) steps.push({ key: 'scenePlanning', name: 'תכנון סצנות', stage: 'analyze' });
  if (plan.analyze.brandVoice) steps.push({ key: 'brandVoice', name: 'ניתוח קול מותג', stage: 'analyze' });
  if (plan.analyze.mediaIntelligence) steps.push({ key: 'mediaIntelligence', name: 'אינטליגנציית מדיה', stage: 'analyze' });
  if (plan.analyze.viralityScore) steps.push({ key: 'viralityScore', name: 'ציון ויראליות', stage: 'analyze' });
  if (plan.analyze.aiScriptGenerator) steps.push({ key: 'aiScriptGenerator', name: 'יצירת תסריט AI', stage: 'analyze' });

  // Stage 4: Generate
  if (plan.generate.broll) steps.push({ key: 'broll', name: 'יצירת B-Roll', stage: 'generate' });
  if (plan.generate.brollFromTranscript) steps.push({ key: 'brollFromTranscript', name: 'B-Roll מתמלול', stage: 'generate' });
  if (plan.generate.videoToVideo) steps.push({ key: 'videoToVideo', name: 'וידאו לוידאו', stage: 'generate' });
  if (plan.generate.generativeExtend) steps.push({ key: 'generativeExtend', name: 'הרחבה גנרטיבית', stage: 'generate' });
  if (plan.generate.aiBackground) steps.push({ key: 'aiBackground', name: 'רקע AI', stage: 'generate' });
  if (plan.generate.aiVoiceover) steps.push({ key: 'aiVoiceover', name: 'קריינות AI', stage: 'generate' });
  if (plan.generate.voiceClone) steps.push({ key: 'voiceClone', name: 'שכפול קול', stage: 'generate' });
  if (plan.generate.talkingPhoto) steps.push({ key: 'talkingPhoto', name: 'תמונה מדברת', stage: 'generate' });
  if (plan.generate.thumbnail) steps.push({ key: 'thumbnail', name: 'יצירת תמונה ממוזערת', stage: 'generate' });
  if (plan.generate.stockFootageSearch) steps.push({ key: 'stockFootageSearch', name: 'חיפוש סטוק', stage: 'generate' });
  if (plan.generate.animateReplace) steps.push({ key: 'animateReplace', name: 'אנימציה והחלפה', stage: 'generate' });
  if (plan.generate.motionTransfer) steps.push({ key: 'motionTransfer', name: 'העברת תנועה', stage: 'generate' });
  if (plan.generate.faceSwap) steps.push({ key: 'faceSwap', name: 'החלפת פנים', stage: 'generate' });
  if (plan.generate.lipsync) steps.push({ key: 'lipsync', name: 'סנכרון שפתיים', stage: 'generate' });
  if (plan.generate.motionControl) steps.push({ key: 'motionControl', name: 'בקרת תנועה', stage: 'generate' });
  if (plan.generate.cameraControls) steps.push({ key: 'cameraControls', name: 'בקרת מצלמה', stage: 'generate' });
  if (plan.generate.multiShotSequences) steps.push({ key: 'multiShotSequences', name: 'רצפי מולטי-שוט', stage: 'generate' });
  if (plan.generate.firstLastFrame) steps.push({ key: 'firstLastFrame', name: 'פריים ראשון/אחרון', stage: 'generate' });
  if (plan.generate.musicGeneration) steps.push({ key: 'musicGeneration', name: 'יצירת מוזיקה', stage: 'generate' });
  if (plan.generate.musicStemSeparation) steps.push({ key: 'musicStemSeparation', name: 'הפרדת סטמים', stage: 'generate' });
  if (plan.generate.textToVFX) steps.push({ key: 'textToVFX', name: 'טקסט לאפקטים', stage: 'generate' });
  if (plan.generate.aiObjectAddReplace) steps.push({ key: 'aiObjectAddReplace', name: 'הוספת/החלפת אובייקטים', stage: 'generate' });
  if (plan.generate.visualDNA) steps.push({ key: 'visualDNA', name: 'DNA ויזואלי', stage: 'generate' });
  if (plan.generate.multiModelComparison) steps.push({ key: 'multiModelComparison', name: 'השוואת מודלים', stage: 'generate' });
  if (plan.generate.automatedModelSelection) steps.push({ key: 'automatedModelSelection', name: 'בחירת מודל אוטומטית', stage: 'generate' });
  if (plan.generate.aiTwin) steps.push({ key: 'aiTwin', name: 'אווטאר AI', stage: 'generate' });
  if (plan.generate.aiDubbing) steps.push({ key: 'aiDubbing', name: 'דיבוב AI', stage: 'generate' });
  if (plan.generate.aiSoundEffects) steps.push({ key: 'aiSoundEffects', name: 'אפקטי קול AI', stage: 'generate' });

  // Stage 5: Edit
  if (plan.edit.autoAngleSwitching) steps.push({ key: 'autoAngleSwitching', name: 'החלפת זוויות אוטומטית', stage: 'edit' });
  if (plan.edit.beatSyncCuts) steps.push({ key: 'beatSyncCuts', name: 'חיתוך לפי ביט', stage: 'edit' });
  if (plan.edit.musicSync) steps.push({ key: 'musicSync', name: 'סנכרון מוזיקה', stage: 'edit' });
  if (plan.edit.vfxAuto) steps.push({ key: 'vfxAuto', name: 'אפקטים ויזואליים אוטומטיים', stage: 'edit' });
  if (plan.edit.colorGrading) steps.push({ key: 'colorGrading', name: 'תיקון צבע', stage: 'edit' });
  if (plan.edit.colorMatchCameras) steps.push({ key: 'colorMatchCameras', name: 'התאמת צבע בין מצלמות', stage: 'edit' });
  if (plan.edit.skinToneCorrection) steps.push({ key: 'skinToneCorrection', name: 'תיקון גוון עור', stage: 'edit' });
  if (plan.edit.lightingEnhancement) steps.push({ key: 'lightingEnhancement', name: 'שיפור תאורה', stage: 'edit' });
  if (plan.edit.subtitles) steps.push({ key: 'subtitles', name: 'כתוביות', stage: 'edit' });
  if (plan.edit.lowerThirds) steps.push({ key: 'lowerThirds', name: 'שליש תחתון', stage: 'edit' });
  if (plan.edit.smartZooms) steps.push({ key: 'smartZooms', name: 'זומים חכמים', stage: 'edit' });
  if (plan.edit.eyeContactCorrection) steps.push({ key: 'eyeContactCorrection', name: 'תיקון קשר עין', stage: 'edit' });
  if (plan.edit.music) steps.push({ key: 'music', name: 'מוזיקת רקע', stage: 'edit' });
  if (plan.edit.autoDucking) steps.push({ key: 'autoDucking', name: 'הנמכת מוזיקה אוטומטית', stage: 'edit' });
  if (plan.edit.enhanceSpeech) steps.push({ key: 'enhanceSpeech', name: 'שיפור דיבור', stage: 'edit' });
  if (plan.edit.noiseReduction) steps.push({ key: 'noiseReduction', name: 'הפחתת רעש', stage: 'edit' });
  if (plan.edit.presenterSeparation) steps.push({ key: 'presenterSeparation', name: 'הפרדת מציג', stage: 'edit' });
  if (plan.edit.backgroundBlur) steps.push({ key: 'backgroundBlur', name: 'טשטוש רקע', stage: 'edit' });
  if (plan.edit.objectMasking) steps.push({ key: 'objectMasking', name: 'מיסוך אובייקטים', stage: 'edit' });
  if (plan.edit.upscaling) steps.push({ key: 'upscaling', name: 'שדרוג רזולוציה', stage: 'edit' });
  if (plan.edit.logoWatermark) steps.push({ key: 'logoWatermark', name: 'לוגו/ווטרמארק', stage: 'edit' });
  if (plan.edit.cta) steps.push({ key: 'cta', name: 'קריאה לפעולה', stage: 'edit' });
  if (plan.edit.effectsLibrary) steps.push({ key: 'effectsLibrary', name: 'ספריית אפקטים', stage: 'edit' });
  if (plan.edit.kineticTypography) steps.push({ key: 'kineticTypography', name: 'טיפוגרפיה קינטית', stage: 'edit' });
  if (plan.edit.photoMotion) steps.push({ key: 'photoMotion', name: 'תנועת תמונות', stage: 'edit' });

  // Stage 6: Export
  steps.push({ key: 'exportRender', name: 'רינדור סופי', stage: 'export' });
  if (plan.export.aiReframe) steps.push({ key: 'aiReframe', name: 'מסגור מחדש AI', stage: 'export' });
  if (plan.export.generateThumbnail) steps.push({ key: 'generateThumbnail', name: 'יצירת תמונה ממוזערת', stage: 'export' });
  if (plan.export.highBitrate4K) steps.push({ key: 'highBitrate4K', name: 'ייצוא 4K', stage: 'export' });
  if (plan.export.customTheme) steps.push({ key: 'customTheme', name: 'ערכת נושא מותאמת', stage: 'export' });

  // Stage 7: Templates
  if (plan.templates.brandKit) steps.push({ key: 'brandKit', name: 'ערכת מותג', stage: 'templates' });
  if (plan.templates.ecommerceTemplate) steps.push({ key: 'ecommerceTemplate', name: 'תבנית מסחר אלקטרוני', stage: 'templates' });
  if (plan.templates.digitalSocialTemplate) steps.push({ key: 'digitalSocialTemplate', name: 'תבנית רשתות חברתיות', stage: 'templates' });
  if (plan.templates.multiPageStories) steps.push({ key: 'multiPageStories', name: 'סטוריז מרובי עמודים', stage: 'templates' });
  if (plan.templates.sourceDocumentImport) steps.push({ key: 'sourceDocumentImport', name: 'ייבוא מסמך מקור', stage: 'templates' });
  if (plan.templates.trendingSounds) steps.push({ key: 'trendingSounds', name: 'צלילים טרנדיים', stage: 'templates' });

  return steps;
}

export function calculateProgress(completedSteps: number, totalSteps: number): number {
  if (totalSteps === 0) return 100;
  return Math.round((completedSteps / totalSteps) * 100);
}
