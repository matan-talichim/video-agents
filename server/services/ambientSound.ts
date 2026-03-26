// server/services/ambientSound.ts
// Scene-aware ambient sound planning for B-Roll clips.

import { askClaude } from './claude.js';

export interface AmbientSoundPlan {
  segments: Array<{
    start: number;
    end: number;
    scene: string;
    ambientType: string;
    volume: number;
    fadeIn: number;
    fadeOut: number;
  }>;
}

export async function planAmbientSound(
  brollInsertions: any[],
  duration: number
): Promise<AmbientSoundPlan> {
  if (!brollInsertions || brollInsertions.length === 0) {
    return { segments: [] };
  }

  console.log(`[AmbientSound] Planning ambient sounds for ${brollInsertions.length} B-Roll clips...`);

  const response = await askClaude(
    `You add subtle ambient/foley sounds to B-Roll clips to make them feel alive. Ambient sound should be very quiet (background layer) — never competing with speech or music.`,
    `Plan ambient sounds for these B-Roll clips:

${brollInsertions.map((b: any, i: number) => `[${i}] at ${b.at || b.videoStartTime || 0}s, duration ${b.duration || 3}s, prompt: "${b.prompt || b.brollPrompt || ''}"`).join('\n')}

Match each scene to appropriate ambient sound:

SCENE → AMBIENT SOUND MAP:
- Beach/ocean → gentle waves + seagulls (very quiet)
- City street → distant traffic + footsteps
- Park/garden → birds + light wind in trees
- Interior apartment → room tone + distant traffic (very subtle)
- Kitchen → faint appliance hum
- Pool area → water ripples + birds
- Sunset/golden hour → gentle wind + birds
- Construction site → distant machinery (very quiet)
- Office/lobby → air conditioning hum + distant voices

RULES:
- Volume: -30 to -25 dB (barely audible — subconscious layer)
- Fade in: 0.3s (don't start abruptly)
- Fade out: 0.5s (gentle exit)
- NEVER play ambient sound during speaker segments (only during B-Roll)
- If music is playing during B-Roll, reduce ambient to -35 dB

Return ONLY valid JSON:
{
  "segments": [
    { "start": 15.0, "end": 18.0, "scene": "beach", "ambientType": "waves-seagulls", "volume": -28, "fadeIn": 0.3, "fadeOut": 0.5 }
  ]
}`
  );

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const plan: AmbientSoundPlan = {
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
    };
    console.log(`[AmbientSound] Planned ${plan.segments.length} ambient segments`);
    return plan;
  } catch {
    console.warn('[AmbientSound] Failed to parse ambient plan, skipping');
    return { segments: [] };
  }
}
