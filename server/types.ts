export type JobStatus = 'pending' | 'planning' | 'preview' | 'approved' | 'processing' | 'done' | 'error';
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
  costEstimate?: { total: number; breakdown: Record<string, number> };
  warnings?: string[];
  visualDNAProfileId?: string;
  previewData?: PreviewData;
  previewHistory: PreviewData[];
  approvedAt?: string;
  cleanVideoPath?: string;
  musicSyncData?: MusicSyncData;
  generateResult?: GenerateResult;
  transcript?: TranscriptResult;
  sourceDocumentContent?: string;
  contentAnalysis?: ContentAnalysis;
  editingBlueprint?: import('./services/editingRules.js').EditingBlueprint;
  emotionalArc?: ContentAnalysis['emotionalArc'];
  detailedEmotionalArc?: ContentAnalysis['detailedEmotionalArc'];
  cutTransitions?: ContentAnalysis['cutTransitions'];
  protectedSilences?: ContentAnalysis['protectedSilences'];
  shakeEffects?: Array<{ at: number; duration: number; intensity: number }>;
  presenterDetection?: PresenterDetection;
  speakerVerification?: VerifiedSpeakerMap;
  videoIntelligence?: VideoIntelligence;
  stabilized?: boolean;
  originalShakiness?: number;
  freshEyesReview?: import('./services/freshEyesReview.js').FreshEyesResult;
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
  filePath?: string;
  videoDuration?: number;
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
  exports?: Array<{ format: string; url: string }>;
}

export interface RevisionRequest {
  type: 'general' | 'timecode' | 'duration' | 'chat';
  prompt: string;
  timeRange?: { from: string; to: string };
  newDuration?: number;
}

// --- Phase 3: Ingest & Clean Types ---

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  speaker: number;
  confidence: number;
}

export interface TranscriptResult {
  words: TranscriptWord[];
  fullText: string;
}

export interface FootageClassification {
  type: 'performance' | 'broll' | 'close-up' | 'wide-shot' | 'product-shot';
  confidence: number;
  description: string;
}

export interface ShotSelection {
  start: number;
  end: number;
  selectedFile: string;
}

export interface IngestResult {
  transcript: TranscriptResult | null;
  syncedFiles: string[];
  classifications: Array<{ file: string } & FootageClassification>;
  shotSelections: ShotSelection[];
  warnings: string[];
}

export interface CleanResult {
  cleanVideoPath: string;
  removedSilences: Array<{ start: number; end: number }>;
  removedFillers: Array<{ word: string; start: number; is_filler: boolean; reason: string }>;
  removedBadTakes: Array<{ start: number; end: number }>;
  excludedClips: Array<{ file: string; reason: string; shakiness: number }>;
  warnings: string[];
}

// --- Phase 4: Generate Types ---

export interface BRollClip {
  path: string;
  timestamp: number;
  duration: number;
  prompt: string;
  isStock?: boolean;
}

export interface SFXMomentWithFile {
  timestamp: number;
  sfx_keyword: string;
  reason: string;
  volume: number;
  filePath: string;
}

export interface StockClip {
  path: string;
  keyword: string;
  duration: number;
}

export interface GenerateResult {
  brollClips: BRollClip[];
  voiceoverPath: string | null;
  musicPath: string | null;
  sfxMoments: SFXMomentWithFile[];
  thumbnailPath: string | null;
  stockClips: StockClip[];
  additionalAssets: Record<string, any>;
}

// --- Phase 6: Advanced Edit Types ---

export interface BeatResult {
  bpm: number;
  beats: number[];
  kicks: number[];
  drums: number[];
  duration: number;
}

export interface MusicSyncData {
  bpm: number;
  beats: number[];
  snappedZooms: any[];
  snappedBroll: number[];
}

export interface KineticTextElement {
  text: string;
  startTime: number;
  endTime: number;
  animation: 'explode' | 'bounce' | 'typewriter' | 'wave' | 'shake' | 'fade-in' | 'slide-up';
  emphasis: 'normal' | 'strong' | 'highlight';
  fontSize: 'small' | 'medium' | 'large';
}

export interface EditStylePreset {
  name: string;
  nameHebrew: string;
  pacing: 'fast' | 'normal' | 'calm';
  colorGradingStyle: string;
  zoomStyle: string;
  musicMood: string;
  transitions: string;
  beatSync: boolean;
  musicSync: boolean;
  vfxTypes: string[];
  subtitleStyle: string;
}

// --- Phase 5: Edit Types ---

export interface EditResult {
  finalVideoPath: string;
  duration: number;
  formats: string[];
  warnings: string[];
  timeline?: Segment[];
}

