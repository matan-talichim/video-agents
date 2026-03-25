// server/services/pricing.ts — Accurate Real-World API Pricing (March 2026)

import type { ExecutionPlan } from '../types.js';

// === CLAUDE API (Brain, analysis, planning) ===
// Model: Claude Sonnet 4.6
export const CLAUDE_PRICING = {
  inputPerMillion: 3.00,
  outputPerMillion: 15.00,
  estimatePerCall: 0.03,
  estimatePerVisionCall: 0.017,
};

// === DEEPGRAM (Transcription) ===
// Model: Nova-3
export const DEEPGRAM_PRICING = {
  preRecordedPerMinute: 0.0043,
  streamingPerMinute: 0.0077,
};

// === KIE.AI (Video Generation) ===
export const KIE_PRICING: Record<string, any> = {
  'veo-3.1-fast': {
    label: 'Veo 3.1 Fast',
    per8Seconds: 0.40,
    perSecond: 0.05,
  },
  'veo-3-quality': {
    label: 'Veo 3 Quality',
    per8Seconds: 2.00,
    perSecond: 0.25,
  },
  'sora-2': {
    label: 'Sora 2',
    per10Seconds: 0.15,
    perSecond: 0.015,
  },
  'sora-2-pro': {
    label: 'Sora 2 Pro',
    per10Seconds: 0.45,
    perSecond: 0.045,
  },
  'sora-2-pro-hd': {
    label: 'Sora 2 Pro HD',
    per10Seconds: 1.00,
    perSecond: 0.10,
  },
  'kling-v2.5-turbo': {
    label: 'Kling 2.1 Standard',
    per5Seconds: 0.10,
    perSecond: 0.02,
  },
  'kling-v2.5-pro': {
    label: 'Kling 2.1 Pro',
    per5Seconds: 0.25,
    perSecond: 0.05,
  },
  'kling-v2.5-master': {
    label: 'Kling 2.1 Master',
    per5Seconds: 0.80,
    perSecond: 0.16,
  },
  'wan-2.5': {
    label: 'WAN 2.5',
    per5Seconds: 0.15,
    perSecond: 0.03,
  },
  'seedance-1.5-pro': {
    label: 'Seedance 1.5 Pro',
    per5Seconds: 0.20,
    perSecond: 0.04,
  },
  // Other KIE.ai features
  lipsync: 0.30,
  faceSwap: 0.25,
  eyeContact: 0.15,
  upscale: 0.20,
  backgroundRemoval: 0.10,
  talkingPhoto: 0.40,
  imageGeneration: 0.05,
};

// === ELEVENLABS (Voice) ===
export const ELEVENLABS_PRICING = {
  perCharacter: 0.0002,
  perMinuteSpeech: 0.15,
  voiceClone: 0,
  dubbingPerMinute: 0.25,
};

// === SUNO (Music Generation) ===
export const SUNO_PRICING = {
  perSong: 0.02,
  perMinuteMusic: 0.01,
};

// === PEXELS (Stock Footage) — FREE ===
export const PEXELS_PRICING = {
  perSearch: 0,
  perDownload: 0,
};

// === FFMPEG — FREE ===
export const FFMPEG_PRICING = {
  perOperation: 0,
};

// === REMOTION — FREE ===
export const REMOTION_PRICING = {
  perRender: 0,
};

// === Types ===

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

// === TOTAL JOB COST CALCULATOR ===

