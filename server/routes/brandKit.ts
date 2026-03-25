import { Router } from 'express';
import type { BrandKit } from '../types.js';

const router = Router();

// In-memory store for brand kit (single global brand kit for now)
let savedBrandKit: BrandKit | null = null;

// POST /api/brand-kit — save brand kit
router.post('/', (req, res) => {
  try {
    const { primaryColor, secondaryColor, font, logoFile, enabled } = req.body;

    if (!primaryColor || !secondaryColor || !font) {
      return res.status(400).json({ error: 'חסרים שדות חובה: primaryColor, secondaryColor, font' });
    }

    savedBrandKit = {
      primaryColor,
      secondaryColor,
      font,
      logoFile: logoFile || undefined,
      enabled: enabled !== false, // default true
    };

    res.json({ success: true, brandKit: savedBrandKit });
  } catch (error) {
    console.error('Error saving brand kit:', error);
    res.status(500).json({ error: 'שגיאה בשמירת ערכת מותג' });
  }
});

// GET /api/brand-kit — get saved brand kit
router.get('/', (_req, res) => {
  if (!savedBrandKit) {
    return res.json({
      primaryColor: '#8B5CF6',
      secondaryColor: '#3B82F6',
      font: 'Heebo',
      enabled: false,
    });
  }
  res.json(savedBrandKit);
});

export default router;
