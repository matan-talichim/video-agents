export type JobStatus = 'pending' | 'planning' | 'processing' | 'done' | 'error';
export type JobMode = 'raw' | 'prompt-only';
export type BRollModel = 'veo-3.1-fast' | 'sora-2' | 'kling-v2.5-turbo' | 'wan-2.5' | 'seedance-1.5-pro';
export type PacingMode = 'fast' | 'normal' | 'calm';
export type EditStyle = 'cinematic' | 'energetic' | 'minimal' | 'trendy';
export type VoiceoverStyle = 'narrator' | 'educator' | 'persuader' | 'coach' | 'motivator';
export type ZoomStyle = 'subtle' | 'punch' | 'ken-burns';
export type SubtitleStyle = 'animated' | 'simple' | 'karaoke';
export type BeatMode = 'kicks' | 'drums' | 'combined';
export type PhotoMotionStyle = 'ken-burns' | 'zoom' | 'pan';
export type ExportFormat = '16:9' | '9:16' | '1:1';

export interface Job {
  id: string;
  mode: JobMode;
  status: JobStatus;
  progress: number;
  currentStep: string;
  prompt: string;
  model: BRollModel;
  options: UserOptions;
  files: FileInfo[];
  plan: ExecutionPlan | null;
  result: JobResult | null;
  versions: string[];
  createdAt: string;
  projectName: string;
  editStyle?: EditStyle;
  captionTemplate?: string;
  voiceoverStyle?: VoiceoverStyle;
  targetLanguage?: string;
  storyPageCount?: number;
  brandKit?: BrandKit;
  viralityScore?: ViralityScore;
  enabledFeaturesCount?: number;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  path: string;
}

export interface UserOptions {
  aiBackground: boolean;
  backgroundBlur: boolean;
  cinematic: boolean;
  energyBoost: boolean;
  eyeContact: boolean;
  removeSilences: boolean;
  hebrewSubtitles: boolean;
  calmProfessional: boolean;
  energeticMusic: boolean;
  calmMusic: boolean;
  trendy: boolean;
  lowerThirds: boolean;
  aiSoundEffects: boolean;
  viralityScore: boolean;
  kineticTypography: boolean;
  musicSync: boolean;
  trendingSounds: boolean;
}

export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  font: string;
  logoFile?: string;
  enabled: boolean;
}

export interface ViralityScore {
  total: number;
  hook: number;
  pacing: number;
  emotion: number;
  cta: number;
  trends: number;
  tips: string[];
}

export interface JobVersion {
  id: string;
  jobId: string;
  versionNumber: number;
  prompt: string;
  type: 'original' | 'general' | 'timecode' | 'duration' | 'chat';
  timeRange?: { from: number; to: number };
  duration?: number;
  timeline: Segment[];
  date: string;
  videoUrl: string;
  isActive: boolean;
}

export interface Segment {
  start: number;
  end: number;
  label: string;
  type: 'original' | 'broll' | 'transition' | 'text' | 'sfx' | 'music';
}

export interface JobResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  timeline: Segment[];
}

export interface RevisionRequest {
  type: 'general' | 'timecode' | 'duration' | 'chat';
  prompt: string;
  timeRange?: { from: string; to: string };
  newDuration?: number;
}

