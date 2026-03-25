export interface VideoCompositionProps {
  // Source video
  videoSrc: string; // path to the FFmpeg-processed video (trimmed, cleaned, color graded)

  // Timing
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;

  // Subtitles
  subtitles: SubtitleEntry[];
  subtitleStyle: SubtitleStyleConfig;

  // Kinetic typography
  kineticTexts: KineticTextEntry[];

  // Lower third
  lowerThird?: LowerThirdConfig;

  // CTA
  cta?: CTAConfig;

  // Logo
  logo?: LogoConfig;

  // Smart zooms
  zooms: ZoomEntry[];

  // B-Roll
  brollClips: BRollEntry[];

  // Brand kit
  brandKit?: BrandKitConfig;

  // Music sync data
  musicSyncBeats?: number[];
}

export interface SubtitleEntry {
  text: string;
  startFrame: number;
  endFrame: number;
  words: SubtitleWord[];
  highlightWords: string[]; // words to highlight in accent color
}

export interface SubtitleWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface SubtitleStyleConfig {
  template: 'word-by-word' | 'highlight' | 'karaoke' | 'bounce' | 'typewriter' | 'minimal' | 'bold-center' | 'gradient' | 'black-bg' | 'neon';
  fontSize: number;
  fontFamily: string;
  color: string;
  highlightColor: string;
  backgroundColor: string;
  position: 'bottom' | 'center' | 'top';
}

export interface KineticTextEntry {
  text: string;
  startFrame: number;
  endFrame: number;
  animation: 'bounce' | 'explode' | 'typewriter' | 'wave' | 'shake' | 'scale-up' | 'slide-up';
  fontSize: number;
  color: string;
  position: { x: 'center' | 'left' | 'right'; y: 'center' | 'top' | 'bottom' };
}

export interface LowerThirdConfig {
  name: string;
  title: string;
  startFrame: number;
  durationFrames: number;
  style: 'glass' | 'solid' | 'minimal' | 'accent-bar';
  accentColor: string;
  position: 'bottom-right' | 'bottom-left';
}

export interface CTAConfig {
  text: string;
  startFrame: number;
  durationFrames: number;
  style: 'pulse' | 'scale-in' | 'slide-up' | 'glow';
  backgroundColor: string;
  textColor: string;
  position: 'bottom-center' | 'center';
}

export interface LogoConfig {
  src: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: number; // width in pixels
  opacity: number;
  fadeInFrames: number;
}

export interface ZoomEntry {
  startFrame: number;
  endFrame: number;
  zoomFactor: number; // 1.0 = no zoom, 1.3 = 30% zoom
  centerX: number; // 0-1 (percent of width)
  centerY: number; // 0-1 (percent of height)
}

export interface BRollEntry {
  src: string;
  startFrame: number;
  durationFrames: number;
}

export interface BrandKitConfig {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  accentColor: string;
}
