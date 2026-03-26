import { askClaude } from './claude.js';
import { PLATFORM_CONTENT_STRATEGY_PROMPT } from './editingRules.js';

export interface PlatformCut {
  platform: 'youtube' | 'instagram-reels' | 'tiktok' | 'linkedin' | 'facebook';
  aspectRatio: '16:9' | '9:16' | '1:1';
  maxDuration: number;
  hookDuration: number;
  cutFrequency: number;
  pacing: 'fast' | 'medium' | 'slow';
  captionStyle: string;
  captionPosition: string;
  ctaStyle: string;
  ctaText: string;
  musicVolume: number;
  safeZone: { top: number; bottom: number; left: number; right: number };
  segmentsToInclude: number[];
  segmentsToExclude: number[];
  additionalNotes: string;
  hookTone?: string;
  hookExample?: string;
  polishLevel?: string;
  soundStrategy?: string;
  hashtagStrategy?: string;
}

export async function planMultiPlatformCuts(
  segments: any[],
  contentAnalysis: any,
  totalDuration: number,
  targetPlatforms: string[]
): Promise<PlatformCut[]> {
  console.log(`[Multi-Platform] Planning cuts for ${targetPlatforms.length} platforms...`);

  const keepSegments = segments.filter(s => s.decision === 'must-keep' || s.decision === 'keep');

  try {
    const response = await askClaude(
      `You create platform-optimized video edits. The SAME footage gets edited DIFFERENTLY for each platform — not just reframed, but actually re-edited with different pacing, duration, and content selection.

${PLATFORM_CONTENT_STRATEGY_PROMPT}`,

      `Create editing plans for ${targetPlatforms.length} platforms from this content:

Available segments (scored):
${keepSegments.map((s: any, i: number) => `[${i}] (score: ${s.totalScore}) ${s.start.toFixed(1)}-${s.end.toFixed(1)}s: "${(s.text || '').slice(0, 50)}"`).join('\n')}

Total source duration: ${totalDuration.toFixed(0)}s
Best hook segment index: ${segments.findIndex((s: any) => s.scores?.hookPotential >= 8) || 0}

Platforms: ${targetPlatforms.join(', ')}

PLATFORM EDITING RULES:

YOUTUBE (16:9):
- Duration: up to 60 seconds (can use more content)
- Hook: first 3 seconds must grab attention
- Pacing: medium (4-8 seconds per shot)
- Include: most content, detailed explanation
- Captions: bottom of frame, medium size
- CTA: end-screen style, "subscribe" + action CTA
- Music: background level (15-20% volume)
- Description: SEO-focused title
- Safe zone: bottom 15% may be covered

INSTAGRAM REELS (9:16):
- Duration: 30 seconds max for best performance
- Hook: first 1.5 seconds or lose them
- Pacing: fast (2-4 seconds per shot)
- Include: ONLY the best moments — be ruthless
- Captions: center of screen, LARGE font (80% watch muted!)
- CTA: "שמרו לאחר כך" / "שלחו לחבר" / "קישור בביו"
- Music: more prominent (25-35% volume)
- Loop: end should connect to beginning
- Safe zone: top 20% and bottom 20% covered by UI

TIKTOK (9:16):
- Duration: 15-20 seconds for best algorithm performance
- Hook: first 1 SECOND or they're gone
- Pacing: very fast (1.5-3 seconds per shot)
- Include: ONLY the hook + one key point + CTA
- Captions: center, very bold, large
- Use trending sound if possible
- CTA: "עקבו לעוד" / comment engagement ("מה אתם חושבים?")
- Music: trending sound > original music
- Loop: MUST loop seamlessly
- Safe zone: right 15% covered by buttons, bottom 20% by description

LINKEDIN (1:1 or 16:9):
- Duration: 30-45 seconds
- Hook: professional, not flashy
- Pacing: slower (5-10 seconds per shot)
- Include: data, insights, professional value
- Captions: MANDATORY (many watch at work, muted)
- CTA: "share your thoughts" / "link in comments"
- Music: very subtle or none (8-10% volume)
- Tone: professional, thought-leadership
- No flashy effects or trendy transitions

FACEBOOK (16:9 or 1:1):
- Duration: 30-45 seconds
- Hook: first 3 seconds with captions (autoplay is muted)
- Pacing: medium (3-6 seconds per shot)
- Captions: MANDATORY (autoplay muted)
- CTA: "תייגו חבר" / "שתפו" / link
- Music: moderate (15-25% volume)
- Safe zone: bottom 10% for engagement bar

For EACH platform, return JSON:
{
  "platform": "tiktok",
  "aspectRatio": "9:16",
  "maxDuration": 18,
  "hookDuration": 1,
  "cutFrequency": 2.5,
  "pacing": "fast",
  "captionStyle": "bold-center",
  "captionPosition": "center-vertical",
  "ctaStyle": "comment-engagement",
  "ctaText": "מה אתם חושבים?",
  "musicVolume": 30,
  "safeZone": { "top": 5, "bottom": 20, "left": 5, "right": 15 },
  "segmentsToInclude": [0, 3, 7],
  "segmentsToExclude": [1, 2, 4, 5, 6],
  "additionalNotes": "use only hook + strongest point + CTA. 18 seconds total.",
  "hookTone": "confrontational",
  "hookExample": "יזמי הנדל״ן לא רוצים שתראו את זה",
  "polishLevel": "raw-authentic",
  "soundStrategy": "trending-sound",
  "hashtagStrategy": "3-5 niche"
}

CRITICAL: Each platform gets DIFFERENT segments. TikTok might use only segments [0, 7] while YouTube uses [0, 1, 2, 3, 5, 7]. The same video should NOT be the same length or pace on different platforms.

Return ONLY a valid JSON array, no markdown code blocks.`
    );

    const jsonStr = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error: any) {
    console.error('[Multi-Platform] Planning failed:', error.message);

    return targetPlatforms.map(p => ({
      platform: p as PlatformCut['platform'],
      aspectRatio: (p === 'youtube' || p === 'facebook' ? '16:9' : p === 'linkedin' ? '1:1' : '9:16') as PlatformCut['aspectRatio'],
      maxDuration: p === 'tiktok' ? 18 : p === 'instagram-reels' ? 30 : 60,
      hookDuration: p === 'tiktok' ? 1 : p === 'instagram-reels' ? 1.5 : 3,
      cutFrequency: p === 'tiktok' ? 2 : p === 'instagram-reels' ? 3 : 6,
      pacing: (p === 'tiktok' ? 'fast' : p === 'linkedin' ? 'slow' : 'medium') as PlatformCut['pacing'],
      captionStyle: 'bold',
      captionPosition: 'center',
      ctaStyle: 'button',
      ctaText: 'צרו קשר',
      musicVolume: 20,
      safeZone: { top: 5, bottom: 15, left: 5, right: 5 },
      segmentsToInclude: [],
      segmentsToExclude: [],
      additionalNotes: '',
    }));
  }
}
