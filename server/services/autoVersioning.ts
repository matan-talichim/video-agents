// server/services/autoVersioning.ts
// Creates 3 optimized video versions (full, medium, short) from the same content.

import { askClaude } from './claude.js';

export interface VersionPlan {
  versions: Array<{
    name: string;
    targetDuration: number;
    segmentIndices: number[];
    hookIndex: number;
    ctaStyle: string;
    platform: string;
  }>;
}

export async function planAutoVersions(
  segments: any[],
  totalDuration: number,
  platforms: string[]
): Promise<VersionPlan> {
  console.log(`[AutoVersioning] Planning 3 versions from ${totalDuration.toFixed(0)}s content (${segments.length} segments)`);

  const keepSegments = segments
    .filter(s => s.decision === 'must-keep' || s.decision === 'keep')
    .map((s, i) => `[${i}] score:${s.totalScore} hook:${s.scores.hookPotential} "${(s.text || '').slice(0, 50)}"`)
    .join('\n');

  const response = await askClaude(
    'You create multiple video versions from the same content. Each version uses only the best segments for its duration.',
    `Create 3 versions from this content (${totalDuration.toFixed(0)}s total, ${segments.length} segments):

${keepSegments}

VERSION 1 — FULL (45-60s): Use most content. For YouTube/website.
VERSION 2 — MEDIUM (25-35s): Only high-scoring segments. For Instagram Reels.
VERSION 3 — SHORT (12-18s): Only the absolute best + CTA. For TikTok/Stories.

Rules:
- All 3 versions use the SAME hook (strongest hookPotential segment)
- All 3 end with CTA
- SHORT version = hook + 1 key point + CTA (nothing else)
- MEDIUM = hook + 3-4 key points + social proof + CTA
- FULL = hook + all key points + details + social proof + CTA

Return JSON:
{
  "versions": [
    { "name": "full", "targetDuration": 55, "segmentIndices": [7,0,1,2,3,4,5,6], "hookIndex": 7, "ctaStyle": "end-screen", "platform": "youtube" },
    { "name": "medium", "targetDuration": 30, "segmentIndices": [7,2,4,6], "hookIndex": 7, "ctaStyle": "text-overlay", "platform": "instagram-reels" },
    { "name": "short", "targetDuration": 15, "segmentIndices": [7,4], "hookIndex": 7, "ctaStyle": "quick-cta", "platform": "tiktok" }
  ]
}`
  );

  try {
    const plan = JSON.parse(response);
    console.log(`[AutoVersioning] Planned ${plan.versions.length} versions: ${plan.versions.map((v: any) => `${v.name}(${v.targetDuration}s)`).join(', ')}`);
    return plan;
  } catch {
    console.warn('[AutoVersioning] Failed to parse Claude response, using fallback single version');
    return {
      versions: [{
        name: 'full',
        targetDuration: totalDuration,
        segmentIndices: segments.map((_, i) => i),
        hookIndex: 0,
        ctaStyle: 'end-screen',
        platform: 'youtube',
      }],
    };
  }
}
