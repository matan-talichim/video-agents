import { Router } from 'express';
import multer from 'multer';
import { createVisualDNA, listProfiles } from '../services/visualDNA.js';

const router = Router();
const upload = multer({ dest: 'uploads/vdna/' });

// POST /api/visual-dna — create a Visual DNA profile from uploaded materials
router.post('/', upload.array('materials', 10), async (req, res) => {
  try {
    const { name } = req.body;
    const files = req.files as Express.Multer.File[];

    const materials: Array<{ type: 'image' | 'text'; path?: string; content?: string }> = (files || []).map(f => ({
      type: f.mimetype.startsWith('image/') ? 'image' as const : 'text' as const,
      path: f.path,
    }));

    // Add text content if provided
    if (req.body.brandDescription) {
      materials.push({ type: 'text', content: req.body.brandDescription });
    }

    const profile = await createVisualDNA(name || 'My Brand', materials);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/visual-dna — list all profiles
router.get('/', (_req, res) => {
  res.json(listProfiles());
});

export default router;
