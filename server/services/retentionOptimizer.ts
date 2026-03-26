import { askClaude } from './claude.js';

export interface RetentionPlan {
  predictions: RetentionPoint[];
  fixes: RetentionFix[];
  predictedRetention: number;    // 0-100% predicted completion rate
}

export interface RetentionPoint {
  timestamp: number;
  predictedRetention: number;    // % of viewers still watching
  risk: 'low' | 'medium' | 'high';
  reason: string;
}

export interface RetentionFix {
  timestamp: number;
  type: 'add-zoom' | 'add-broll' | 'add-sfx' | 'speed-up' | 'add-text' | 'add-music-change';
  reason: string;
}

export async function analyzeRetention(
  editingBlueprint: any,
  contentAnalysis: any,
  duration: number,
  platform: string
): Promise<RetentionPlan> {
  console.log(`[Retention] Analyzing retention for ${duration.toFixed(0)}s ${platform} video...`);

  try {
    const response = await askClaude(
      `You predict viewer retention for social media videos. You know:
- Average viewer decides to stay or leave within 1.3 seconds
- 65% who watch 3 seconds will watch 10 seconds
- 45% who watch 3 seconds will watch 30 seconds
- Viewers drop off at: topic changes without visual change, long static shots (>5s), energy dips, unclear segments
- Retention killers: boring intro, no visual variety, monotone delivery, no text/graphics
- Retention boosters: frequent visual changes, zooms, B-Roll, text overlays, SFX, music changes, humor`,

      `Predict viewer retention for this ${duration.toFixed(0)}-second ${platform} video.

Content structure:
${JSON.stringify(contentAnalysis?.storyArc?.suggestedStructure || contentAnalysis?.structure || [], null, 2)}

Editing plan:
- Cuts planned: ${editingBlueprint?.cuts?.length || editingBlueprint?.cutTransitions?.length || 0}
- Zooms planned: ${editingBlueprint?.zooms?.length || 0}
- B-Roll insertions: ${editingBlueprint?.brollInsertions?.length || editingBlueprint?.brollCoverMoments?.length || 0}
- SFX placements: ${editingBlueprint?.soundDesign?.sfx?.length || 0}

Platform: ${platform}
Expected viewer behavior: ${platform === 'tiktok' ? 'very impatient, need change every 2-3s' : platform === 'instagram-reels' ? 'somewhat impatient, need change every 3-4s' : 'more patient, change every 5-8s'}

For every 5-second interval of the video, predict:
1. What % of viewers are still watching?
2. Is there a drop-off risk? Why?
3. What should be added to PREVENT the drop-off?

Return JSON only:
{
  "predictions": [
    { "timestamp": 0, "predictedRetention": 100, "risk": "low", "reason": "hook grabs attention" },
    { "timestamp": 5, "predictedRetention": 72, "risk": "medium", "reason": "transition from hook to content" }
  ],
  "fixes": [
    { "timestamp": 10, "type": "add-zoom", "reason": "break up static shot — viewers dropping" },
    { "timestamp": 20, "type": "add-broll", "reason": "long talking segment — add visual variety" }
  ],
  "predictedRetention": 58
}

THE KEY RULE: No 5-second interval should have ZERO visual changes.
If any interval has no zoom, no B-Roll, no text change, and no cut — flag it for a fix.`
    );

    const plan = JSON.parse(response);
    console.log(`[Retention] Predicted retention: ${plan.predictedRetention}% | ${plan.fixes.length} fixes suggested`);
    return plan;
  } catch (error: any) {
    console.error('[Retention] Analysis failed:', error.message);
    return { predictions: [], fixes: [], predictedRetention: 50 };
  }
}
