import { Router } from 'express';
import { getAllEffects, getEffectsByCategory } from '../services/effectsLibrary.js';
import { getTrendingSoundsForAPI } from '../services/trendingSounds.js';

const router = Router();

// GET /api/effects — 17 pro effect options
router.get('/effects', (_req, res) => {
  const effects = [
    { id: 'camera-shake', name: 'רעידת מצלמה', category: 'motion', icon: '📹' },
    { id: 'glitch', name: 'גליץ׳', category: 'digital', icon: '⚡' },
    { id: 'film-burn', name: 'שריפת פילם', category: 'vintage', icon: '🔥' },
    { id: 'crt', name: 'מסך CRT', category: 'vintage', icon: '📺' },
    { id: 'vhs', name: 'VHS', category: 'vintage', icon: '📼' },
    { id: 'light-leak', name: 'דליפת אור', category: 'cinematic', icon: '✨' },
    { id: 'bokeh', name: 'בוקה', category: 'cinematic', icon: '🔵' },
    { id: 'film-grain', name: 'גרעיניות פילם', category: 'vintage', icon: '🎞️' },
    { id: 'speed-ramp', name: 'שינוי מהירות', category: 'motion', icon: '⏩' },
    { id: 'zoom-blur', name: 'טשטוש זום', category: 'motion', icon: '🔍' },
    { id: 'chromatic-aberration', name: 'אברציה כרומטית', category: 'digital', icon: '🌈' },
    { id: 'letterbox', name: 'פסי קולנוע', category: 'cinematic', icon: '🎬' },
    { id: 'split-screen', name: 'מסך מפוצל', category: 'layout', icon: '⬛' },
    { id: 'picture-in-picture', name: 'תמונה בתוך תמונה', category: 'layout', icon: '🖼️' },
    { id: 'freeze-frame', name: 'הקפאת פריים', category: 'motion', icon: '❄️' },
    { id: 'whip-pan', name: 'סיבוב מהיר', category: 'transition', icon: '💫' },
    { id: 'morph-cut', name: 'חיתוך מורפולוגי', category: 'transition', icon: '🔄' },
  ];
  res.json(effects);
});

// GET /api/music — music mood options
router.get('/music', (_req, res) => {
  const moods = [
    { id: 'energetic', name: 'אנרגטי', description: 'קצבי ומלא אנרגיה — מתאים לריקוד, ספורט, טיקטוק', bpm: '120-140', icon: '🔥' },
    { id: 'calm', name: 'רגוע', description: 'שקט ונעים — מתאים לנאומים, מוצרים, חינוך', bpm: '60-80', icon: '🌊' },
    { id: 'dramatic', name: 'דרמטי', description: 'מלא מתח ועוצמה — מתאים לטריילרים וסיפורים', bpm: '80-100', icon: '🎭' },
    { id: 'business', name: 'עסקי', description: 'מקצועי ונקי — מתאים למצגות וסרטוני תדמית', bpm: '90-110', icon: '💼' },
    { id: 'trendy', name: 'טרנדי', description: 'מעודכן וצעיר — מתאים לרשתות חברתיות', bpm: '100-130', icon: '🎵' },
    { id: 'cinematic', name: 'קולנועי', description: 'אורקסטרלי ומרהיב — מתאים לסרטונים סינמטיים', bpm: '70-90', icon: '🎬' },
    { id: 'uplifting', name: 'מעודד', description: 'חיובי ומרים — מתאים למוטיבציה וסיפורי הצלחה', bpm: '110-130', icon: '☀️' },
    { id: 'dark', name: 'אפל', description: 'כבד ואטמוספרי — מתאים לתוכן רציני ודוקו', bpm: '60-80', icon: '🌑' },
  ];
  res.json(moods);
});

