import { askClaude } from './claude.js';
import type { TranscriptResult } from '../types.js';

export interface HookVariation {
  id: string;
  type: 'question' | 'bold-claim' | 'statistic' | 'curiosity-gap' | 'pattern-interrupt' | 'social-proof' | 'challenge';
  textOverlay: string;         // Hebrew text to show on screen in first 3 seconds
  narrationText?: string;      // Optional: different opening voiceover text
  visualStrategy: string;      // What the viewer sees: "zoom to face" | "B-Roll start" | "text on black"
  duration: number;            // Hook duration in seconds (1.5-3s)
  viralScore: number;          // 1-10 predicted viral potential
  worksOnMute: boolean;        // Does this hook work without sound?
  description: string;         // Hebrew description for the user
}

export async function generateHookVariations(
  transcript: TranscriptResult,
  topMoments: any[],
  videoCategory: string,
  targetPlatform: string
): Promise<HookVariation[]> {
  console.log('[Hooks] Generating 3 hook variations...');

  const bestMoment = topMoments[0];
  const fullText = transcript.fullText;

  try {
    const response = await askClaude(
      `You create viral video hooks. You understand that 85% of social media viewers watch WITHOUT sound, so text hooks are critical. You know the psychology: curiosity gaps, pattern interrupts, bold claims, and social proof.

The hook is the first 1.5-3 seconds. It must:
1. Work WITH and WITHOUT sound (text overlay is mandatory)
2. Create an irresistible urge to keep watching
3. Promise value that the video delivers on
4. Be specific, not generic`,

      `Create 3 DIFFERENT hook variations for this video:

Category: ${videoCategory}
Platform: ${targetPlatform}
Main content: "${fullText.slice(0, 500)}"
Best moment: "${bestMoment?.segment?.text || bestMoment?.text || fullText.slice(0, 100)}"
Key points: ${topMoments.slice(0, 3).map((m: any) => `"${(m.segment?.text || m.text || '').slice(0, 60)}"`).join(', ')}

Return JSON array of 3 hooks, each using a DIFFERENT strategy:

[
  {
    "id": "hook_1",
    "type": "curiosity-gap",
    "textOverlay": "Hebrew text max 8-10 words",
    "narrationText": null,
    "visualStrategy": "text-on-dark-then-reveal",
    "duration": 2.0,
    "viralScore": 9,
    "worksOnMute": true,
    "description": "Hebrew description of hook strategy"
  }
]

HOOK TYPES TO USE:
"curiosity-gap" — Creates an information void. Best for educational content.
"statistic" — Numbers grab attention. Best for real estate, product, data.
"bold-claim" — Strong statement. Best for testimonials, brand content.
"question" — Engages viewer's brain. Best for engagement-focused content.
"pattern-interrupt" — Breaks scrolling pattern. Best for TikTok/Reels.
"social-proof" — Others validated this. Best for testimonials, products.
"challenge" — Dares the viewer. Best for dramatic reveals.

RULES:
- All 3 hooks must use DIFFERENT types
- All hooks must work on MUTE (text overlay carries the message)
- textOverlay must be SHORT: max 8-10 words in Hebrew
- Each hook leads into the SAME video body (only the first 1.5-3 seconds differ)
- viralScore should be honest: 1-6 = weak, 7-8 = good, 9-10 = viral potential
- At least one hook should use the strongest moment from the content as the opener

Return ONLY the JSON array, no other text.`
    );

    const hooks = JSON.parse(response);
    console.log(`[Hooks] Generated ${hooks.length} hook variations`);
    return hooks;
  } catch (error: any) {
    console.error('[Hooks] Generation failed:', error.message);
    return [{
      id: 'hook_default',
      type: 'bold-claim',
      textOverlay: 'צפו עד הסוף',
      visualStrategy: 'zoom-to-speaker',
      duration: 2,
      viralScore: 5,
      worksOnMute: true,
      description: 'הוק ברירת מחדל',
    }];
  }
}
