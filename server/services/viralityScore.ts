import { askClaude } from './claude.js';
import type { Job, ViralityScore, TranscriptResult } from '../types.js';

export async function calculateViralityScore(
  job: Job,
  transcript?: TranscriptResult | null
): Promise<ViralityScore> {
  console.log('[Virality] Calculating virality score...');
  const startTime = Date.now();

  const platform = job.plan?.export?.formats?.includes('9:16' as any) ? 'TikTok/Reels' : 'YouTube';
  const duration = job.result?.duration || 60;

  try {
    const response = await askClaude(
      'You are a viral video strategist who scores videos on their viral potential. Return only valid JSON.',
      `Analyze this video and rate its viral potential.

Video details:
- Duration: ${duration} seconds
- Platform target: ${platform}
- Prompt/topic: "${job.prompt}"
- Pacing: ${job.plan?.edit?.pacing || 'normal'}
- Has hook: ${job.plan?.analyze?.hookDetection ? 'yes' : 'no'}
- Has CTA: ${job.plan?.edit?.cta ? 'yes' : 'no'}
- Has subtitles: ${job.plan?.edit?.subtitles ? 'yes' : 'no'}
- Has B-Roll: ${job.plan?.generate?.broll ? 'yes' : 'no'}
- Has music: ${job.plan?.edit?.music ? 'yes' : 'no'}
- Beat-synced: ${job.plan?.edit?.beatSyncCuts ? 'yes' : 'no'}
- Edit style: ${job.plan?.edit?.editStyle || 'none'}
${transcript ? `- Transcript preview: "${transcript.fullText.slice(0, 500)}..."` : ''}

Rate each category 0-10:
1. Hook (first 3 seconds — does it grab attention?)
2. Pacing (does the rhythm match the platform?)
3. Emotion (is there an emotional arc — build + payoff?)
4. CTA (is the call to action clear?)
5. Trends (does it align with current social media trends?)

Also provide 3-5 specific improvement tips in Hebrew.

Return JSON:
{
  "total": 0-100,
  "hook": 0-10,
  "pacing": 0-10,
  "emotion": 0-10,
  "cta": 0-10,
  "trends": 0-10,
  "tips": ["tip1 in Hebrew", "tip2", ...]
}

Be honest and constructive. A score of 70+ means good potential. 90+ means excellent.`
    );

    const jsonStr = response
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const score = JSON.parse(jsonStr);

    // Validate ranges
    score.hook = Math.max(0, Math.min(10, score.hook || 0));
    score.pacing = Math.max(0, Math.min(10, score.pacing || 0));
    score.emotion = Math.max(0, Math.min(10, score.emotion || 0));
    score.cta = Math.max(0, Math.min(10, score.cta || 0));
    score.trends = Math.max(0, Math.min(10, score.trends || 0));

    // Recalculate total from sub-scores
    score.total = Math.round(
      ((score.hook + score.pacing + score.emotion + score.cta + score.trends) / 50) * 100
    );

    if (!Array.isArray(score.tips)) {
      score.tips = [];
    }

    const duration_ms = Date.now() - startTime;
    console.log(`[Virality] Score: ${score.total}/100 — completed in ${duration_ms}ms`);

    return score;
  } catch (error: any) {
    console.error('[Virality] Claude analysis failed, returning default score:', error.message);
    // Return default score if Claude response can't be parsed
    return {
      total: 65,
      hook: 6,
      pacing: 7,
      emotion: 6,
      cta: 5,
      trends: 7,
      tips: [
        'נסה להתחיל עם משפט חזק יותר ב-3 השניות הראשונות',
        'הוסף CTA ברור יותר בסוף הסרטון',
        'שקול לקצר את הסרטון — סרטונים קצרים יותר מקבלים יותר צפיות',
      ],
    };
  }
}
