import {
  VideoCompositionProps,
  SubtitleEntry,
  SubtitleWord,
  KineticTextEntry,
  LowerThirdConfig,
  CTAConfig,
  LogoConfig,
  ZoomEntry,
  BRollEntry,
  SubtitleStyleConfig,
  BrandKitConfig,
} from '../../src/remotion/types.js';
import type { Job, ExecutionPlan, TranscriptResult, GenerateResult } from '../types.js';

const FPS = 30;

export function buildRemotionProps(
  job: Job,
  plan: ExecutionPlan,
  processedVideoPath: string,
  transcript: TranscriptResult | null,
  generateResult: GenerateResult | null,
  videoDuration: number
): VideoCompositionProps {
  const durationInFrames = Math.ceil(videoDuration * FPS);

  return {
    videoSrc: processedVideoPath,
    durationInFrames,
    fps: FPS,
    width: plan.export.formats.includes('9:16') ? 1080 : 1920,
    height: plan.export.formats.includes('9:16') ? 1920 : 1080,

    subtitles: transcript && plan.edit.subtitles
      ? buildSubtitleEntries(transcript)
      : [],

    subtitleStyle: buildSubtitleStyle(plan, (job as any).brandKit),

    kineticTexts: plan.edit.kineticTypography && (job as any).kineticTextPlan
      ? buildKineticEntries((job as any).kineticTextPlan)
      : [],

    lowerThird: plan.edit.lowerThirds && plan.edit.lowerThirdsName
      ? buildLowerThird(plan)
      : undefined,

    cta: plan.edit.cta && plan.edit.ctaText
      ? buildCTA(plan, durationInFrames)
      : undefined,

    logo: plan.edit.logoWatermark && plan.edit.logoFile
      ? buildLogo(plan)
      : undefined,

    zooms: (job as any).zoomPlan
      ? buildZoomEntries((job as any).zoomPlan)
      : [],

    brollClips: generateResult
      ? buildBRollEntries(generateResult.brollClips)
      : [],

    brandKit: (job as any).brandKit?.enabled
      ? buildBrandKit((job as any).brandKit)
      : undefined,

    musicSyncBeats: (job as any).musicSyncData?.beats,
  };
}

function buildSubtitleEntries(transcript: TranscriptResult): SubtitleEntry[] {
  // Group words into subtitle lines (max 3 words, max 1.5 seconds — word-by-word style)
  const entries: SubtitleEntry[] = [];
  let currentGroup: TranscriptResult['words'][0][] = [];
  let groupStart = 0;

  for (const word of transcript.words) {
    if (currentGroup.length === 0) {
      groupStart = word.start;
    }
    currentGroup.push(word);

    const isEndOfSentence = /[.!?]$/.test(word.word);
    const isTooLong = currentGroup.length >= 3;
    const isTooLongDuration = (word.end - groupStart) >= 1.5;

    if (isEndOfSentence || isTooLong || isTooLongDuration) {
      entries.push({
        text: currentGroup.map(w => w.word).join(' '),
        startFrame: Math.round(groupStart * FPS),
        endFrame: Math.round(word.end * FPS),
        words: currentGroup.map(w => ({
          word: w.word,
          startFrame: Math.round(w.start * FPS),
          endFrame: Math.round(w.end * FPS),
        })),
        highlightWords: [], // Will be filled by Claude keyword detection
      });
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    const lastWord = currentGroup[currentGroup.length - 1];
    entries.push({
      text: currentGroup.map(w => w.word).join(' '),
      startFrame: Math.round(groupStart * FPS),
      endFrame: Math.round(lastWord.end * FPS),
      words: currentGroup.map(w => ({
        word: w.word,
        startFrame: Math.round(w.start * FPS),
        endFrame: Math.round(w.end * FPS),
      })),
      highlightWords: [],
    });
  }

  return entries;
}

function buildSubtitleStyle(plan: ExecutionPlan, brandKit?: any): SubtitleStyleConfig {
  return {
    template: (plan.edit.captionTemplate || plan.edit.subtitleStyle || 'word-by-word') as any,
    fontSize: 22,  // Small readable size — NOT 42+ which covers the presenter
    fontFamily: brandKit?.font || 'Heebo, sans-serif',
    color: '#ffffff',
    highlightColor: brandKit?.secondaryColor || '#7c3aed',
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: (plan.edit.subtitlePosition || 'bottom') as any,
  };
}

function buildLowerThird(plan: ExecutionPlan): LowerThirdConfig {
  return {
    name: plan.edit.lowerThirdsName || '',
    title: plan.edit.lowerThirdsTitle || '',
    startFrame: 2 * FPS, // appears at 2 seconds
    durationFrames: 4 * FPS, // holds for 4 seconds
    style: 'glass',
    accentColor: '#7c3aed',
    position: 'bottom-right',
  };
}

function buildCTA(plan: ExecutionPlan, totalFrames: number): CTAConfig {
  return {
    text: plan.edit.ctaText || 'צרו קשר',
    startFrame: totalFrames - (5 * FPS), // last 5 seconds
    durationFrames: 5 * FPS,
    style: 'pulse',
    backgroundColor: '#7c3aed',
    textColor: '#ffffff',
    position: 'bottom-center',
  };
}

function buildLogo(plan: ExecutionPlan): LogoConfig {
  return {
    src: plan.edit.logoFile || '',
    position: 'bottom-right',
    size: 120,
    opacity: 0.7,
    fadeInFrames: 15,
  };
}

function buildZoomEntries(zoomPlan: any[]): ZoomEntry[] {
  return zoomPlan.map(z => ({
    startFrame: Math.round(z.start * FPS),
    endFrame: Math.round(z.end * FPS),
    zoomFactor: z.zoom_factor || 1.15,
    centerX: 0.5,
    centerY: 0.4,
  }));
}

function buildBRollEntries(clips: any[]): BRollEntry[] {
  return clips.map(c => ({
    src: c.path,
    startFrame: Math.round(c.timestamp * FPS),
    durationFrames: Math.round(c.duration * FPS),
  }));
}

function buildKineticEntries(plan: any[]): KineticTextEntry[] {
  return plan.map(k => ({
    text: k.text,
    startFrame: Math.round(k.startTime * FPS),
    endFrame: Math.round(k.endTime * FPS),
    animation: k.animation || 'bounce',
    fontSize: k.fontSize === 'large' ? 72 : k.fontSize === 'medium' ? 54 : 36,
    color: '#ffffff',
    position: { x: 'center' as const, y: 'center' as const },
  }));
}

function buildBrandKit(kit: any): BrandKitConfig {
  return {
    primaryColor: kit.primaryColor || '#1a1a2e',
    secondaryColor: kit.secondaryColor || '#7c3aed',
    fontFamily: kit.font || 'Heebo, sans-serif',
    accentColor: kit.secondaryColor || '#7c3aed',
  };
}
