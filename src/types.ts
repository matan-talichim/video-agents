export type JobStatus = 'pending' | 'planning' | 'preview' | 'approved' | 'processing' | 'done' | 'error';

export type EditStyle = 'cinematic' | 'energetic' | 'minimal' | 'trendy';

export type VoiceoverStyle = 'narrator' | 'teacher' | 'persuasive' | 'coach' | 'motivator';

export type CaptionTemplate =
  | 'classic'
  | 'bold'
  | 'neon'
  | 'gradient'
  | 'outline'
  | 'shadow'
  | 'box'
  | 'typewriter'
  | 'karaoke'
  | 'minimal';

export type VideoModel = 'veo3.1' | 'sora2' | 'kling2.5' | 'wan2.5' | 'seedance1.5';

export type PresetType =
  | 'instagram_ad'
  | 'promo'
  | 'product'
  | 'tiktok'
  | 'real_estate'
  | 'testimonials'
  | 'freeform'
  | 'multi_story'
  | 'from_document'
  | 'dubbing';

export interface FileInfo {
  id: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}

export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  font: string;
  typography?: 'modern' | 'classic' | 'bold' | 'elegant' | 'playful' | 'minimal';
  mood?: 'professional' | 'energetic' | 'calm' | 'luxury' | 'friendly' | 'corporate' | 'creative';
  description?: string;
  enabled: boolean;
}

export interface ExtractedBrandKit {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  typography: 'modern' | 'classic' | 'bold' | 'elegant' | 'playful' | 'minimal';
  mood: 'professional' | 'energetic' | 'calm' | 'luxury' | 'friendly' | 'corporate' | 'creative';
  suggestedFont: string;
  description: string;
  confidence: number;
}

export interface CostItem {
  service: string;
  cost: number;
  unit: string;
  free: boolean;
}

export interface JobCostBreakdown {
  items: CostItem[];
  totalCost: number;
  totalCostFormatted: string;
  freeServicesCount: number;
  paidServicesCount: number;
}

export interface PresetAutoConfig {
  duration: number | 'auto';
  editStyle?: EditStyle;
  formats?: string[];
  storyPages?: number;
  targetLanguage?: string;
  options: Partial<UserOptions>;
  estimatedCost: string;
}

export interface UserOptions {
  removeSilences: boolean;
  addBRoll: boolean;
  hebrewSubtitles: boolean;
  englishSubtitles: boolean;
  backgroundMusic: boolean;
  energeticMusic: boolean;
  calmMusic: boolean;
  soundEffects: boolean;
  colorCorrection: boolean;
  autoZoom: boolean;
  transitions: boolean;
  intro: boolean;
  outro: boolean;
  logoWatermark: boolean;
  thumbnailGeneration: boolean;
  viralityScore: boolean;
  aiTwin: boolean;
  aiBackground: boolean;
  backgroundBlur: boolean;
  cinematic: boolean;
  eyeContact: boolean;
  calmProfessional: boolean;
  trendy: boolean;
  lowerThirds: boolean;
  aiSoundEffects: boolean;
  kineticTypography: boolean;
  musicSync: boolean;
  trendingSounds: boolean;
}

export interface Segment {
  type: 'original' | 'broll' | 'transition' | 'text' | 'sfx' | 'music';
  start: number;
  end: number;
  label?: string;
}

export interface ViralityScore {
  overall: number;
  hook: number;
  pacing: number;
  visual: number;
  audio: number;
  cta: number;
  tips: string[];
}

export interface StepProgress {
  id: string;
  name: string;
  nameHe: string;
  status: 'waiting' | 'running' | 'done' | 'error' | 'skipped';
  progress: number;
  error?: string;
}

export interface ExecutionPlan {
  enabledFeatures: string[];
  steps: { id: string; name: string; nameHe: string }[];
  reasoning: string;
}

export interface JobResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  segments: Segment[];
  viralityScore?: ViralityScore;
}

export interface JobVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  prompt: string;
  videoUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  segments: Segment[];
  isActive: boolean;
}

export interface Job {
  id: string;
  status: JobStatus;
  mode: 'upload' | 'prompt';
  prompt: string;
  projectName: string;
  files: FileInfo[];
  options: UserOptions;
  editStyle: EditStyle;
  videoModel: VideoModel;
  preset: PresetType;
  voiceoverStyle?: VoiceoverStyle;
  captionTemplate?: CaptionTemplate;
  targetDuration?: number;
  targetLanguage?: string;
  storyPages?: number;
  brandKit?: BrandKit;
  logo?: FileInfo;
  sourceDocument?: FileInfo;
  aiTwinPhoto?: FileInfo;
  plan?: ExecutionPlan;
  previewData?: PreviewData;
  previewHistory?: PreviewData[];
  approvedAt?: string;
  progress: number;
  currentStep?: string;
  steps: StepProgress[];
  result?: JobResult;
  versions: JobVersion[];
  error?: string;
  createdAt: string;
  updatedAt: string;
  videoIntelligence?: VideoIntelligenceData;
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

export interface VideoIntelligenceData {
  concept: {
    title: string;
    summary: string;
    category: string;
    industry: string;
    targetAudience: string;
    tone: string;
  };
  recommendedConfig?: RecommendedConfig;
  [key: string]: any;
}

export interface RevisionRequest {
  type: 'general' | 'timestamp' | 'duration' | 'chat';
  prompt?: string;
  startTime?: number;
  endTime?: number;
  newDuration?: number;
}

// --- Preview & Approve Types ---

export interface PreviewData {
  id: string;
  createdAt: string;
  keyFrames: PreviewKeyFrame[];
  storyboard: StoryboardScene[];
  timeline: PreviewTimeline;
  enabledFeatures: string[];
  enabledFeaturesCount: number;
  totalFeatures: number;
  subtitlePreview?: string;
  brollPrompts: BRollPreviewItem[];
  musicMood?: string;
  voiceoverStyle?: string;
  editStyle?: string;
  estimatedDuration: number;
  estimatedRenderTime: string;
  estimatedCost: string;
  viralityEstimate?: number;
  script?: ScriptPreview[];
  plan: ExecutionPlan;
  changeRequest?: string;
}

export interface PreviewKeyFrame {
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
