import type { ExecutionPlan, FileInfo, UserOptions, BRollModel } from '../types.js';

export async function generatePlan(
  prompt: string,
  files: FileInfo[],
  options: UserOptions,
  model: BRollModel
): Promise<{ plan: ExecutionPlan; enabledCount: number }> {
  const hasFiles = files.length > 0;
  const isMultiCam = files.length > 1;
  const isPromptOnly = !hasFiles;
  const hasDocFile = files.some((f) =>
    /\.(pdf|docx?|txt|pptx?)$/i.test(f.name)
  );

  const lowerPrompt = prompt.toLowerCase();
  const hasSubtitles = prompt.includes('כתוביות') || options.hebrewSubtitles;
  const isCinematic = prompt.includes('סינמטי') || options.cinematic;
  const isTikTok = prompt.includes('טיקטוק') || options.trendy;
  const hasDubbing = prompt.includes('דיבוב');
  const hasAvatar = prompt.includes('אווטאר');
  const hasPDF = prompt.includes('PDF') || hasDocFile;
  const hasStory = prompt.includes('סטורי');

  const plan: ExecutionPlan = {
    mode: isPromptOnly ? 'prompt-only' : 'raw',

    ingest: {
      transcribe: hasFiles,
      multiCamSync: isMultiCam,
      lipSyncVerify: false,
      footageClassification: hasFiles,
      shotSelection: hasFiles,
      smartVariety: isMultiCam,
      speakerClassification: isMultiCam,
    },

    clean: {
      removeSilences: hasFiles,
      silenceThreshold: 0.5,
      removeFillerWords: hasFiles,
      fillerWordsList: ['אממ', 'אההה', 'כאילו', 'בעצם'],
      selectBestTake: hasFiles,
      removeShakyBRoll: hasFiles,
    },

    analyze: {
      hookDetection: true,
      hookCount: 3,
      quoteDetection: true,
      scenePlanning: isPromptOnly,
      brandVoice: false,
      mediaIntelligence: hasFiles,
      viralityScore: options.viralityScore || isTikTok,
      aiScriptGenerator: isPromptOnly,
    },

    generate: {
      broll: true,
      brollModel: model,
      brollFromTranscript: hasFiles,
      videoToVideo: false,
      generativeExtend: false,
      aiBackground: options.aiBackground,
      aiVoiceover: isPromptOnly,
      voiceoverStyle: isPromptOnly ? 'narrator' : undefined,
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
      musicGeneration: options.energeticMusic || options.calmMusic,
      musicMood: options.energeticMusic ? 'energetic' : options.calmMusic ? 'calm' : undefined,
      musicStemSeparation: options.musicSync,
      textToVFX: false,
      aiObjectAddReplace: false,
      visualDNA: false,
      multiModelComparison: false,
      automatedModelSelection: false,
      aiTwin: hasAvatar,
      aiDubbing: hasDubbing,
      aiDubbingTargetLanguage: hasDubbing ? 'en' : undefined,
      aiSoundEffects: options.aiSoundEffects,
    },

    edit: {
      autoAngleSwitching: isMultiCam,
      angleSwitchInterval: 4,
      shotSelection: hasFiles,
      smartVariety: isMultiCam,
      beatSyncCuts: isTikTok || options.energyBoost,
      beatMode: isTikTok ? 'combined' : undefined,
      pacing: isTikTok ? 'fast' : isCinematic ? 'calm' : 'normal',
      musicSync: options.musicSync,
      vfxAuto: false,
      colorGrading: true,
      colorGradingStyle: isCinematic ? 'cinematic' : 'clean',
      colorMatchCameras: isMultiCam,
      skinToneCorrection: false,
      lightingEnhancement: true,
      subtitles: hasSubtitles,
      subtitleStyle: hasSubtitles ? 'animated' : undefined,
      subtitlePosition: 'smart',
      subtitleHighlightKeywords: hasSubtitles,
      lowerThirds: options.lowerThirds,
      smartZooms: true,
      zoomStyle: isCinematic ? 'ken-burns' : 'subtle',
      eyeContactCorrection: options.eyeContact,
      music: true,
      musicSource: 'library',
      autoDucking: true,
      enhanceSpeech: hasFiles,
      noiseReduction: hasFiles,
      presenterSeparation: false,
      backgroundBlur: options.backgroundBlur,
      objectMasking: false,
      upscaling: false,
      logoWatermark: false,
      cta: false,
      effectsLibrary: false,
      chatBasedEditor: true,
      editStyle: isCinematic ? 'cinematic' : isTikTok ? 'trendy' : undefined,
      kineticTypography: options.kineticTypography,
      photoMotion: false,
    },

    export: {
      formats: isTikTok ? ['9:16'] : ['16:9'],
      aiReframe: isTikTok,
      targetDuration: 'auto',
      generateThumbnail: true,
      highBitrate4K: false,
      customTheme: false,
    },

    templates: {
      brandKit: false,
      ecommerceTemplate: false,
      digitalSocialTemplate: isTikTok,
      multiPageStories: hasStory,
      storyPageCount: hasStory ? 5 : undefined,
      sourceDocumentImport: hasPDF,
      sourceDocumentFile: hasPDF ? files.find((f) => /\.(pdf|docx?|txt|pptx?)$/i.test(f.name))?.path : undefined,
      trendingSounds: options.trendingSounds || isTikTok,
    },
  };

  const enabledCount = countEnabledFeatures(plan);

  return { plan, enabledCount };
}

function countEnabledFeatures(plan: ExecutionPlan): number {
  let count = 0;

  const countBooleans = (obj: Record<string, unknown>) => {
    for (const value of Object.values(obj)) {
      if (value === true) count++;
    }
  };

  countBooleans(plan.ingest);
  countBooleans(plan.clean);
  countBooleans(plan.analyze);
  countBooleans(plan.generate);
  countBooleans(plan.edit);
  countBooleans(plan.export);
  countBooleans(plan.templates);

  return count;
}
