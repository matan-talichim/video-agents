import { askClaude } from './claude.js';

export interface FreshEyesResult {
  improvements: Array<{
    area: string;
    issue: string;
    fix: string;
    priority: 'critical' | 'important' | 'nice-to-have';
    autoFixable: boolean;
  }>;
  overallConfidence: number;   // 1-10
  wouldApprove: boolean;
}

export async function runFreshEyesReview(
  editingBlueprint: any,
  contentSelection: any,
  marketingPlan: any,
  emotionalArc: any,
  duration: number,
  platform: string
): Promise<FreshEyesResult> {
  console.log('[Fresh Eyes] Running second-opinion review...');

  const response = await askClaude(
    `You are a DIFFERENT video editor reviewing someone else's editing plan. You have NEVER seen this video before. Your job is to find what the original editor missed. Be critical but constructive. You're the last pair of eyes before the video goes to the client.`,

    `Review this editing plan with FRESH EYES. Find problems.

VIDEO: ${duration.toFixed(0)} seconds for ${platform}

EDITING PLAN SUMMARY:
- Cuts planned: ${editingBlueprint?.cuts?.length || 0}
- Zooms planned: ${editingBlueprint?.zooms?.length || 0}
- B-Roll insertions: ${editingBlueprint?.brollInsertions?.length || 0}
- SFX placements: ${editingBlueprint?.soundDesign?.sfx?.length || 0}
- Speed ramps: ${editingBlueprint?.speedRamps?.length || 0}
- Pattern interrupts: ${editingBlueprint?.patternInterrupts?.length || 0}
- Emotional arc phases: ${emotionalArc?.length || 0}

CONTENT SELECTION:
- Total footage: ${contentSelection?.summary?.totalFootageDuration?.toFixed(0) || '?'}s
- Kept: ${contentSelection?.summary?.keepDuration?.toFixed(0) || '?'}s (${contentSelection?.summary?.cutPercentage || '?'}% cut)
- Must-keep segments: ${contentSelection?.summary?.mustKeepCount || 0}
- Top moment score: ${contentSelection?.topMoments?.[0]?.segment?.totalScore || '?'}

MARKETING:
- Framework: ${marketingPlan?.framework?.selectedFramework || 'none'}
- CTA: "${marketingPlan?.ctaPlan?.primaryCTA?.text || 'none'}"
- Industry: ${marketingPlan?.industryStrategy?.industry || 'unknown'}

CUT TIMESTAMPS:
${editingBlueprint?.cuts?.slice(0, 10).map((c: any) => `  ${c.at?.toFixed(1)}s: ${c.type} (murch: ${c.murchScore || '?'}) — ${c.reason || ''}`).join('\n') || 'none'}

ZOOM TIMESTAMPS:
${editingBlueprint?.zooms?.slice(0, 8).map((z: any) => `  ${z.timestamp?.toFixed(1)}s: ${z.zoomFrom}→${z.zoomTo} — ${z.reason || ''}`).join('\n') || 'none'}

CHECK FOR THESE 12 PROBLEMS:

1. PACING GAPS — Any section >6 seconds without a visual change (no cut, zoom, B-Roll, or text)?
2. B-ROLL OVERUSE — More than 8 seconds of B-Roll without returning to speaker? Viewer forgets who's talking.
3. SFX OVERLOAD — More than 2 SFX within 3 seconds? Feels cluttered.
4. EMOTIONAL FLATLINE — Any section where energy stays the same for >10 seconds?
5. CTA PLACEMENT — Is CTA only at the end? Should there be a mid-roll soft CTA too?
6. HOOK WEAKNESS — Do the first 3 seconds actually hook? Or is it a slow generic start?
7. MISSING SOCIAL PROOF — Is there social proof BEFORE the CTA to build confidence?
8. AUDIO BALANCE — Is voice processing planned? Music ducking at correct levels?
9. COLOR CONSISTENCY — Does the color plan jump between warm and cool without narrative reason?
10. CONTENT MISSED — Were any segments scored >80 left out of the final cut?
11. ENDING STRENGTH — Does the video end strong (CTA + urgency) or just fade out?
12. PLATFORM MISMATCH — Is the pacing appropriate for ${platform}? (TikTok=very fast, YouTube=moderate, LinkedIn=slow)

Return JSON:
{
  "improvements": [
    {
      "area": "pacing",
      "issue": "seconds 15-22 have no visual change — 7 seconds of static talking head",
      "fix": "add zoom-punch at 18s or B-Roll flash at 16s",
      "priority": "important",
      "autoFixable": true
    }
  ],
  "overallConfidence": 8,
  "wouldApprove": true
}

Be HONEST. If the plan is excellent, say so with confidence 9-10. If there are issues, flag them. This is the LAST chance before spending money on rendering.`
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    return { improvements: [], overallConfidence: 7, wouldApprove: true };
  }
}

export function autoApplyFixes(
  blueprint: any,
  fixes: FreshEyesResult['improvements']
): number {
  let appliedCount = 0;

  for (const fix of fixes) {
    if (fix.priority !== 'critical' || !fix.autoFixable) continue;

    switch (fix.area) {
      case 'pacing': {
        // Auto-add a zoom-punch at the gap midpoint
        const gapMatch = fix.issue.match(/seconds? (\d+)/);
        if (gapMatch && blueprint.patternInterrupts) {
          const gapTime = parseInt(gapMatch[1]) + 3; // midpoint of gap
          blueprint.patternInterrupts.push({
            at: gapTime,
            type: 'zoom-punch',
            duration: 0.5,
            intensity: 'medium',
            reason: `fresh-eyes fix: ${fix.issue}`,
          });
          appliedCount++;
        }
        break;
      }

      case 'cta': {
        // Auto-add mid-roll soft CTA
        if (blueprint.platformOptimization && !blueprint.midrollCTA) {
          const midpoint = blueprint.cuts?.length > 0
            ? blueprint.cuts[Math.floor(blueprint.cuts.length * 0.6)]?.at
            : 30;
          if (midpoint) {
            blueprint.midrollCTA = {
              text: '\u05E8\u05D5\u05E6\u05D9\u05DD \u05DC\u05D3\u05E2\u05EA \u05E2\u05D5\u05D3?',
              timestamp: midpoint,
              style: 'text-overlay',
              subtle: true,
            };
            appliedCount++;
          }
        }
        break;
      }
    }
  }

  return appliedCount;
}
