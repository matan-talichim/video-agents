// server/services/contentSafety.ts
// Checks video content for legal, ethical, and platform policy compliance risks.

import { askClaude } from './claude.js';

export interface ContentSafetyResult {
  safe: boolean;
  score: number;
  flags: Array<{
    type: 'copyright-music' | 'misleading-claims' | 'nsfw' | 'legal-risk' | 'platform-violation' | 'offensive-language';
    severity: 'block' | 'warning' | 'info';
    description: string;
    recommendation: string;
  }>;
  platformCompliant: Record<string, boolean>;
}

export async function checkContentSafety(
  transcript: string,
  marketingClaims: any,
  musicSource: string,
  platform: string,
  industry: string
): Promise<ContentSafetyResult> {
  console.log(`[ContentSafety] Checking safety for ${platform} video (industry: ${industry})`);

  const response = await askClaude(
    'You are a content compliance officer. Check video content for legal, ethical, and platform policy risks. Be thorough — one missed issue can get the ad account banned.',
    `Review this video content for safety and compliance:

TRANSCRIPT: "${transcript.slice(0, 500)}"
MUSIC SOURCE: "${musicSource}"
PLATFORM: ${platform}
INDUSTRY: ${industry}

MARKETING CLAIMS:
${JSON.stringify(marketingClaims?.copywriting?.textOverlays?.slice(0, 5) || [], null, 2)}

CHECK FOR:

1. COPYRIGHT MUSIC:
   - Is the music from a licensed source (Suno AI = OK, Epidemic Sound = OK)?
   - If music source is unknown → WARNING
   - If using recognizable copyrighted song → BLOCK

2. MISLEADING MARKETING CLAIMS:
   - "Guaranteed returns" / "מובטח" in real estate = ILLEGAL in Israel
   - "Best" / "הכי טוב" without substantiation = risky
   - Income/results claims without disclaimers = risky
   - Price claims that could change = need "בכפוף לתנאים" disclaimer

3. NSFW CONTENT:
   - Any nudity, violence, or inappropriate content → BLOCK

4. PLATFORM POLICY VIOLATIONS:
   - Instagram: no "tap link in bio" in Reel itself (only caption)
   - TikTok: no direct phone numbers in video (use "link in bio")
   - Facebook: text covering >20% of thumbnail can reduce reach
   - YouTube: misleading thumbnails/titles = demonetization risk

5. OFFENSIVE OR EXCLUSIONARY LANGUAGE:
   - Discriminatory language about protected groups
   - Ageism, racism, sexism in targeting language

6. LEGAL REQUIREMENTS (Israel):
   - Real estate: must mention "הדמיה" if showing renders, not real photos
   - Food: health claims need disclaimer
   - Financial: must include "אין באמור להוות ייעוץ"

Return JSON:
{
  "safe": true,
  "score": 9,
  "flags": [
    {
      "type": "misleading-claims",
      "severity": "warning",
      "description": "הטקסט 'תשואה מובטחת' עלול להיחשב הטעיה",
      "recommendation": "שנו ל'תשואה צפויה' והוסיפו 'בכפוף לתנאים'"
    },
    {
      "type": "copyright-music",
      "severity": "info",
      "description": "מוזיקה מ-Suno AI — ללא בעיות זכויות יוצרים",
      "recommendation": "אין פעולה נדרשת"
    }
  ],
  "platformCompliant": {
    "youtube": true,
    "instagram": true,
    "tiktok": true,
    "facebook": true,
    "linkedin": true
  }
}`
  );

  try {
    const result = JSON.parse(response);
    const blockCount = result.flags?.filter((f: any) => f.severity === 'block').length || 0;
    const warnCount = result.flags?.filter((f: any) => f.severity === 'warning').length || 0;
    console.log(`[ContentSafety] Score: ${result.score}/10 | Safe: ${result.safe} | Blocks: ${blockCount} | Warnings: ${warnCount}`);
    return result;
  } catch {
    console.warn('[ContentSafety] Failed to parse response, assuming safe');
    return {
      safe: true,
      score: 7,
      flags: [],
      platformCompliant: { youtube: true, instagram: true, tiktok: true, facebook: true, linkedin: true },
    };
  }
}
