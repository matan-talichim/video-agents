// src/data/videoModels.ts — Full KIE.ai video model catalog with real pricing

export interface VideoModelInfo {
  id: string;
  name: string;
  provider: string;
  pricePerClip: number;
  pricePerSecond: number;
  clipDuration: number;
  speed: 1 | 2 | 3 | 4 | 5;
  quality: 1 | 2 | 3 | 4 | 5;
  cost: 1 | 2 | 3 | 4 | 5;
  bestFor: string;
  features: string[];
  apiEndpoint: string;
  inputTypes: ('text-to-video' | 'image-to-video')[];
}

export const VIDEO_MODELS: VideoModelInfo[] = [
  // === GOOGLE VEO ===
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 Fast',
    provider: 'Google',
    pricePerClip: 0.40,
    pricePerSecond: 0.05,
    clipDuration: 8,
    speed: 5, quality: 4, cost: 2,
    bestFor: 'סינמטי, נדל"ן, טבע',
    features: ['אודיו מובנה', '1080p', 'text-to-video'],
    apiEndpoint: 'veo3-fast',
    inputTypes: ['text-to-video'],
  },
  {
    id: 'veo-3.1-quality',
    name: 'Veo 3.1 Quality',
    provider: 'Google',
    pricePerClip: 2.00,
    pricePerSecond: 0.25,
    clipDuration: 8,
    speed: 2, quality: 5, cost: 5,
    bestFor: 'סינמטי premium, פרסומות יוקרה',
    features: ['אודיו מובנה', '1080p-4K', 'text-to-video', 'image-to-video'],
    apiEndpoint: 'veo3-quality',
    inputTypes: ['text-to-video', 'image-to-video'],
  },

  // === KLING ===
  {
    id: 'kling-3.0',
    name: 'Kling 3.0',
    provider: 'Kling',
    pricePerClip: 0.50,
    pricePerSecond: 0.05,
    clipDuration: 10,
    speed: 3, quality: 5, cost: 2,
    bestFor: 'איכות גבוהה, סצנות מורכבות',
    features: ['1080p', '4K@60fps', 'motion-control', 'text+image-to-video'],
    apiEndpoint: 'kling-3.0',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    provider: 'Kling',
    pricePerClip: 0.30,
    pricePerSecond: 0.03,
    clipDuration: 10,
    speed: 3, quality: 4, cost: 2,
    bestFor: 'אודיו מובנה, lip sync',
    features: ['אודיו מסונכרן', 'lip sync', '1080p', 'motion-control'],
    apiEndpoint: 'kling-2.6',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-2.5-turbo',
    name: 'Kling 2.5 Turbo',
    provider: 'Kling',
    pricePerClip: 0.15,
    pricePerSecond: 0.02,
    clipDuration: 5,
    speed: 5, quality: 3, cost: 1,
    bestFor: 'מהיר וזול, רשתות חברתיות',
    features: ['מהיר', '720p-1080p'],
    apiEndpoint: 'kling-2.5-turbo',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-2.1-master',
    name: 'Kling 2.1 Master',
    provider: 'Kling',
    pricePerClip: 0.10,
    pricePerSecond: 0.02,
    clipDuration: 5,
    speed: 4, quality: 3, cost: 1,
    bestFor: 'מהיר וזול, e-commerce',
    features: ['מהיר', 'תנועה'],
    apiEndpoint: 'kling-2.1-master',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-avatar-pro',
    name: 'Kling AI Avatar Pro',
    provider: 'Kling',
    pricePerClip: 0.80,
    pricePerSecond: 0.08,
    clipDuration: 10,
    speed: 2, quality: 4, cost: 3,
    bestFor: 'אווטאר דובר, AI Twin',
    features: ['avatar', 'lip sync', 'face animation'],
    apiEndpoint: 'kling-avatar-pro',
    inputTypes: ['image-to-video'],
  },

  // === BYTEDANCE / SEEDANCE ===
  {
    id: 'seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    pricePerClip: 0.20,
    pricePerSecond: 0.04,
    clipDuration: 5,
    speed: 3, quality: 4, cost: 2,
    bestFor: 'מוצרים, e-commerce, תנועה',
    features: ['character consistency', 'motion mimicry'],
    apiEndpoint: 'seedance-1.5-pro',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'bytedance-v1-pro',
    name: 'ByteDance V1 Pro',
    provider: 'ByteDance',
    pricePerClip: 0.25,
    pricePerSecond: 0.05,
    clipDuration: 5,
    speed: 3, quality: 4, cost: 2,
    bestFor: 'סגנון אמנותי, אבסטרקטי',
    features: ['image-to-video', 'text-to-video'],
    apiEndpoint: 'bytedance-v1-pro',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'bytedance-v1-pro-fast',
    name: 'ByteDance V1 Pro Fast',
    provider: 'ByteDance',
    pricePerClip: 0.15,
    pricePerSecond: 0.03,
    clipDuration: 5,
    speed: 5, quality: 3, cost: 1,
    bestFor: 'מהיר, drafts',
    features: ['fast', 'image-to-video'],
    apiEndpoint: 'bytedance-v1-pro-fast',
    inputTypes: ['image-to-video'],
  },

  // === SORA 2 ===
  {
    id: 'sora-2',
    name: 'Sora 2',
    provider: 'OpenAI',
    pricePerClip: 0.50,
    pricePerSecond: 0.05,
    clipDuration: 10,
    speed: 3, quality: 4, cost: 3,
    bestFor: 'סיפור, creative, פיזיקה ריאלית',
    features: ['אודיו מובנה', '720p', 'characters'],
    apiEndpoint: 'sora-2',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    provider: 'OpenAI',
    pricePerClip: 1.50,
    pricePerSecond: 0.10,
    clipDuration: 15,
    speed: 2, quality: 5, cost: 4,
    bestFor: 'סינמטי premium, 1080p',
    features: ['1080p HD', 'אודיו', '15s', 'characters pro'],
    apiEndpoint: 'sora-2-pro',
    inputTypes: ['text-to-video', 'image-to-video'],
  },

  // === WAN ===
  {
    id: 'wan-2.6',
    name: 'WAN 2.6',
    provider: 'WAN',
    pricePerClip: 0.30,
    pricePerSecond: 0.02,
    clipDuration: 15,
    speed: 3, quality: 4, cost: 2,
    bestFor: 'multi-shot, עקביות דמויות',
    features: ['1080p', 'אודיו', '15s', 'video-to-video'],
    apiEndpoint: 'wan-2.6',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'wan-2.5',
    name: 'WAN 2.5',
    provider: 'WAN',
    pricePerClip: 0.15,
    pricePerSecond: 0.03,
    clipDuration: 5,
    speed: 4, quality: 3, cost: 1,
    bestFor: 'זול ומהיר',
    features: ['text+image-to-video'],
    apiEndpoint: 'wan-2.5',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'wan-2.6-flash',
    name: 'WAN 2.6 Flash',
    provider: 'WAN',
    pricePerClip: 0.10,
    pricePerSecond: 0.01,
    clipDuration: 8,
    speed: 5, quality: 2, cost: 1,
    bestFor: 'הכי זול, drafts, טסטים',
    features: ['fast', 'image-to-video', 'video-to-video'],
    apiEndpoint: 'wan-2.6-flash',
    inputTypes: ['image-to-video'],
  },

  // === HAILUO ===
  {
    id: 'hailuo-2.3-pro',
    name: 'Hailuo 2.3 Pro',
    provider: 'Hailuo',
    pricePerClip: 0.40,
    pricePerSecond: 0.05,
    clipDuration: 8,
    speed: 3, quality: 4, cost: 2,
    bestFor: 'ריאליזם, תנועה חלקה',
    features: ['1080p', 'image-to-video', 'text-to-video'],
    apiEndpoint: 'hailuo-2.3-pro',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'hailuo-standard',
    name: 'Hailuo Standard',
    provider: 'Hailuo',
    pricePerClip: 0.20,
    pricePerSecond: 0.025,
    clipDuration: 8,
    speed: 4, quality: 3, cost: 1,
    bestFor: 'זול, איכות סבירה',
    features: ['text-to-video', 'image-to-video'],
    apiEndpoint: 'hailuo-standard',
    inputTypes: ['text-to-video', 'image-to-video'],
  },

  // === RUNWAY ===
  {
    id: 'runway-gen4',
    name: 'Runway Gen-4',
    provider: 'Runway',
    pricePerClip: 0.50,
    pricePerSecond: 0.05,
    clipDuration: 10,
    speed: 3, quality: 4, cost: 3,
    bestFor: 'סינמטי, VFX, style transfer',
    features: ['image-to-video', 'text-to-video', 'style transfer'],
    apiEndpoint: 'runway-gen4',
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'runway-aleph',
    name: 'Runway Aleph',
    provider: 'Runway',
    pricePerClip: 0.60,
    pricePerSecond: 0.06,
    clipDuration: 10,
    speed: 2, quality: 5, cost: 3,
    bestFor: 'video transformation, AI editing',
    features: ['video-to-video', 'scene editing', 'background change'],
    apiEndpoint: 'runway-aleph',
    inputTypes: ['text-to-video', 'image-to-video'],
  },

  // === GROK IMAGINE ===
  {
    id: 'grok-imagine',
    name: 'Grok Imagine',
    provider: 'xAI',
    pricePerClip: 0.30,
    pricePerSecond: 0.04,
    clipDuration: 8,
    speed: 4, quality: 3, cost: 2,
    bestFor: 'creative, ייחודי',
    features: ['text-to-video', 'image-to-video', 'upscale', 'extend'],
    apiEndpoint: 'grok-imagine',
    inputTypes: ['text-to-video', 'image-to-video'],
  },

  // === SPECIAL: TOPAZ UPSCALE ===
  {
    id: 'topaz-upscale',
    name: 'Topaz Video Upscale',
    provider: 'Topaz',
    pricePerClip: 0.20,
    pricePerSecond: 0.02,
    clipDuration: 0,
    speed: 2, quality: 5, cost: 2,
    bestFor: 'שדרוג רזולוציה AI (720p→4K)',
    features: ['upscale', 'denoise', 'enhance'],
    apiEndpoint: 'topaz-video-upscale',
    inputTypes: [],
  },

  // === SPECIAL: INFINITALK ===
  {
    id: 'infinitalk',
    name: 'Infinitalk',
    provider: 'Infinitalk',
    pricePerClip: 0.40,
    pricePerSecond: 0.04,
    clipDuration: 10,
    speed: 3, quality: 4, cost: 2,
    bestFor: 'lip sync מאודיו, AI Twin',
    features: ['audio-to-video', 'lip sync', 'avatar'],
    apiEndpoint: 'infinitalk',
    inputTypes: [],
  },
];

