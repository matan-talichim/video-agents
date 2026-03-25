// server/services/logoAnalyzer.ts — Logo analysis via Claude Vision

import { askClaudeVision } from './claude.js';
import fs from 'fs';

export interface ExtractedBrandKit {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  typography: 'modern' | 'classic' | 'bold' | 'elegant' | 'playful' | 'minimal';
  mood: 'professional' | 'energetic' | 'calm' | 'luxury' | 'friendly' | 'corporate' | 'creative';
  suggestedFont: string;
  description: string;
  confidence: number;
}

export async function analyzeLogo(logoPath: string): Promise<ExtractedBrandKit> {
  console.log('[Brand Kit] Analyzing logo...');

  const buffer = fs.readFileSync(logoPath);
  const imageBase64 = buffer.toString('base64');

  // Detect mime type from file extension
  const ext = logoPath.split('.').pop()?.toLowerCase();
  let mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml' | 'image/webp' | 'image/gif' =
    ext === 'png' ? 'image/png' :
    ext === 'svg' ? 'image/svg+xml' :
    ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' :
    'image/jpeg';

  // Fallback: detect from magic bytes when multer saves without extension
  if (!ext || !['png', 'svg', 'webp', 'gif', 'jpg', 'jpeg'].includes(ext)) {
    let detectedMime: typeof mimeType = 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) detectedMime = 'image/png';
    else if (buffer[0] === 0xFF && buffer[1] === 0xD8) detectedMime = 'image/jpeg';
    else if (buffer[0] === 0x52 && buffer[1] === 0x49) detectedMime = 'image/webp';
    else if (buffer.toString('utf8', 0, 4) === '<svg') detectedMime = 'image/svg+xml';
    mimeType = detectedMime;
  }

  const response = await askClaudeVision(
    'You are a brand identity expert. You analyze logos and extract brand visual identity.',
    [
      {
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: imageBase64 },
      },
      {
        type: 'text',
        text: `Analyze this logo and extract the brand visual identity. Return JSON:
{
  "primaryColor": "#hex (the most dominant color in the logo)",
  "secondaryColor": "#hex (the second most prominent color)",
  "accentColor": "#hex (a good accent/highlight color that complements the brand)",
  "backgroundColor": "#hex (suggested background: dark or light based on the logo style)",
  "typography": "modern|classic|bold|elegant|playful|minimal (based on the logo's font style and overall feel)",
  "mood": "professional|energetic|calm|luxury|friendly|corporate|creative",
  "suggestedFont": "one of: Heebo|Assistant|Rubik|Secular One|Noto Sans Hebrew (pick the Hebrew font that best matches the logo's typography style)",
  "description": "תיאור קצר בעברית של הסגנון: למשל 'מותג מקצועי ומודרני עם גוונים כחולים, מתאים לנדל״ן יוקרתי'",
  "confidence": 0.85
}

Be precise with the hex color values — extract them from the actual pixels of the logo. If the logo is mostly black/white, suggest brand-appropriate colors based on the style. The description MUST be in Hebrew.`,
      },
    ]
  );

  try {
    const jsonStr = response
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const result = JSON.parse(jsonStr);

    // Validate hex colors
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(result.primaryColor)) result.primaryColor = '#7c3aed';
    if (!hexRegex.test(result.secondaryColor)) result.secondaryColor = '#3B82F6';
    if (!hexRegex.test(result.accentColor)) result.accentColor = result.primaryColor;
    if (!hexRegex.test(result.backgroundColor)) result.backgroundColor = '#0a0a12';

    console.log('[Brand Kit] Logo analysis complete:', result.description);
    return result;
  } catch {
    console.warn('[Brand Kit] Failed to parse Claude Vision response, using defaults');
    return {
      primaryColor: '#7c3aed',
      secondaryColor: '#3B82F6',
      accentColor: '#7c3aed',
      backgroundColor: '#0a0a12',
      typography: 'modern',
      mood: 'professional',
      suggestedFont: 'Heebo',
      description: 'סגנון ברירת מחדל — מודרני ומקצועי',
      confidence: 0.3,
    };
  }
}
