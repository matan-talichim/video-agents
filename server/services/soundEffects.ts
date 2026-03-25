import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { askClaude } from './claude.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SFX_DIR = path.join(__dirname, '../assets/sfx');

// Pre-loaded SFX library mapping
const SFX_LIBRARY: Record<string, string> = {
  'whoosh': 'whoosh.mp3',
  'ding': 'ding.mp3',
  'pop': 'pop.mp3',
  'boom': 'boom.mp3',
  'click': 'click.mp3',
  'swipe': 'swipe.mp3',
  'notification': 'notification.mp3',
  'success': 'success.mp3',
  'dramatic_hit': 'dramatic_hit.mp3',
  'transition': 'transition.mp3',
  'typing': 'typing.mp3',
  'camera_shutter': 'camera_shutter.mp3',
  'cash_register': 'cash_register.mp3',
  'applause': 'applause.mp3',
  'suspense': 'suspense.mp3',
  'reveal': 'reveal.mp3',
  'error': 'error.mp3',
  'woosh_fast': 'woosh_fast.mp3',
  'impact': 'impact.mp3',
  'sparkle': 'sparkle.mp3',
};

export interface SFXMoment {
  timestamp: number;
  sfx_keyword: string;
  reason: string;
  volume: number;
}

// Find matching SFX file for a keyword
export function findSoundEffect(keyword: string): string | null {
  const normalizedKeyword = keyword.toLowerCase().trim();

  // Direct match
  if (SFX_LIBRARY[normalizedKeyword]) {
    return path.join(SFX_DIR, SFX_LIBRARY[normalizedKeyword]);
  }

  // Fuzzy match
  for (const [key, file] of Object.entries(SFX_LIBRARY)) {
    if (normalizedKeyword.includes(key) || key.includes(normalizedKeyword)) {
      return path.join(SFX_DIR, file);
    }
  }

  return null;
}

// Analyze transcript and identify SFX moments
export async function analyzeSFXMoments(transcript: string): Promise<SFXMoment[]> {
  console.log('[SFX] Analyzing transcript for sound effect moments...');

  const availableEffects = Object.keys(SFX_LIBRARY).join(', ');

  const response = await askClaude(
    'You are an AI sound designer for video editing.',
    `Analyze this transcript and identify moments where sound effects would enhance the video. Consider:
- Topic changes → whoosh/transition sound
- Numbers/statistics mentioned → ding/reveal
- Questions asked → notification
- Dramatic moments → dramatic_hit/suspense
- Success/achievement → success/sparkle
- Conclusions/summaries → impact
- Physical actions described → matching sound (boom, click, etc.)

Available sound effects: ${availableEffects}

Transcript:
${transcript}

Return JSON array:
[{ "timestamp": 5.2, "sfx_keyword": "whoosh", "reason": "topic change", "volume": 0.4 }]
Only suggest 5-8 sound effects maximum — don't overdo it.
Return [] if no good moments found.
Return ONLY the JSON array, no other text.`
  );

  try {
    // Strip markdown code fences if present
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    console.error('[SFX] Failed to parse Claude response');
    return [];
  }
}