export interface ExecutionPlan {
  mode: 'raw' | 'prompt-only';
  ingest: {
    transcribe: boolean;
    multiCamSync: boolean;
    lipSyncVerify: boolean;
    footageClassification: boolean;
    shotSelection: boolean;
    smartVariety: boolean;
    speakerClassification: boolean;
  };
  clean: {
    removeSilences: boolean;
    silenceThreshold: number;
    removeFillerWords: boolean;
    fillerWordsList: string[];
    selectBestTake: boolean;
    removeShakyBRoll: boolean;
  };
  analyze: {
    hookDetection: boolean;
    hookCount: number;
    quoteDetection: boolean;
    scenePlanning: boolean;
    brandVoice: boolean;
    mediaIntelligence: boolean;
    viralityScore: boolean;
    aiScriptGenerator: boolean;
  };
  generate: {
    broll: boolean;
    brollModel: BRollModel;
    brollFromTranscript: boolean;
    videoToVideo: boolean;
    generativeExtend: boolean;
    aiBackground: boolean;
    aiVoiceover: boolean;
    voiceoverStyle?: VoiceoverStyle;
    voiceClone: boolean;
    voiceCloneSourceFile?: string;
    talkingPhoto: boolean;
    thumbnail: boolean;
    stockFootageSearch: boolean;
    animateReplace: boolean;
    motionTransfer: boolean;
    faceSwap: boolean;
    lipsync: boolean;
    motionControl: boolean;
    cameraControls: boolean;
    multiShotSequences: boolean;
    firstLastFrame: boolean;
    musicGeneration: boolean;
    musicMood?: 'energetic' | 'calm' | 'dramatic' | 'business' | 'trendy';
    musicStemSeparation: boolean;
    textToVFX: boolean;
    textToVFXPrompts?: string[];
    aiObjectAddReplace: boolean;
    visualDNA: boolean;
    multiModelComparison: boolean;
    automatedModelSelection: boolean;
    aiTwin: boolean;
    aiTwinSourceImage?: string;
    aiDubbing: boolean;
    aiDubbingTargetLanguage?: string;
    aiSoundEffects: boolean;
  };
  edit: {
    autoAngleSwitching: boolean;
    angleSwitchInterval: number;
    shotSelection: boolean;
    smartVariety: boolean;
    beatSyncCuts: boolean;
    beatMode?: BeatMode;
    pacing: PacingMode;
    musicSync: boolean;
    vfxAuto: boolean;
    vfxTypes?: ('camera-shake' | 'transition' | 'overlay' | 'crt' | 'film-burn' | 'glitch')[];
    colorGrading: boolean;
    colorGradingStyle?: 'cinematic' | 'bright' | 'moody' | 'vintage' | 'clean';
    colorMatchCameras: boolean;
    skinToneCorrection: boolean;
    lightingEnhancement: boolean;
    subtitles: boolean;
    subtitleStyle?: SubtitleStyle;
    subtitlePosition?: 'bottom' | 'center' | 'smart';
    subtitleHighlightKeywords: boolean;
    captionTemplate?: string;
    lowerThirds: boolean;
    lowerThirdsName?: string;
    lowerThirdsTitle?: string;
    smartZooms: boolean;
    zoomStyle?: ZoomStyle;
    eyeContactCorrection: boolean;
    music: boolean;
    musicSource?: 'library' | 'ai-generated';
    autoDucking: boolean;
    enhanceSpeech: boolean;
    noiseReduction: boolean;
    presenterSeparation: boolean;
    backgroundBlur: boolean;
    objectMasking: boolean;
    upscaling: boolean;
    logoWatermark: boolean;
    logoFile?: string;
    cta: boolean;
    ctaText?: string;
    ctaPosition?: 'end' | 'middle' | 'both';
    effectsLibrary: boolean;
    effectsPreset?: string;
    chatBasedEditor: boolean;
    editStyle?: EditStyle;
    kineticTypography: boolean;
    photoMotion: boolean;
    photoMotionStyle?: PhotoMotionStyle;
  };
  export: {
    formats: ExportFormat[];
    aiReframe: boolean;
    targetDuration: number | 'auto';
    generateThumbnail: boolean;
    highBitrate4K: boolean;
    customTheme: boolean;
    themeColors?: { primary: string; secondary: string };
    themeFont?: string;
  };
  templates: {
    brandKit: boolean;
    brandKitId?: string;
    ecommerceTemplate: boolean;
    digitalSocialTemplate: boolean;
    multiPageStories: boolean;
    storyPageCount?: number;
    sourceDocumentImport: boolean;
    sourceDocumentFile?: string;
    trendingSounds: boolean;
  };
}
