export type JobStatus = 'pending' | 'planning' | 'processing' | 'done' | 'error';

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
  font: string;
  enabled: boolean;
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
  progress: number;
  currentStep?: string;
  steps: StepProgress[];
  result?: JobResult;
  versions: JobVersion[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionRequest {
  type: 'general' | 'timestamp' | 'duration' | 'chat';
  prompt?: string;
  startTime?: number;
  endTime?: number;
  newDuration?: number;
}
