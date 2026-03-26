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

// === KIE.AI (Video Generation) — Full model catalog ===
export const KIE_PRICING: Record<string, any> = {
  // === Google Veo ===
  'veo-3.1-fast': {
    label: 'Veo 3.1 Fast',
    perClip: 0.40,
    perSecond: 0.05,
    clipDuration: 8,
  },
  'veo-3.1-quality': {
    label: 'Veo 3.1 Quality',
    perClip: 2.00,
    perSecond: 0.25,
    clipDuration: 8,
  },
  // === Kling ===
  'kling-3.0': {
    label: 'Kling 3.0',
    perClip: 0.50,
    perSecond: 0.05,
    clipDuration: 10,
  },
  'kling-2.6': {
    label: 'Kling 2.6',
    perClip: 0.30,
    perSecond: 0.03,
    clipDuration: 10,
  },
  'kling-2.5-turbo': {
    label: 'Kling 2.5 Turbo',
    perClip: 0.15,
    perSecond: 0.02,
    clipDuration: 5,
  },
  'kling-2.1-master': {
    label: 'Kling 2.1 Master',
    perClip: 0.10,
    perSecond: 0.02,
    clipDuration: 5,
  },
  'kling-avatar-pro': {
    label: 'Kling AI Avatar Pro',
    perClip: 0.80,
    perSecond: 0.08,
    clipDuration: 10,
  },
  // === ByteDance / Seedance ===
  'seedance-1.5-pro': {
    label: 'Seedance 1.5 Pro',
    perClip: 0.20,
    perSecond: 0.04,
    clipDuration: 5,
  },
  'bytedance-v1-pro': {
    label: 'ByteDance V1 Pro',
    perClip: 0.25,
    perSecond: 0.05,
    clipDuration: 5,
  },
  'bytedance-v1-pro-fast': {
    label: 'ByteDance V1 Pro Fast',
    perClip: 0.15,
    perSecond: 0.03,
    clipDuration: 5,
  },
  // === OpenAI Sora ===
  'sora-2': {
    label: 'Sora 2',
    perClip: 0.50,
    perSecond: 0.05,
    clipDuration: 10,
  },
  'sora-2-pro': {
    label: 'Sora 2 Pro',
    perClip: 1.50,
    perSecond: 0.10,
    clipDuration: 15,
  },
  // === WAN ===
  'wan-2.6': {
    label: 'WAN 2.6',
    perClip: 0.30,
    perSecond: 0.02,
    clipDuration: 15,
  },
  'wan-2.5': {
    label: 'WAN 2.5',
    perClip: 0.15,
    perSecond: 0.03,
    clipDuration: 5,
  },
  'wan-2.6-flash': {
    label: 'WAN 2.6 Flash',
    perClip: 0.10,
    perSecond: 0.01,
    clipDuration: 8,
  },
  // === Hailuo ===
  'hailuo-2.3-pro': {
    label: 'Hailuo 2.3 Pro',
    perClip: 0.40,
    perSecond: 0.05,
    clipDuration: 8,
  },
  'hailuo-standard': {
    label: 'Hailuo Standard',
    perClip: 0.20,
    perSecond: 0.025,
    clipDuration: 8,
  },
  // === Runway ===
  'runway-gen4': {
    label: 'Runway Gen-4',
    perClip: 0.50,
    perSecond: 0.05,
    clipDuration: 10,
  },
  'runway-aleph': {
    label: 'Runway Aleph',
    perClip: 0.60,
    perSecond: 0.06,
    clipDuration: 10,
  },
  // === Other ===
  'grok-imagine': {
    label: 'Grok Imagine',
    perClip: 0.30,
    perSecond: 0.04,
    clipDuration: 8,
  },
  'topaz-upscale': {
    label: 'Topaz Video Upscale',
    perClip: 0.20,
    perSecond: 0.02,
    clipDuration: 0,
  },
  'infinitalk': {
    label: 'Infinitalk',
    perClip: 0.40,
    perSecond: 0.04,
    clipDuration: 10,
  },
  // Legacy aliases (backwards compatibility)
  'kling-v2.5-turbo': {
    label: 'Kling 2.5 Turbo',
    perClip: 0.15,
    perSecond: 0.02,
    clipDuration: 5,
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
    const duration = typeof plan.export?.targetDuration === 'number' ? plan.export.targetDuration : 60;
    const clipCount = (plan.generate as Record<string, unknown>).estimatedBRollClips as number
      || estimateBRollClips(duration);
    const model = plan.generate.brollModel || 'kling-v2.5-turbo';
    const modelPricing = KIE_PRICING[model] || KIE_PRICING['kling-v2.5-turbo'];
    const perClip = modelPricing?.perClip || modelPricing?.per8Seconds || modelPricing?.per5Seconds || modelPricing?.per10Seconds || 0.20;
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

  // QA + Hooks + A/B Testing + Retention + Loop
  // 1 Vision call (QA) + 3 text calls (hooks, retention, loop) = ~$0.11
  const qaHooksCost =
    CLAUDE_PRICING.estimatePerVisionCall +  // QA check
    CLAUDE_PRICING.estimatePerCall * 3;      // hooks + retention + loop
  breakdown.push({
    service: 'בקרת איכות + הוקים + A/B',
    cost: qaHooksCost,
    unit: '4 קריאות Claude',
    free: false,
  });
  total += qaHooksCost;

  // Thumbnail optimization + multi-platform planning + marketing plan
  // 1 Vision call (thumbnail) = $0.017, 1 text call (multi-platform) = $0.03, 1 text call (marketing) = $0.03
  const marketingThumbCost = CLAUDE_PRICING.estimatePerVisionCall + CLAUDE_PRICING.estimatePerCall * 2;
  breakdown.push({
    service: 'תוכנית שיווק + thumbnail + פלטפורמות',
    cost: marketingThumbCost,
    unit: '3 קריאות Claude',
    free: false,
  });
  total += marketingThumbCost;

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

/** Calculate number of B-Roll clips based on video duration */
export function estimateBRollClips(durationSeconds: number): number {
  if (durationSeconds <= 15) return 2;
  if (durationSeconds <= 30) return 3;
  if (durationSeconds <= 60) return 5;
  if (durationSeconds <= 90) return 7;
  return Math.ceil(durationSeconds / 12); // roughly 1 clip per 12 seconds
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