// --- Phase 8: Advanced AI Types ---

// --- Phase 9: Prompt-Only Types ---

export interface ScenePlan {
  scene_number: number;
  section: string;
  narration_text: string;
  duration_seconds: number;
  visual_description: string;
  camera_movement: string;
  mood: string;
  text_overlay?: string;
  broll_prompt: string;
}

export interface PromptOnlyResult {
  videoPath: string;
  scenes: ScenePlan[];
  voiceoverPath: string;
  musicPath: string | null;
  sceneClips: string[];
  duration: number;
}

export interface AITwinResult {
  success: boolean;
  videoPath: string | null;
  scriptText: string;
  voiceId?: string;
  voiceoverPath?: string;
}

export interface AIDubbingResult {
  success: boolean;
  translatedText: string;
  audioPath: string;
  videoPath: string | null;
  targetLanguage: string;
  lipsyncFailed?: boolean;
}

export interface VisualDNAProfile {
  id: string;
  name: string;
  colorPalette: string[];
  typography: string;
  mood: string;
  pacing: string;
  visualStyle: string;
  promptPrefix: string;
  createdAt: string;
}

export interface ComparisonResult {
  model: string;
  success: boolean;
  outputPath: string | null;
  duration?: number;
  fileSize?: number;
  error?: string;
}

