// server/services/subtitleStyler.ts
// Intelligently selects the best subtitle style based on content, platform, and audience.

import { askClaude } from './claude.js';

export type SubtitleStyleType = 'word-highlight' | 'karaoke' | 'sentence' | 'kinetic-pop' | 'minimal' | 'bold-center';

export interface SubtitleStylePlan {
  selectedStyle: SubtitleStyleType;
  reason: string;
  config: SubtitleStyleConfig;
}

export interface SubtitleStyleConfig {
  position: 'bottom' | 'center' | 'top';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontWeight: 'normal' | 'bold' | 'extra-bold';
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  animation: string;
  maxWordsPerLine: number;
  rtl: boolean;
}

export async function selectSubtitleStyle(
  videoCategory: string,
  platform: string,
  emotionalTone: string,
  hasPresenter: boolean,
  brandKit: any
): Promise<SubtitleStylePlan> {
  console.log(`[SubtitleStyler] Selecting style for ${videoCategory} on ${platform}`);

  const response = await askClaude(
    'You choose the best subtitle style based on content type, platform, and audience.',
    `Choose the best subtitle style for this video:
Category: ${videoCategory}
Platform: ${platform}
Tone: ${emotionalTone}
Has presenter: ${hasPresenter}
Brand primary color: ${brandKit?.primaryColor || '#FFFFFF'}

AVAILABLE STYLES:

1. "word-highlight" (Alex Hormozi style):
   Full sentence displayed. Current spoken word highlighted in brand color.
   Best for: educational, talking-head, high-energy motivational
   Platform: YouTube, Instagram
   Example: "הדירה הזו תשנה לכם את ה[חיים]" — "חיים" highlighted

2. "karaoke":
   Words light up one by one as spoken, like karaoke.
   Best for: music videos, energetic content, Gen Z audience
   Platform: TikTok, Instagram Reels
   Creates addictive "follow along" effect

3. "sentence":
   Classic subtitle — full sentence appears, stays for duration, disappears.
   Best for: corporate, professional, documentary, LinkedIn
   Platform: YouTube, LinkedIn
   Clean and professional

4. "kinetic-pop":
   Important words briefly scale up 120% and bounce as spoken.
   Best for: product launches, ads, high-energy marketing
   Platform: TikTok, Instagram
   Creates visual excitement without distraction

5. "minimal":
   Small text, bottom of screen, barely noticeable.
   Best for: cinematic, luxury brand, art
   Platform: YouTube
   Doesn't compete with visuals

6. "bold-center":
   Large text, center screen, 2-3 words at a time, rapid change.
   Best for: motivational, quote videos, meme-style, fast-paced
   Platform: TikTok, Instagram Reels
   Maximum impact, maximum attention

DECISION MATRIX:
- Educational/talking-head → word-highlight
- Corporate/LinkedIn → sentence
- TikTok high-energy → bold-center or karaoke
- Instagram aspirational → kinetic-pop or word-highlight
- Luxury/cinematic → minimal
- Product/ad → kinetic-pop

Return JSON:
{
  "selectedStyle": "word-highlight",
  "reason": "סרטון חינוכי עם דובר — סגנון Hormozi מתאים לשמירת תשומת לב",
  "config": {
    "position": "bottom",
    "fontSize": "large",
    "fontWeight": "bold",
    "backgroundColor": "rgba(0,0,0,0.6)",
    "textColor": "#FFFFFF",
    "highlightColor": "${brandKit?.primaryColor || '#FFD700'}",
    "animation": "highlight-current-word",
    "maxWordsPerLine": 6,
    "rtl": true
  }
}`
  );

  try {
    const plan = JSON.parse(response);
    console.log(`[SubtitleStyler] Selected: ${plan.selectedStyle} — ${plan.reason}`);
    return plan;
  } catch {
    console.warn('[SubtitleStyler] Failed to parse response, using default word-highlight');
    return {
      selectedStyle: 'word-highlight',
      reason: 'ברירת מחדל',
      config: {
        position: 'bottom',
        fontSize: 'large',
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.6)',
        textColor: '#FFFFFF',
        highlightColor: brandKit?.primaryColor || '#FFD700',
        animation: 'highlight-current-word',
        maxWordsPerLine: 6,
        rtl: true,
      },
    };
  }
}
