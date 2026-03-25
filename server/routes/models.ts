import { Router } from 'express';

const router = Router();

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  speed: number;      // 1-5
  quality: number;     // 1-5
  cost: number;        // 1-5 (1=cheap, 5=expensive)
  description: string;
  maxDuration: number; // seconds
  resolutions: string[];
}

const models: ModelInfo[] = [
  {
    id: 'kling-v2.5-turbo',
    name: 'Kling v2.5 Turbo',
    provider: 'KIE.ai',
    speed: 5,
    quality: 4,
    cost: 3,
    description: 'מהיר ואיכותי — מומלץ לרוב הפרויקטים',
    maxDuration: 10,
    resolutions: ['720p', '1080p'],
  },
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 Fast',
    provider: 'Google DeepMind',
    speed: 4,
    quality: 5,
    cost: 4,
    description: 'איכות גבוהה מאוד עם מהירות סבירה',
    maxDuration: 8,
    resolutions: ['1080p', '4K'],
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    provider: 'OpenAI',
    speed: 3,
    quality: 5,
    cost: 5,
    description: 'איכות קולנועית פרימיום — לפרויקטים מיוחדים',
    maxDuration: 20,
    resolutions: ['1080p', '4K'],
  },
  {
    id: 'wan-2.5',
    name: 'Wan 2.5',
    provider: 'Alibaba',
    speed: 4,
    quality: 3,
    cost: 2,
    description: 'חסכוני ומהיר — מתאים לכמויות גדולות',
    maxDuration: 6,
    resolutions: ['720p', '1080p'],
  },
  {
    id: 'seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    speed: 3,
    quality: 4,
    cost: 3,
    description: 'מצוין לתנועה ואנימציה — מומלץ לריקוד ותנועה',
    maxDuration: 10,
    resolutions: ['720p', '1080p'],
  },
];

// GET /api/models
router.get('/', (_req, res) => {
  res.json(models);
});

export default router;
