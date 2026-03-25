import { Router } from 'express';
import multer from 'multer';
import { saveBrandKit, loadBrandKit } from '../services/brandKit.js';
import { analyzeLogo } from '../services/logoAnalyzer.js';
import type { BrandKit } from '../types.js';

const router = Router();

const logoUpload = multer({ dest: 'uploads/logos/' });

// POST /api/brand-kit/analyze-logo — upload logo and extract brand kit
router.post('/analyze-logo', logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }

    const extractedKit = await analyzeLogo(req.file.path);

    res.json({
      success: true,
      extractedKit,
      message: 'ערכת המותג חולצה בהצלחה מהלוגו',
    });
  } catch (error: any) {
    console.error('Logo analysis failed:', error.message);
    res.status(500).json({ error: 'Failed to analyze logo' });
  }
});

// POST /api/brand-kit — save brand kit
router.post('/', (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const { primaryColor, secondaryColor, font, logoFile, enabled } = req.body;

    if (!primaryColor || !secondaryColor || !font) {
      return res.status(400).json({ error: 'חסרים שדות חובה: primaryColor, secondaryColor, font' });
    }

    const kit: BrandKit = {
      primaryColor,
      secondaryColor,
      font,
      logoFile: logoFile || undefined,
      enabled: enabled !== false,
    };

    const saved = saveBrandKit(userId, kit);
    res.json({ success: true, brandKit: saved });
  } catch (error: any) {
    console.error('Error saving brand kit:', error.message);
    res.status(500).json({ error: 'שגיאה בשמירת ערכת מותג' });
  }
});

// GET /api/brand-kit — get saved brand kit
router.get('/', (req, res) => {
  const userId = (req.query.userId as string) || 'default';
  const kit = loadBrandKit(userId);

  if (!kit) {
    return res.json({
      primaryColor: '#8B5CF6',
      secondaryColor: '#3B82F6',
      font: 'Heebo',
      enabled: false,
    });
  }
  res.json(kit);
});

export default router;