// Group models for the UI
export const MODEL_GROUPS = [
  { name: 'מומלצים', models: ['veo-3.1-fast', 'kling-3.0', 'seedance-1.5-pro'] },
  { name: 'Google', models: ['veo-3.1-fast', 'veo-3.1-quality'] },
  { name: 'Kling', models: ['kling-3.0', 'kling-2.6', 'kling-2.5-turbo', 'kling-2.1-master', 'kling-avatar-pro'] },
  { name: 'ByteDance', models: ['seedance-1.5-pro', 'bytedance-v1-pro', 'bytedance-v1-pro-fast'] },
  { name: 'OpenAI', models: ['sora-2', 'sora-2-pro'] },
  { name: 'WAN', models: ['wan-2.6', 'wan-2.5', 'wan-2.6-flash'] },
  { name: 'Hailuo', models: ['hailuo-2.3-pro', 'hailuo-standard'] },
  { name: 'Runway', models: ['runway-gen4', 'runway-aleph'] },
  { name: 'אחר', models: ['grok-imagine', 'topaz-upscale', 'infinitalk'] },
];

// Default recommended models shown on the main screen
export const RECOMMENDED_MODEL_IDS = ['veo-3.1-fast', 'kling-3.0', 'seedance-1.5-pro', 'kling-2.5-turbo', 'wan-2.6'];

// All valid model IDs
export const ALL_MODEL_IDS = VIDEO_MODELS.map(m => m.id);

// Lookup helper
export function getModelById(id: string): VideoModelInfo | undefined {
  return VIDEO_MODELS.find(m => m.id === id);
}
