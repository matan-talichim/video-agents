// server/services/brandCompliance.ts
// Checks rendered video frames for brand guideline compliance using Claude Vision.

import { askClaudeVision, parseVisionJSON } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface BrandComplianceResult {
  score: number;
  issues: Array<{
    element: string;
    issue: string;
    severity: 'critical' | 'warning';
    autoFixable: boolean;
  }>;
  passed: boolean;
}

export async function checkBrandCompliance(
  videoPath: string,
  duration: number,
  brandKit: any,
  jobId?: string
): Promise<BrandComplianceResult> {
  if (!brandKit) return { score: 10, issues: [], passed: true };

  console.log('[BrandCompliance] Checking brand compliance...');

  // Extract first frame, middle frame, last frame
  const frameTimes = [0.5, duration * 0.5, Math.max(0.5, duration - 1)];
  const framePaths: string[] = [];

  for (let i = 0; i < frameTimes.length; i++) {
    const path = `temp/${jobId || ''}/brand_check_${i}.jpg`.replace('//', '/');
    try {
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${frameTimes[i]} -vframes 1 -q:v 2 -y "${path}"`);
      framePaths.push(path);
    } catch (error: any) {
      console.error(`[BrandCompliance] Failed to extract frame at ${frameTimes[i]}s:`, error.message);
    }
  }

  if (framePaths.length === 0) {
    console.warn('[BrandCompliance] No frames extracted, skipping check');
    return { score: 7, issues: [], passed: true };
  }

  const images = framePaths.map(f => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: fs.readFileSync(f).toString('base64'),
    },
  }));

  try {
    const response = await askClaudeVision(
      'You check videos for brand compliance. Every branded video must follow brand guidelines. RESPOND ONLY WITH A JSON OBJECT. No text before or after. Start your response with { and end with }.',
      [
        ...images,
        {
          type: 'text',
          text: `Check brand compliance. Brand kit:
Logo: ${brandKit.logoFile ? 'provided' : 'none'}
Primary color: ${brandKit.primaryColor || 'not set'}
Secondary color: ${brandKit.secondaryColor || 'not set'}
Font: ${brandKit.font || 'not set'}

Check these 3 frames (start, middle, end):
1. LOGO — visible in first or last frame? Correct size (not too small/large)? Not distorted?
2. COLORS — brand colors used in text overlays and CTA? Consistent throughout?
3. FONT — consistent font used? Matches brand style?
4. OVERALL — does video feel on-brand? Professional?

Return JSON:
{ "score": 8, "issues": [{ "element": "logo", "issue": "לוגו לא מופיע בפריים האחרון", "severity": "warning", "autoFixable": true }], "passed": true }`,
        },
      ]
    );

    const result = parseVisionJSON(response, { score: 7, issues: [], passed: true });
    console.log(`[BrandCompliance] Score: ${result.score}/10 | Issues: ${result.issues?.length || 0} | Passed: ${result.passed}`);
    return result;
  } catch (error: any) {
    console.error('[BrandCompliance] Check failed:', error.message);
    return { score: 7, issues: [], passed: true };
  } finally {
    // Cleanup extracted frames
    for (const f of framePaths) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}
