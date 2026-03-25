import type { ExecutionPlan, BRollModel } from '../types.js';

const VALID_BROLL_MODELS: BRollModel[] = ['veo-3.1-fast', 'sora-2', 'kling-v2.5-turbo', 'wan-2.5', 'seedance-1.5-pro'];
const VALID_VOICEOVER_STYLES = ['narrator', 'educator', 'persuader', 'coach', 'motivator'];
const VALID_EDIT_STYLES = ['cinematic', 'energetic', 'minimal', 'trendy'];
const VALID_PACING = ['fast', 'normal', 'calm'];
const VALID_BEAT_MODES = ['kicks', 'drums', 'combined'];
const VALID_SUBTITLE_STYLES = ['animated', 'simple', 'karaoke'];
const VALID_SUBTITLE_POSITIONS = ['bottom', 'center', 'smart'];
const VALID_ZOOM_STYLES = ['subtle', 'punch', 'ken-burns'];
const VALID_COLOR_GRADING_STYLES = ['cinematic', 'bright', 'moody', 'vintage', 'clean'];
const VALID_MUSIC_MOODS = ['energetic', 'calm', 'dramatic', 'business', 'trendy'];
const VALID_FORMATS = ['16:9', '9:16', '1:1'];
const VALID_LANGUAGE_CODES = ['en', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi', 'tr', 'nl', 'pl', 'sv', 'he'];

export function validatePlan(raw: unknown, fallbackModel: BRollModel): { valid: boolean; plan: ExecutionPlan; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, plan: buildSafeDefault(fallbackModel), errors: ['Plan is not an object'] };
  }

  const p = raw as Record<string, unknown>;

  try {
    // Validate mode
    const mode = p.mode === 'raw' || p.mode === 'prompt-only' ? p.mode : (() => { errors.push('Invalid mode'); return 'raw' as const; })();

    // Validate ingest
    const ingestRaw = (p.ingest || {}) as Record<string, unknown>;
    const ingest = {
      transcribe: toBool(ingestRaw.transcribe),
      multiCamSync: toBool(ingestRaw.multiCamSync),
      lipSyncVerify: toBool(ingestRaw.lipSyncVerify),
      footageClassification: toBool(ingestRaw.footageClassification),
      shotSelection: toBool(ingestRaw.shotSelection),
      smartVariety: toBool(ingestRaw.smartVariety),
      speakerClassification: toBool(ingestRaw.speakerClassification),
    };

    // Validate clean
    const cleanRaw = (p.clean || {}) as Record<string, unknown>;
    const silenceThreshold = toNum(cleanRaw.silenceThreshold, 0.5, 0.1, 2.0);
    const clean = {
      removeSilences: toBool(cleanRaw.removeSilences),
      silenceThreshold,
      removeFillerWords: toBool(cleanRaw.removeFillerWords),
      fillerWordsList: toStringArray(cleanRaw.fillerWordsList, ['אממ', 'אההה', 'כאילו', 'בעצם']),
      selectBestTake: toBool(cleanRaw.selectBestTake),
      removeShakyBRoll: toBool(cleanRaw.removeShakyBRoll),
    };

    // Validate analyze
    const analyzeRaw = (p.analyze || {}) as Record<string, unknown>;
    const analyze = {
      hookDetection: toBool(analyzeRaw.hookDetection),
      hookCount: toNum(analyzeRaw.hookCount, 3, 1, 10),
      quoteDetection: toBool(analyzeRaw.quoteDetection),
      scenePlanning: toBool(analyzeRaw.scenePlanning),
      brandVoice: toBool(analyzeRaw.brandVoice),
      mediaIntelligence: toBool(analyzeRaw.mediaIntelligence),
      viralityScore: toBool(analyzeRaw.viralityScore),
      aiScriptGenerator: toBool(analyzeRaw.aiScriptGenerator),
    };

    // Validate generate
    const genRaw = (p.generate || {}) as Record<string, unknown>;
    const brollModel = toEnum(genRaw.brollModel, VALID_BROLL_MODELS, fallbackModel) as BRollModel;
    const generate = {
      broll: toBool(genRaw.broll),
      brollModel,
      brollFromTranscript: toBool(genRaw.brollFromTranscript),
      videoToVideo: toBool(genRaw.videoToVideo),
      generativeExtend: toBool(genRaw.generativeExtend),
      aiBackground: toBool(genRaw.aiBackground),
      aiVoiceover: toBool(genRaw.aiVoiceover),
      voiceoverStyle: toOptionalEnum(genRaw.voiceoverStyle, VALID_VOICEOVER_STYLES) as ExecutionPlan['generate']['voiceoverStyle'],
      voiceClone: toBool(genRaw.voiceClone),
      talkingPhoto: toBool(genRaw.talkingPhoto),
      thumbnail: toBool(genRaw.thumbnail),
      stockFootageSearch: toBool(genRaw.stockFootageSearch),
      animateReplace: toBool(genRaw.animateReplace),
      motionTransfer: toBool(genRaw.motionTransfer),
      faceSwap: toBool(genRaw.faceSwap),
      lipsync: toBool(genRaw.lipsync),
      motionControl: toBool(genRaw.motionControl),
      cameraControls: toBool(genRaw.cameraControls),
      multiShotSequences: toBool(genRaw.multiShotSequences),
      firstLastFrame: toBool(genRaw.firstLastFrame),
      musicGeneration: toBool(genRaw.musicGeneration),
      musicMood: toOptionalEnum(genRaw.musicMood, VALID_MUSIC_MOODS) as ExecutionPlan['generate']['musicMood'],
      musicStemSeparation: toBool(genRaw.musicStemSeparation),
      textToVFX: toBool(genRaw.textToVFX),
      aiObjectAddReplace: toBool(genRaw.aiObjectAddReplace),
      visualDNA: toBool(genRaw.visualDNA),
      multiModelComparison: toBool(genRaw.multiModelComparison),
      automatedModelSelection: toBool(genRaw.automatedModelSelection),
      aiTwin: toBool(genRaw.aiTwin),
      aiDubbing: toBool(genRaw.aiDubbing),
      aiDubbingTargetLanguage: toOptionalString(genRaw.aiDubbingTargetLanguage),
      aiScriptGenerator: toBool(genRaw.aiScriptGenerator),
      aiSoundEffects: toBool(genRaw.aiSoundEffects),
    };

    // Validate aiDubbingTargetLanguage if aiDubbing is true
    if (generate.aiDubbing && generate.aiDubbingTargetLanguage) {
      if (!VALID_LANGUAGE_CODES.includes(generate.aiDubbingTargetLanguage)) {
        errors.push(`Invalid dubbing target language: ${generate.aiDubbingTargetLanguage}`);
        generate.aiDubbingTargetLanguage = 'en';
      }
    }

    // Validate edit
    const editRaw = (p.edit || {}) as Record<string, unknown>;
    const edit = {
      autoAngleSwitching: toBool(editRaw.autoAngleSwitching),
      angleSwitchInterval: toNum(editRaw.angleSwitchInterval, 4, 1, 15),
      shotSelection: toBool(editRaw.shotSelection),
      smartVariety: toBool(editRaw.smartVariety),
      beatSyncCuts: toBool(editRaw.beatSyncCuts),
      beatMode: toOptionalEnum(editRaw.beatMode, VALID_BEAT_MODES) as ExecutionPlan['edit']['beatMode'],
      pacing: toEnum(editRaw.pacing, VALID_PACING, 'normal') as ExecutionPlan['edit']['pacing'],
      musicSync: toBool(editRaw.musicSync),
      vfxAuto: toBool(editRaw.vfxAuto),
      colorGrading: toBool(editRaw.colorGrading),
      colorGradingStyle: toOptionalEnum(editRaw.colorGradingStyle, VALID_COLOR_GRADING_STYLES) as ExecutionPlan['edit']['colorGradingStyle'],
      colorMatchCameras: toBool(editRaw.colorMatchCameras),
      skinToneCorrection: toBool(editRaw.skinToneCorrection),
      lightingEnhancement: toBool(editRaw.lightingEnhancement),
      subtitles: toBool(editRaw.subtitles),
      subtitleStyle: toOptionalEnum(editRaw.subtitleStyle, VALID_SUBTITLE_STYLES) as ExecutionPlan['edit']['subtitleStyle'],
      subtitlePosition: toOptionalEnum(editRaw.subtitlePosition, VALID_SUBTITLE_POSITIONS) as ExecutionPlan['edit']['subtitlePosition'],
      subtitleHighlightKeywords: toBool(editRaw.subtitleHighlightKeywords),
      captionTemplate: toOptionalString(editRaw.captionTemplate),
      lowerThirds: toBool(editRaw.lowerThirds),
      smartZooms: toBool(editRaw.smartZooms),
      zoomStyle: toOptionalEnum(editRaw.zoomStyle, VALID_ZOOM_STYLES) as ExecutionPlan['edit']['zoomStyle'],
      eyeContactCorrection: toBool(editRaw.eyeContactCorrection),
      music: toBool(editRaw.music),
      musicSource: toOptionalEnum(editRaw.musicSource, ['library', 'ai-generated']) as ExecutionPlan['edit']['musicSource'],
      autoDucking: toBool(editRaw.autoDucking),
      enhanceSpeech: toBool(editRaw.enhanceSpeech),
      noiseReduction: toBool(editRaw.noiseReduction),
      presenterSeparation: toBool(editRaw.presenterSeparation),
      backgroundBlur: toBool(editRaw.backgroundBlur),
      objectMasking: toBool(editRaw.objectMasking),
      upscaling: toBool(editRaw.upscaling),
      logoWatermark: toBool(editRaw.logoWatermark),
      cta: toBool(editRaw.cta),
      ctaText: toOptionalString(editRaw.ctaText),
      effectsLibrary: toBool(editRaw.effectsLibrary),
      chatBasedEditor: toBool(editRaw.chatBasedEditor, true),
      editStyle: toOptionalEnum(editRaw.editStyle, VALID_EDIT_STYLES) as ExecutionPlan['edit']['editStyle'],
      kineticTypography: toBool(editRaw.kineticTypography),
      photoMotion: toBool(editRaw.photoMotion),
    };

    // Validate export
    const expRaw = (p.export || {}) as Record<string, unknown>;
    const formats = toFormatArray(expRaw.formats, ['16:9']);
    const exp = {
      formats,
      aiReframe: toBool(expRaw.aiReframe),
      targetDuration: expRaw.targetDuration === 'auto' ? 'auto' as const : toNum(expRaw.targetDuration, 0, 0, 3600) || 'auto' as const,
      generateThumbnail: toBool(expRaw.generateThumbnail, true),
      highBitrate4K: toBool(expRaw.highBitrate4K),
      customTheme: toBool(expRaw.customTheme),
    };

    // Validate templates
    const tplRaw = (p.templates || {}) as Record<string, unknown>;
    const templates = {
      brandKit: toBool(tplRaw.brandKit),
      ecommerceTemplate: toBool(tplRaw.ecommerceTemplate),
      digitalSocialTemplate: toBool(tplRaw.digitalSocialTemplate),
      multiPageStories: toBool(tplRaw.multiPageStories),
      sourceDocumentImport: toBool(tplRaw.sourceDocumentImport),
      trendingSounds: toBool(tplRaw.trendingSounds),
    };

    const plan: ExecutionPlan = {
      mode,
      ingest,
      clean,
      analyze,
      generate,
      edit,
      export: exp,
      templates,
    };

    return { valid: errors.length === 0, plan, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Validation error: ${msg}`);
    return { valid: false, plan: buildSafeDefault(fallbackModel), errors };
  }
}

function buildSafeDefault(model: BRollModel): ExecutionPlan {
  return {
    mode: 'raw',
    ingest: {
      transcribe: true,
      multiCamSync: false,
      lipSyncVerify: false,
      footageClassification: true,
      shotSelection: true,
      smartVariety: false,
      speakerClassification: false,
    },
    clean: {
      removeSilences: true,
      silenceThreshold: 0.5,
      removeFillerWords: true,
      fillerWordsList: ['אממ', 'אההה', 'כאילו', 'בעצם'],
      selectBestTake: true,
      removeShakyBRoll: true,
    },
    analyze: {
      hookDetection: true,
      hookCount: 3,
      quoteDetection: true,
      scenePlanning: false,
      brandVoice: false,
      mediaIntelligence: true,
      viralityScore: false,
      aiScriptGenerator: false,
    },
    generate: {
      broll: true,
      brollModel: model,
      brollFromTranscript: true,
      videoToVideo: false,
      generativeExtend: false,
      aiBackground: false,
      aiVoiceover: false,
      voiceClone: false,
      talkingPhoto: false,
      thumbnail: true,
      stockFootageSearch: true,
      animateReplace: false,
      motionTransfer: false,
      faceSwap: false,
      lipsync: false,
      motionControl: false,
      cameraControls: false,
      multiShotSequences: false,
      firstLastFrame: false,
      musicGeneration: false,
      musicStemSeparation: false,
      textToVFX: false,
      aiObjectAddReplace: false,
      visualDNA: false,
      multiModelComparison: false,
      automatedModelSelection: false,
      aiTwin: false,
      aiDubbing: false,
      aiScriptGenerator: false,
      aiSoundEffects: false,
    },
    edit: {
      autoAngleSwitching: false,
      angleSwitchInterval: 4,
      shotSelection: true,
      smartVariety: false,
      beatSyncCuts: false,
      pacing: 'normal',
      musicSync: false,
      vfxAuto: false,
      colorGrading: true,
      colorMatchCameras: false,
      skinToneCorrection: false,
      lightingEnhancement: true,
      subtitles: true,
      subtitleStyle: 'animated',
      subtitlePosition: 'smart',
      subtitleHighlightKeywords: true,
      lowerThirds: false,
      smartZooms: true,
      zoomStyle: 'subtle',
      eyeContactCorrection: false,
      music: true,
      autoDucking: true,
      enhanceSpeech: true,
      noiseReduction: true,
      presenterSeparation: false,
      backgroundBlur: false,
      objectMasking: false,
      upscaling: false,
      logoWatermark: false,
      cta: false,
      effectsLibrary: false,
      chatBasedEditor: true,
      kineticTypography: false,
      photoMotion: false,
    },
    export: {
      formats: ['16:9'],
      aiReframe: false,
      targetDuration: 'auto',
      generateThumbnail: true,
      highBitrate4K: false,
      customTheme: false,
    },
    templates: {
      brandKit: false,
      ecommerceTemplate: false,
      digitalSocialTemplate: false,
      multiPageStories: false,
      sourceDocumentImport: false,
      trendingSounds: false,
    },
  };
}

// --- Helper functions ---

function toBool(val: unknown, defaultVal = false): boolean {
  if (typeof val === 'boolean') return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return defaultVal;
}

function toNum(val: unknown, defaultVal: number, min: number, max: number): number {
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(n)) return defaultVal;
  return Math.max(min, Math.min(max, n));
}

function toEnum<T extends string>(val: unknown, valid: T[], defaultVal: T): T {
  if (typeof val === 'string' && valid.includes(val as T)) return val as T;
  return defaultVal;
}

function toOptionalEnum<T extends string>(val: unknown, valid: T[]): T | undefined {
  if (typeof val === 'string' && valid.includes(val as T)) return val as T;
  return undefined;
}

function toOptionalString(val: unknown): string | undefined {
  if (typeof val === 'string' && val.length > 0) return val;
  return undefined;
}

function toStringArray(val: unknown, defaultVal: string[]): string[] {
  if (Array.isArray(val) && val.every((v) => typeof v === 'string')) return val;
  return defaultVal;
}

function toFormatArray(val: unknown, defaultVal: ('16:9' | '9:16' | '1:1')[]): ('16:9' | '9:16' | '1:1')[] {
  if (Array.isArray(val)) {
    const valid = val.filter((v): v is '16:9' | '9:16' | '1:1' => VALID_FORMATS.includes(String(v)));
    return valid.length > 0 ? valid : defaultVal;
  }
  return defaultVal;
}
