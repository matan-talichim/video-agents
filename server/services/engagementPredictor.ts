// server/services/engagementPredictor.ts
// Predicts video engagement rate based on editing quality, content, and marketing signals.

import { askClaude } from './claude.js';

export interface EngagementPrediction {
  overallScore: number;           // 1-100
  predictedEngagementRate: number; // percentage
  platformAverage: number;        // platform average for comparison
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
}

export async function predictEngagement(
  editingBlueprint: any,
  contentSelection: any,
  marketingPlan: any,
  retentionPlan: any,
  qaResult: any,
  hookVariations: any[],
  duration: number,
  platform: string
): Promise<EngagementPrediction> {
  console.log(`[Engagement] Predicting engagement for ${duration.toFixed(0)}s ${platform} video`);

  const response = await askClaude(
    'You predict video engagement rates based on editing quality, content selection, and marketing strategy. You have data from millions of social media videos.',
    `Predict engagement for this ${duration.toFixed(0)}s ${platform} video.

EDITING QUALITY:
- Murch average score: ${editingBlueprint?.murchAverageScore || 'N/A'}
- Cuts: ${editingBlueprint?.cuts?.length || 0}
- Zooms: ${editingBlueprint?.zooms?.length || 0}
- Speed ramps: ${editingBlueprint?.speedRamps?.length || 0}
- Pattern interrupts: ${editingBlueprint?.patternInterrupts?.length || 0}
- SFX: ${editingBlueprint?.soundDesign?.sfx?.length || 0}

CONTENT QUALITY:
- Content kept: ${contentSelection?.summary?.cutPercentage || 0}% cut
- Average segment score: ${contentSelection?.summary?.averageScore || 0}
- Top moment score: ${contentSelection?.topMoments?.[0]?.segment?.totalScore || 0}

MARKETING:
- Framework: ${marketingPlan?.framework?.selectedFramework || 'none'}
- CTA type: ${marketingPlan?.copywriting?.textOverlays?.find((t: any) => t.type === 'cta')?.text || 'none'}
- Hook viral score: ${hookVariations?.[0]?.viralScore || 0}

RETENTION:
- Predicted completion: ${retentionPlan?.predictedRetention || 50}%
- Fixes applied: ${retentionPlan?.fixes?.length || 0}

QA:
- Quality score: ${qaResult?.overallScore || 0}/10

PLATFORM AVERAGES (for reference):
- YouTube: 3.5% engagement rate average
- Instagram Reels: 4.0% average
- TikTok: 5.5% average
- LinkedIn: 2.5% average

Score this video 1-100 and predict engagement rate. Be HONEST.

Return JSON:
{
  "overallScore": 78,
  "predictedEngagementRate": 4.2,
  "platformAverage": 3.5,
  "strengths": ["הוק חזק (ציון 9/10)", "קצב עריכה מקצועי", "CTA ברור עם דחיפות"],
  "weaknesses": ["חסר הוכחה חברתית לפני ה-CTA", "שניות 15-20 ללא שינוי ויזואלי"],
  "improvementSuggestions": ["הוסף מספר לקוחות לפני ה-CTA", "הוסף zoom punch בשנייה 17"]
}`
  );

  try {
    const prediction = JSON.parse(response);
    console.log(`[Engagement] Score: ${prediction.overallScore}/100, Predicted: ${prediction.predictedEngagementRate}% (avg: ${prediction.platformAverage}%)`);
    return prediction;
  } catch {
    console.warn('[Engagement] Failed to parse prediction, using fallback');
    return {
      overallScore: 65,
      predictedEngagementRate: 3.0,
      platformAverage: 3.5,
      strengths: [],
      weaknesses: [],
      improvementSuggestions: [],
    };
  }
}