export function calculateJobCost(plan: ExecutionPlan): JobCostBreakdown {
  const breakdown: CostItem[] = [];
  let total = 0;

  // Brain (Claude API calls)
  const claudeCalls = estimateClaudeCalls(plan);
  const claudeCost = claudeCalls * CLAUDE_PRICING.estimatePerCall;
  if (claudeCost > 0) {
    breakdown.push({ service: 'Claude API (מוח)', cost: claudeCost, unit: `${claudeCalls} קריאות`, free: false });
    total += claudeCost;
  }

  // Transcription (Deepgram)
  if (plan.ingest?.transcribe) {
    const minutes = (typeof plan.export?.targetDuration === 'number' ? plan.export.targetDuration : 300) / 60;
    const cost = minutes * DEEPGRAM_PRICING.preRecordedPerMinute;
    breakdown.push({ service: 'Deepgram (תמלול)', cost, unit: `${Math.ceil(minutes)} דקות`, free: false });
    total += cost;
  }

  // B-Roll (KIE.ai)
  if (plan.generate?.broll && !plan.generate?.stockFootageSearch) {
    const clipCount = 3;
    const model = plan.generate.brollModel || 'kling-v2.5-turbo';
    const modelPricing = KIE_PRICING[model] || KIE_PRICING['kling-v2.5-turbo'];
    const perClip = modelPricing?.per8Seconds || modelPricing?.per5Seconds || modelPricing?.per10Seconds || 0.20;
    const cost = clipCount * perClip;
    breakdown.push({ service: `B-Roll (${modelPricing?.label || model})`, cost, unit: `${clipCount} קליפים`, free: false });
    total += cost;
  }

  // Stock footage (Pexels) — FREE
  if (plan.generate?.stockFootageSearch) {
    breakdown.push({ service: 'Pexels (stock)', cost: 0, unit: 'חינם', free: true });
  }

  // Voiceover (ElevenLabs)
  if (plan.generate?.aiVoiceover) {
    const seconds = typeof plan.export?.targetDuration === 'number' ? plan.export.targetDuration : 60;
    const minutes = seconds / 60;
    const cost = minutes * ELEVENLABS_PRICING.perMinuteSpeech;
    breakdown.push({ service: 'ElevenLabs (קריינות)', cost, unit: `${Math.ceil(minutes)} דקות`, free: false });
    total += cost;
  }

  // Voice cloning
  if (plan.generate?.voiceClone) {
    breakdown.push({ service: 'ElevenLabs (שכפול קול)', cost: 0, unit: 'כלול במנוי', free: true });
  }

  // AI Dubbing
  if (plan.generate?.aiDubbing) {
    const seconds = typeof plan.export?.targetDuration === 'number' ? plan.export.targetDuration : 60;
    const minutes = seconds / 60;
    const ttsCost = minutes * ELEVENLABS_PRICING.perMinuteSpeech;
    const lipsyncCost = KIE_PRICING.lipsync as number;
    const translateCost = CLAUDE_PRICING.estimatePerCall;
    const cost = ttsCost + lipsyncCost + translateCost;
    breakdown.push({ service: 'דיבוב (תרגום+קול+lipsync)', cost, unit: `${Math.ceil(minutes)} דקות`, free: false });
    total += cost;
  }

  // Music (Suno or library)
  if (plan.generate?.musicGeneration) {
    const cost = SUNO_PRICING.perSong;
    breakdown.push({ service: 'Suno (מוזיקה AI)', cost, unit: '1 טראק', free: false });
    total += cost;
  } else if (plan.edit?.music) {
    breakdown.push({ service: 'מוזיקה מספרייה', cost: 0, unit: 'חינם', free: true });
  }

  // AI Twin
  if (plan.generate?.aiTwin) {
    const ttsCost = ELEVENLABS_PRICING.perMinuteSpeech;
    const talkingPhotoCost = KIE_PRICING.talkingPhoto as number;
    const cost = ttsCost + talkingPhotoCost;
    breakdown.push({ service: 'אווטאר AI (Twin)', cost, unit: 'קול+אווטאר', free: false });
    total += cost;
  }

  // Sound effects
  if (plan.generate?.aiSoundEffects) {
    breakdown.push({ service: 'אפקטי סאונד', cost: CLAUDE_PRICING.estimatePerCall, unit: 'ניתוח Claude', free: false });
    total += CLAUDE_PRICING.estimatePerCall;
  }

  // Lipsync
  if (plan.generate?.lipsync) {
    const cost = KIE_PRICING.lipsync as number;
    breakdown.push({ service: 'Lipsync', cost, unit: 'פעולה', free: false });
    total += cost;
  }

  // Face swap
  if (plan.generate?.faceSwap) {
    const cost = KIE_PRICING.faceSwap as number;
    breakdown.push({ service: 'החלפת פנים', cost, unit: 'פעולה', free: false });
    total += cost;
  }

  // Eye contact
  if (plan.edit?.eyeContactCorrection) {
    const cost = KIE_PRICING.eyeContact as number;
    breakdown.push({ service: 'תיקון קשר עין', cost, unit: 'פעולה', free: false });
    total += cost;
  }

  // Upscaling
  if (plan.edit?.upscaling) {
    const cost = KIE_PRICING.upscale as number;
    breakdown.push({ service: 'שדרוג 4K', cost, unit: 'פעולה', free: false });
    total += cost;
  }

  // Thumbnail
  if (plan.generate?.thumbnail) {
    const cost = CLAUDE_PRICING.estimatePerVisionCall;
    breakdown.push({ service: 'תמונה ממוזערת', cost, unit: 'ניתוח Claude', free: false });
    total += cost;
  }

  // Virality score
  if (plan.analyze?.viralityScore) {
    const cost = CLAUDE_PRICING.estimatePerCall;
    breakdown.push({ service: 'ציון ויראליות', cost, unit: 'ניתוח Claude', free: false });
    total += cost;
  }

  // Text to VFX
  if (plan.generate?.textToVFX) {
    const cost = 0.20;
    breakdown.push({ service: 'אפקטים חזותיים (VFX)', cost, unit: 'פעולה', free: false });
    total += cost;
  }

  // Video to Video
  if (plan.generate?.videoToVideo) {
    const cost = 0.25;
    breakdown.push({ service: 'Video to Video', cost, unit: 'פעולה', free: false });
    total += cost;
  }

  // Motion Transfer
  if (plan.generate?.motionTransfer) {
    const cost = 0.30;
    breakdown.push({ service: 'העברת תנועה', cost, unit: 'פעולה', free: false });
    total += cost;
  }

  // FREE services
  breakdown.push({ service: 'FFmpeg (עיבוד וידאו)', cost: 0, unit: 'חינם', free: true });

  if (plan.edit?.subtitles || plan.edit?.kineticTypography) {
    breakdown.push({ service: 'Remotion (אנימציות)', cost: 0, unit: 'חינם', free: true });
  }

  return {
    items: breakdown,
    totalCost: Math.round(total * 1000) / 1000,
    totalCostFormatted: `$${total.toFixed(2)}`,
    freeServicesCount: breakdown.filter(b => b.free).length,
    paidServicesCount: breakdown.filter(b => !b.free).length,
  };
}

function estimateClaudeCalls(plan: ExecutionPlan): number {
  let calls = 1; // Brain plan generation (always)
  if (plan.generate?.brollFromTranscript) calls += 1;
  if (plan.edit?.smartZooms) calls += 1;
  if (plan.generate?.aiSoundEffects) calls += 1;
  if (plan.edit?.subtitleHighlightKeywords) calls += 1;
  if (plan.analyze?.hookDetection) calls += 1;
  if (plan.analyze?.viralityScore) calls += 1;
  if (plan.clean?.removeFillerWords) calls += 1;
  if (plan.clean?.selectBestTake) calls += 1;
  if (plan.ingest?.footageClassification) calls += 1;
  return calls;
}

/** Convert calculateJobCost result to the legacy { total, breakdown } format used by brain.ts */
export function calculateJobCostLegacy(plan: ExecutionPlan): { total: number; breakdown: Record<string, number> } {
  const result = calculateJobCost(plan);
  const breakdown: Record<string, number> = {};
  for (const item of result.items) {
    breakdown[item.service] = item.cost;
  }
  return { total: result.totalCost, breakdown };
}
