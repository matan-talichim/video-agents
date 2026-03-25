// src/utils/costCalculator.ts — Frontend live cost calculator
// Pricing constants duplicated from server/services/pricing.ts (plain numbers, no server deps)

import type { CostItem, VideoModel } from '../types';

// === Pricing Constants ===

const CLAUDE_PRICING = {
  estimatePerCall: 0.03,
  estimatePerVisionCall: 0.017,
};

const DEEPGRAM_PRICING = {
  preRecordedPerMinute: 0.0043,
};

// Model ID → pricing lookup
// Frontend uses short IDs (veo3.1, sora2, etc.) — map to costs
const MODEL_PRICING: Record<string, { label: string; perClip: number; perSecond: number }> = {
  'veo3.1':      { label: 'Veo 3.1 Fast',      perClip: 0.40, perSecond: 0.05 },
  'sora2':       { label: 'Sora 2',             perClip: 0.15, perSecond: 0.015 },
  'kling2.5':    { label: 'Kling 2.1 Standard', perClip: 0.10, perSecond: 0.02 },
  'wan2.5':      { label: 'WAN 2.5',            perClip: 0.15, perSecond: 0.03 },
  'seedance1.5': { label: 'Seedance 1.5 Pro',   perClip: 0.20, perSecond: 0.04 },
};

const KIE_FEATURES = {
  lipsync: 0.30,
  faceSwap: 0.25,
  eyeContact: 0.15,
  upscale: 0.20,
  talkingPhoto: 0.40,
};

const ELEVENLABS_PRICING = {
  perMinuteSpeech: 0.15,
};

const SUNO_PRICING = {
  perSong: 0.02,
};

// === Input type ===

export interface LiveCostSelections {
  model: VideoModel;
  duration: number;          // seconds (default 60 if undefined)
  options: Record<string, boolean>;
  editStyle?: string;
  voiceoverStyle?: string;
  preset?: string;
  aiTwin: boolean;
  aiDubbing: boolean;
  voiceClone: boolean;
  hasFiles: boolean;         // upload mode = transcription needed
}

// === B-Roll clip count calculator ===

export function estimateBRollClips(durationSeconds: number): number {
  if (durationSeconds <= 15) return 2;
  if (durationSeconds <= 30) return 3;
  if (durationSeconds <= 60) return 5;
  if (durationSeconds <= 90) return 7;
  return Math.ceil(durationSeconds / 12); // roughly 1 clip per 12 seconds
}

// === Calculator ===

export function calculateLiveCost(s: LiveCostSelections): { items: CostItem[]; total: number } {
  const items: CostItem[] = [];
  let total = 0;

  const add = (service: string, cost: number, unit: string, free: boolean) => {
    items.push({ service, cost, unit, free });
    if (!free) total += cost;
  };

  const dur = s.duration || 60;
  const durMinutes = dur / 60;

  // --- Always-on: Claude Brain ---
  // Estimate Claude calls based on what's enabled
  let claudeCalls = 1; // Brain plan always
  if (s.hasFiles) claudeCalls += 2; // transcription analysis + smart zooms
  if (s.options.viralityScore) claudeCalls += 1;
  if (s.options.soundEffects) claudeCalls += 1;
  if (s.options.hebrewSubtitles) claudeCalls += 1; // keyword detection
  if (s.options.removeSilences) claudeCalls += 1;   // filler word check
  if (s.options.thumbnailGeneration) claudeCalls += 1;

  const claudeCost = claudeCalls * CLAUDE_PRICING.estimatePerCall;
  add('Claude API (מוח)', claudeCost, `${claudeCalls} קריאות`, false);

  // --- Transcription (Deepgram) — only if user uploads files ---
  if (s.hasFiles) {
    const cost = durMinutes * DEEPGRAM_PRICING.preRecordedPerMinute;
    add('Deepgram (תמלול)', cost, `${Math.ceil(durMinutes)} דקות`, false);
  }

  // --- B-Roll ---
  if (s.options.addBRoll) {
    const modelInfo = MODEL_PRICING[s.model] || MODEL_PRICING['kling2.5'];
    const clipCount = estimateBRollClips(dur);
    const cost = clipCount * modelInfo.perClip;
    add(`B-Roll (${modelInfo.label}) — ${clipCount} קליפים`, cost, `${clipCount} קליפים × $${modelInfo.perClip.toFixed(2)}`, false);
  }

  // --- Stock footage (always available, free) ---
  add('Pexels (stock)', 0, 'חינם', true);

  // --- Music ---
  if (s.options.energeticMusic || s.options.calmMusic) {
    add('Suno (מוזיקה AI)', SUNO_PRICING.perSong, '1 טראק', false);
  } else if (s.options.backgroundMusic) {
    add('מוזיקה מספרייה', 0, 'חינם', true);
  }

  // --- Voiceover (prompt mode = no files) ---
  if (!s.hasFiles && s.voiceoverStyle) {
    const cost = durMinutes * ELEVENLABS_PRICING.perMinuteSpeech;
    add('ElevenLabs (קריינות)', cost, `${Math.ceil(durMinutes)} דקות`, false);
  }

  // --- Voice Clone ---
  if (s.voiceClone) {
    add('ElevenLabs (שכפול קול)', 0, 'כלול במנוי', true);
  }

  // --- AI Dubbing ---
  if (s.aiDubbing) {
    const ttsCost = durMinutes * ELEVENLABS_PRICING.perMinuteSpeech;
    const lipsyncCost = KIE_FEATURES.lipsync;
    const translateCost = CLAUDE_PRICING.estimatePerCall;
    add('דיבוב (תרגום+קול+lipsync)', ttsCost + lipsyncCost + translateCost, `${Math.ceil(durMinutes)} דקות`, false);
  }

  // --- AI Twin ---
  if (s.aiTwin) {
    const cost = ELEVENLABS_PRICING.perMinuteSpeech + KIE_FEATURES.talkingPhoto;
    add('אווטאר AI (Twin)', cost, 'קול+אווטאר', false);
  }

  // --- Sound Effects ---
  if (s.options.soundEffects) {
    add('אפקטי סאונד', CLAUDE_PRICING.estimatePerCall, 'ניתוח Claude', false);
  }

  // --- Thumbnail ---
  if (s.options.thumbnailGeneration) {
    add('תמונה ממוזערת', CLAUDE_PRICING.estimatePerVisionCall, 'ניתוח Claude', false);
  }

  // --- Virality Score ---
  if (s.options.viralityScore) {
    add('ציון ויראליות', CLAUDE_PRICING.estimatePerCall, 'ניתוח Claude', false);
  }

  // --- Subtitles (Remotion — free) ---
  if (s.options.hebrewSubtitles || s.options.englishSubtitles) {
    add('Remotion (כתוביות)', 0, 'חינם', true);
  }

  // --- Color correction (FFmpeg — free) ---
  if (s.options.colorCorrection) {
    add('תיקון צבע (FFmpeg)', 0, 'חינם', true);
  }

  // --- Auto Zoom (FFmpeg — free) ---
  if (s.options.autoZoom) {
    add('זום אוטומטי (FFmpeg)', 0, 'חינם', true);
  }

  // --- Transitions (FFmpeg — free) ---
  if (s.options.transitions) {
    add('מעברים (FFmpeg)', 0, 'חינם', true);
  }

  // --- FFmpeg processing (always) ---
  add('FFmpeg (עיבוד וידאו)', 0, 'חינם', true);

  return {
    items,
    total: Math.round(total * 1000) / 1000,
  };
}