// GET /api/caption-templates — 10 caption template previews
router.get('/caption-templates', (_req, res) => {
  const templates = [
    { id: 'bold-pop', name: 'Bold Pop', description: 'טקסט גדול ובולט עם צבע מודגש', style: 'bold', color: '#FFD700', background: 'rgba(0,0,0,0.7)', animation: 'pop' },
    { id: 'minimal-white', name: 'Minimal White', description: 'לבן נקי ומינימליסטי', style: 'regular', color: '#FFFFFF', background: 'none', animation: 'fade' },
    { id: 'neon-glow', name: 'Neon Glow', description: 'אפקט ניאון זוהר', style: 'bold', color: '#00FFFF', background: 'none', animation: 'glow' },
    { id: 'karaoke-style', name: 'Karaoke', description: 'הדגשת מילים בזמן אמת כמו קריוקי', style: 'bold', color: '#FFFFFF', background: 'rgba(138,43,226,0.8)', animation: 'highlight' },
    { id: 'typewriter', name: 'Typewriter', description: 'אפקט מכונת כתיבה — אות אחרי אות', style: 'monospace', color: '#00FF00', background: 'rgba(0,0,0,0.9)', animation: 'typewriter' },
    { id: 'gradient-wave', name: 'Gradient Wave', description: 'גרדיאנט צבעוני עם אנימציית גל', style: 'bold', color: 'linear-gradient(#FF6B6B, #4ECDC4)', background: 'none', animation: 'wave' },
    { id: 'outlined', name: 'Outlined', description: 'טקסט עם מסגרת בולטת', style: 'outlined', color: '#FFFFFF', background: 'none', animation: 'slide' },
    { id: 'cinematic-bar', name: 'Cinematic Bar', description: 'פס תחתון קולנועי עם טקסט', style: 'regular', color: '#FFFFFF', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', animation: 'fade' },
    { id: 'social-bubble', name: 'Social Bubble', description: 'בועת שיחה כמו ברשתות חברתיות', style: 'rounded', color: '#000000', background: '#FFFFFF', animation: 'bounce' },
    { id: 'hebrew-classic', name: 'Hebrew Classic', description: 'סגנון עברי קלאסי עם סריף', style: 'serif', color: '#FFFFFF', background: 'rgba(0,0,0,0.6)', animation: 'fade' },
  ];
  res.json(templates);
});

// GET /api/edit-styles — 4 edit style presets
router.get('/edit-styles', (_req, res) => {
  const styles = [
    {
      id: 'cinematic',
      name: 'סינמטי',
      description: 'מעברים חלקים, תיקון צבע קולנועי, קצב איטי',
      pacing: 'calm',
      colorGrading: 'cinematic',
      transitions: ['fade', 'dissolve'],
      zoomStyle: 'ken-burns',
      musicMood: 'cinematic',
      preview: {
        cutFrequency: 'low',
        effectIntensity: 'subtle',
        colorTone: 'warm',
      },
    },
    {
      id: 'energetic',
      name: 'אנרגטי',
      description: 'חיתוכים מהירים, אפקטי תנועה, קצב גבוה',
      pacing: 'fast',
      colorGrading: 'bright',
      transitions: ['whip-pan', 'glitch', 'zoom'],
      zoomStyle: 'punch',
      musicMood: 'energetic',
      preview: {
        cutFrequency: 'high',
        effectIntensity: 'strong',
        colorTone: 'vibrant',
      },
    },
    {
      id: 'minimal',
      name: 'מינימלי',
      description: 'נקי ופשוט, בלי אפקטים מיותרים',
      pacing: 'normal',
      colorGrading: 'clean',
      transitions: ['cut'],
      zoomStyle: 'subtle',
      musicMood: 'calm',
      preview: {
        cutFrequency: 'medium',
        effectIntensity: 'none',
        colorTone: 'neutral',
      },
    },
    {
      id: 'trendy',
      name: 'טרנדי',
      description: 'סגנון רשתות חברתיות, ביטים, טקסט מונפש',
      pacing: 'fast',
      colorGrading: 'bright',
      transitions: ['zoom', 'glitch', 'morph'],
      zoomStyle: 'punch',
      musicMood: 'trendy',
      preview: {
        cutFrequency: 'high',
        effectIntensity: 'strong',
        colorTone: 'vivid',
      },
    },
  ];
  res.json(styles);
});

// GET /api/effects-library — all effects with FFmpeg filters
router.get('/effects-library', (req, res) => {
  const category = req.query.category as string;
  res.json(category ? getEffectsByCategory(category) : getAllEffects());
});

// GET /api/trending-sounds — trending sounds list
router.get('/trending-sounds', (req, res) => {
  const platform = req.query.platform as string;
  res.json(getTrendingSoundsForAPI());
});

export default router;
