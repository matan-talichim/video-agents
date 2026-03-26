import { Router } from 'express';

const router = Router();

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  speed: number;      // 1-5
  quality: number;     // 1-5
  cost: number;        // 1-5 (1=cheap, 5=expensive)
  pricePerClip: number;
  pricePerSecond: number;
  description: string;
  maxDuration: number; // seconds
  resolutions: string[];
  inputTypes: string[];
}

const models: ModelInfo[] = [
  // === Google Veo ===
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 Fast',
    provider: 'Google',
    speed: 5, quality: 4, cost: 2,
    pricePerClip: 0.40, pricePerSecond: 0.05,
    description: 'סינמטי, נדל"ן, טבע — אודיו מובנה',
    maxDuration: 8,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video'],
  },
  {
    id: 'veo-3.1-quality',
    name: 'Veo 3.1 Quality',
    provider: 'Google',
    speed: 2, quality: 5, cost: 5,
    pricePerClip: 2.00, pricePerSecond: 0.25,
    description: 'סינמטי premium, פרסומות יוקרה',
    maxDuration: 8,
    resolutions: ['1080p', '4K'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  // === Kling ===
  {
    id: 'kling-3.0',
    name: 'Kling 3.0',
    provider: 'Kling',
    speed: 3, quality: 5, cost: 2,
    pricePerClip: 0.50, pricePerSecond: 0.05,
    description: 'איכות גבוהה, סצנות מורכבות',
    maxDuration: 10,
    resolutions: ['1080p', '4K'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    provider: 'Kling',
    speed: 3, quality: 4, cost: 2,
    pricePerClip: 0.30, pricePerSecond: 0.03,
    description: 'אודיו מובנה, lip sync',
    maxDuration: 10,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-2.5-turbo',
    name: 'Kling 2.5 Turbo',
    provider: 'Kling',
    speed: 5, quality: 3, cost: 1,
    pricePerClip: 0.15, pricePerSecond: 0.02,
    description: 'מהיר וזול, רשתות חברתיות',
    maxDuration: 5,
    resolutions: ['720p', '1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-2.1-master',
    name: 'Kling 2.1 Master',
    provider: 'Kling',
    speed: 4, quality: 3, cost: 1,
    pricePerClip: 0.10, pricePerSecond: 0.02,
    description: 'מהיר וזול, e-commerce',
    maxDuration: 5,
    resolutions: ['720p', '1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'kling-avatar-pro',
    name: 'Kling AI Avatar Pro',
    provider: 'Kling',
    speed: 2, quality: 4, cost: 3,
    pricePerClip: 0.80, pricePerSecond: 0.08,
    description: 'אווטאר דובר, AI Twin',
    maxDuration: 10,
    resolutions: ['1080p'],
    inputTypes: ['image-to-video'],
  },
  // === ByteDance / Seedance ===
  {
    id: 'seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    speed: 3, quality: 4, cost: 2,
    pricePerClip: 0.20, pricePerSecond: 0.04,
    description: 'מוצרים, e-commerce, תנועה',
    maxDuration: 5,
    resolutions: ['720p', '1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'bytedance-v1-pro',
    name: 'ByteDance V1 Pro',
    provider: 'ByteDance',
    speed: 3, quality: 4, cost: 2,
    pricePerClip: 0.25, pricePerSecond: 0.05,
    description: 'סגנון אמנותי, אבסטרקטי',
    maxDuration: 5,
    resolutions: ['720p', '1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'bytedance-v1-pro-fast',
    name: 'ByteDance V1 Pro Fast',
    provider: 'ByteDance',
    speed: 5, quality: 3, cost: 1,
    pricePerClip: 0.15, pricePerSecond: 0.03,
    description: 'מהיר, drafts',
    maxDuration: 5,
    resolutions: ['720p'],
    inputTypes: ['image-to-video'],
  },
  // === OpenAI Sora ===
  {
    id: 'sora-2',
    name: 'Sora 2',
    provider: 'OpenAI',
    speed: 3, quality: 4, cost: 3,
    pricePerClip: 0.50, pricePerSecond: 0.05,
    description: 'סיפור, creative, פיזיקה ריאלית',
    maxDuration: 10,
    resolutions: ['720p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    provider: 'OpenAI',
    speed: 2, quality: 5, cost: 4,
    pricePerClip: 1.50, pricePerSecond: 0.10,
    description: 'סינמטי premium, 1080p',
    maxDuration: 15,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  // === WAN ===
  {
    id: 'wan-2.6',
    name: 'WAN 2.6',
    provider: 'WAN',
    speed: 3, quality: 4, cost: 2,
    pricePerClip: 0.30, pricePerSecond: 0.02,
    description: 'multi-shot, עקביות דמויות',
    maxDuration: 15,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'wan-2.5',
    name: 'WAN 2.5',
    provider: 'WAN',
    speed: 4, quality: 3, cost: 1,
    pricePerClip: 0.15, pricePerSecond: 0.03,
    description: 'זול ומהיר',
    maxDuration: 5,
    resolutions: ['720p', '1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'wan-2.6-flash',
    name: 'WAN 2.6 Flash',
    provider: 'WAN',
    speed: 5, quality: 2, cost: 1,
    pricePerClip: 0.10, pricePerSecond: 0.01,
    description: 'הכי זול, drafts, טסטים',
    maxDuration: 8,
    resolutions: ['720p'],
    inputTypes: ['image-to-video'],
  },
  // === Hailuo ===
  {
    id: 'hailuo-2.3-pro',
    name: 'Hailuo 2.3 Pro',
    provider: 'Hailuo',
    speed: 3, quality: 4, cost: 2,
    pricePerClip: 0.40, pricePerSecond: 0.05,
    description: 'ריאליזם, תנועה חלקה',
    maxDuration: 8,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'hailuo-standard',
    name: 'Hailuo Standard',
    provider: 'Hailuo',
    speed: 4, quality: 3, cost: 1,
    pricePerClip: 0.20, pricePerSecond: 0.025,
    description: 'זול, איכות סבירה',
    maxDuration: 8,
    resolutions: ['720p', '1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  // === Runway ===
  {
    id: 'runway-gen4',
    name: 'Runway Gen-4',
    provider: 'Runway',
    speed: 3, quality: 4, cost: 3,
    pricePerClip: 0.50, pricePerSecond: 0.05,
    description: 'סינמטי, VFX, style transfer',
    maxDuration: 10,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'runway-aleph',
    name: 'Runway Aleph',
    provider: 'Runway',
    speed: 2, quality: 5, cost: 3,
    pricePerClip: 0.60, pricePerSecond: 0.06,
    description: 'video transformation, AI editing',
    maxDuration: 10,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  // === Other ===
  {
    id: 'grok-imagine',
    name: 'Grok Imagine',
    provider: 'xAI',
    speed: 4, quality: 3, cost: 2,
    pricePerClip: 0.30, pricePerSecond: 0.04,
    description: 'creative, ייחודי',
    maxDuration: 8,
    resolutions: ['1080p'],
    inputTypes: ['text-to-video', 'image-to-video'],
  },
  {
    id: 'topaz-upscale',
    name: 'Topaz Video Upscale',
    provider: 'Topaz',
    speed: 2, quality: 5, cost: 2,
    pricePerClip: 0.20, pricePerSecond: 0.02,
    description: 'שדרוג רזולוציה AI (720p→4K)',
    maxDuration: 0,
    resolutions: ['4K'],
    inputTypes: [],
  },
  {
    id: 'infinitalk',
    name: 'Infinitalk',
    provider: 'Infinitalk',
    speed: 3, quality: 4, cost: 2,
    pricePerClip: 0.40, pricePerSecond: 0.04,
    description: 'lip sync מאודיו, AI Twin',
    maxDuration: 10,
    resolutions: ['1080p'],
    inputTypes: [],
  },
];

// GET /api/models
router.get('/', (_req, res) => {
  res.json(models);
});

export default router;