export interface ModelRecommendation {
  model: string;
  reason: string;
  confidence: number;
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
    aiScriptGenerator: boolean;
    aiSoundEffects: boolean;
  };
  edit: {
    autoAngleSwitching: boolean;
    angleSwitchInterval: number;
    shotSelection: boolean;
    smartVariety: boolean;
    beatSyncCuts: boolean;
    beatMode?: BeatMode;
    useHookFirst?: boolean;
    hookSegment?: { start: number; end: number };
    segmentsToKeep?: Array<{ start: number; end: number; reason: string }>;
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

// --- Phase 11: Preview & Approve Types ---

export interface PreviewData {
  id: string;
  createdAt: string;

  // Visual preview
  keyFrames: KeyFrame[];
  storyboard: StoryboardScene[];
  timeline: PreviewTimeline;

  // Plan summary
  enabledFeatures: string[];
  enabledFeaturesCount: number;
  totalFeatures: number;

  // Content preview
  subtitlePreview?: string;
  brollPrompts: BRollPreviewItem[];
  musicMood?: string;
  voiceoverStyle?: string;
  editStyle?: string;

  // Estimates
  estimatedDuration: number;
  estimatedRenderTime: string;
  estimatedCost: string;
  viralityEstimate?: number;

  // Script (prompt-only mode)
  script?: ScriptPreview[];

  // Plan reference
  plan: ExecutionPlan;

  // Change history
  changeRequest?: string;
}

export interface KeyFrame {
  timestamp: number;
  imagePath: string;
  label: string;
}

export interface StoryboardScene {
  sceneNumber: number;
  title: string;
  description: string;
  framePath?: string | null;
  duration: number;
  elements: string[];
}

export interface PreviewTimeline {
  totalDuration: number;
  segments: PreviewSegment[];
}

export interface PreviewSegment {
  start: number;
  end: number;
  type: 'original' | 'broll' | 'music' | 'sfx' | 'subtitle' | 'cta' | 'lower-third';
  label: string;
  color: string;
}

export interface BRollPreviewItem {
  timestamp: number;
  duration: number;
  prompt: string;
  reason: string;
}

export interface ScriptPreview {
  section: string;
  text: string;
  duration: number;
  visualDescription: string;
}

// --- Content Analysis Types (Smart Brain Editor) ---

export interface ContentAnalysis {
  presenter: {
    name?: string;
    speakingSegments: Array<{ start: number; end: number }>;
    silentSegments: Array<{ start: number; end: number }>;
    totalSpeakingTime: number;
    totalSilentTime: number;
  };
  segments: Array<{
    start: number;
    end: number;
    type: 'speaking' | 'silence' | 'filler' | 'repetition' | 'off-topic' | 'key-moment';
    quality: number;
    keepRecommendation: 'must-keep' | 'keep' | 'optional' | 'cut';
    reason: string;
  }>;
  bestMoments: Array<{
    start: number;
    end: number;
    type: 'hook' | 'quote' | 'emotional' | 'funny' | 'key-point' | 'cta';
    score: number;
    text: string;
    suggestedUse: string;
  }>;
  structure: {
    introduction: { start: number; end: number } | null;
    mainPoints: Array<{ start: number; end: number; topic: string }>;
    conclusion: { start: number; end: number } | null;
    offTopicSegments: Array<{ start: number; end: number; reason: string }>;
  };
  recommendedEdit: {
    totalDuration: number;
    segments: Array<{ start: number; end: number; reason: string }>;
    hookSegment: { start: number; end: number } | null;
    suggestedOrder: 'chronological' | 'hook-first' | 'best-moments';
  };
  visual: {
    presenterPosition: 'center' | 'left' | 'right';
    hasGoodLighting: boolean;
    backgroundType: 'office' | 'outdoor' | 'studio' | 'home' | 'other';
    cameraAngle: 'front' | 'side' | 'multiple';
  };
  reconstructedSentences: Array<{
    finalText: string;
    fragments: Array<{ start: number; end: number; sourceText: string }>;
    reason: string;
  }>;
  brollCoverMoments: Array<{
    start: number;
    end: number;
    reason: string;
    suggestedPrompt: string;
    triggerWord?: string;
    triggerWordTimestamp?: number;
  }>;
  emotionalArc: Array<{
    section: 'hook' | 'build' | 'peak' | 'resolution';
    start: number;
    end: number;
    musicMood: string;
    energy: number;
  }>;
  pacingPlan: Array<{
    start: number;
    end: number;
    cutFrequency: 'fast' | 'medium' | 'slow';
    addZoom: boolean;
    addBRoll: boolean;
  }>;
  cutTransitions: Array<{
    at: number;
    type: 'hard' | 'lcutBroll' | 'crossfade' | 'smashCut' | 'cutaway' | 'montage' | 'broll-bridge' | 'zoom' | 'flash';
    murchScore?: number;
    audioOverlapAfter?: number;
    fakeZoom?: boolean;
    duration?: number;
    reason?: string;
  }>;
  footageIssues: Array<{
    issue: string;
    solution: string;
  }>;
  hookOptions: Array<{
    start: number;
    end: number;
    text: string;
    viralScore: number;
    reason: string;
  }>;
  musicSync?: {
    ducking: Array<{ start: number; end: number; volume: number; reason: string }>;
    beatAlignedCuts: number[];
  };
  soundDesign?: {
    roomToneSource?: { start: number; end: number };
    voiceProcessing?: { highPass: number; compression: boolean; normalize: number };
    sfx: Array<{ type: string; at: number; duration?: number; volume: number; reason: string }>;
  };
  zooms?: Array<{
    timestamp: number;
    zoomFrom: number;
    zoomTo: number;
    duration: number;
    easing: string;
    reason: string;
  }>;
  colorPlan?: Array<{
    segment: { start: number; end: number };
    temperature: string;
    lut: string;
    skinToneProtection: boolean;
  }>;
  platformOptimization?: {
    platform: string;
    hookStrategy: { type: string; text: string; duration: number };
    safeZone: { top: number; bottom: number; right: number };
    idealCutFrequency: number;
    captionPosition: string;
    loopable: boolean;
    endStrategy: string;
  };
  editingBlueprint?: import('./services/editingRules.js').EditingBlueprint;

  // Detailed emotional arc (rollercoaster phases)
  detailedEmotionalArc?: Array<{
    start: number;
    end: number;
    energy: number;
    phase: string;
    editStyle: string;
  }>;

  // Protected silences (strategic pauses to keep)
  protectedSilences?: Array<{
    at: number;
    duration: number;
    type: 'impact' | 'anticipation' | 'rhetorical' | 'emotional' | 'comedic';
    reason: string;
  }>;
}

// --- Presenter Detection Types ---

export interface PresenterDetection {
  presenterId: number;
  presenterDescription: string;
  allSpeakers: SpeakerInfo[];
  presenterSegments: Array<{ start: number; end: number; text: string }>;
  nonPresenterSegments: Array<{ start: number; end: number; speakerId: number; role: string }>;
  confidence: number;
}

export interface SpeakerInfo {
  speakerId: number;
  role: 'presenter' | 'director' | 'assistant' | 'interviewer' | 'background' | 'unknown';
  totalSpeakingTime: number;
  segmentCount: number;
  isOnCamera: boolean;
  description: string;
}

// --- Speaker Verification Types (3-Layer) ---

export interface VerifiedSpeakerMap {
  speakers: VerifiedSpeaker[];
  corrections: SpeakerCorrection[];
  confidence: number;
  verificationMethod: string;
}

export interface VerifiedSpeaker {
  id: number;
  originalIds: number[];
  role: 'presenter' | 'director' | 'assistant' | 'interviewer' | 'background' | 'unknown';
  isOnCamera: boolean;
  description: string;
  voiceCharacteristics: string;
  segments: Array<{ start: number; end: number; text: string }>;
  totalTime: number;
}

export interface SpeakerCorrection {
  type: 'merge' | 'split';
  description: string;
  originalSpeakerIds: number[];
  correctedSpeakerId: number;
  evidence: string;
}

// --- Video Intelligence Types ---

export interface VideoIntelligence {
  concept: {
    title: string;
    summary: string;
    category: 'talking-head' | 'interview' | 'product-demo' | 'tour' | 'testimonial' |
              'presentation' | 'event' | 'broll-only' | 'screen-recording' | 'mixed';
    industry: string;
    targetAudience: string;
    tone: string;
  };
  keyPoints: Array<{
    point: string;
    timestamp: number;
    importance: number;
    type: 'main-message' | 'supporting-fact' | 'statistic' | 'quote' | 'benefit' | 'feature' | 'cta' | 'story';
    suggestedVisual: string;
  }>;
  storyArc: {
    hasNaturalArc: boolean;
    suggestedStructure: Array<{
      section: 'hook' | 'problem' | 'solution' | 'proof' | 'benefits' | 'features' |
               'testimonial' | 'cta' | 'intro' | 'main' | 'conclusion';
      start: number;
      end: number;
      title: string;
      keyMessage: string;
    }>;
    missingElements: string[];
    suggestedAdditions: Array<{
      element: string;
      type: 'text-overlay' | 'broll' | 'voiceover' | 'music-change';
      suggestion: string;
    }>;
  };
  footageAssessment: {
    overallQuality: number;
    videoQuality: {
      resolution: 'low' | 'medium' | 'high';
      lighting: 'poor' | 'acceptable' | 'good' | 'professional';
      stability: 'shaky' | 'mostly-stable' | 'stable' | 'tripod';
      framing: 'poor' | 'acceptable' | 'good';
      background: 'messy' | 'acceptable' | 'clean' | 'professional';
    };
    audioQuality: {
      clarity: 'poor' | 'acceptable' | 'good' | 'professional';
      backgroundNoise: 'heavy' | 'moderate' | 'light' | 'none';
      volume: 'too-quiet' | 'acceptable' | 'good' | 'too-loud';
      echo: boolean;
    };
    issues: string[];
    autoFixes: string[];
  };
  contentDensity: {
    totalFootageDuration: number;
    usableContentDuration: number;
    wastePercentage: number;
    contentPerMinute: number;
    recommendation: string;
  };
  typeSpecific: {
    speakerEnergy: 'low' | 'medium' | 'high';
    speakerConfidence: 'nervous' | 'moderate' | 'confident';
    eyeContactFrequency: 'rarely' | 'sometimes' | 'mostly' | 'always';
    questionQuality?: 'weak' | 'average' | 'strong';
    answerQuality?: 'weak' | 'average' | 'strong';
    productVisibility?: 'poor' | 'average' | 'clear';
    demoClarity?: 'confusing' | 'average' | 'clear';
    coverageCompleteness?: 'partial' | 'good' | 'comprehensive';
    movementSmooth?: boolean;
    highlightMoments?: Array<{ start: number; end: number; description: string }>;
    hasAudioNarration?: boolean;
    screenReadability?: 'poor' | 'average' | 'clear';
    suggestedNarration?: string;
    suggestedMusicMood?: string;
  };
  textOverlayPlan: Array<{
    text: string;
    timestamp: number;
    duration: number;
    type: 'title' | 'subtitle' | 'statistic' | 'quote' | 'bullet-point' | 'cta' | 'label';
    style: 'large-center' | 'lower-third' | 'side-text' | 'full-screen';
    animation: 'fade' | 'bounce' | 'typewriter' | 'slide';
  }>;
  smartBRollPlan: Array<{
    timestamp: number;
    duration: number;
    reason: string;
    prompt: string;
    priority: 'must-have' | 'nice-to-have' | 'optional';
    alternative: string;
  }>;
  edgeCases: {
    isBRollOnly: boolean;
    isVeryShort: boolean;
    isBilingual: boolean;
    isRepetitive: boolean;
    isVeryLong: boolean;
    isMultipleClips: boolean;
    warnings: string[];
  };

  // Brain auto-selected optimal configuration
  recommendedConfig?: RecommendedConfig;
}

export interface RecommendedConfig {
  model: string;
  modelReason: string;
  editStyle: 'cinematic' | 'energetic' | 'minimal' | 'trendy';
  editStyleReason: string;
  suggestedDuration: number;
  durationReason: string;
  subtitleStyle: string;
  subtitleStyleReason: string;
  enabledOptions: Record<string, boolean>;
  optionReasons: Record<string, string>;
  formats: string[];
  formatReason: string;
  estimatedCost: number;
  confidence: number;
}
