// server/services/brollQualityFilter.ts
// AI B-Roll quality filtering: checks AI-generated clips for artifacts.

import { askClaudeVision } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface BRollQAResult {
  clipPath: string;
  score: number;
  issues: string[];
  usable: boolean;
  recommendation: 'use' | 'regenerate' | 'use-with-fix';
}

export async function filterBRollQuality(
  clipPaths: string[]
): Promise<BRollQAResult[]> {
  console.log(`[B-Roll QA] Checking ${clipPaths.length} AI-generated clips...`);
  const results: BRollQAResult[] = [];

  for (const clipPath of clipPaths) {
    // Extract middle frame for quality check
    const framePath = clipPath.replace('.mp4', '_qa.jpg');
    try {
      await runFFmpeg(`ffmpeg -i "${clipPath}" -vf "select=eq(n\\,15)" -vframes 1 -q:v 2 -y "${framePath}"`);
    } catch {
      results.push({ clipPath, score: 0, issues: ['failed to extract frame'], usable: false, recommendation: 'regenerate' });
      continue;
    }

    if (!fs.existsSync(framePath)) {
      results.push({ clipPath, score: 0, issues: ['no frame extracted'], usable: false, recommendation: 'regenerate' });
      continue;
    }

    const imageData = fs.readFileSync(framePath).toString('base64');
    const image = {
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: imageData }
    };

    const response = await askClaudeVision(
      'You are a QA inspector for AI-generated video clips. Check for common AI artifacts.',
      [image, { type: 'text', text: `Rate this AI-generated B-Roll frame 1-10. Check for:
1. MORPHING — objects/faces melting or distorting?
2. FLICKERING — visible frame inconsistencies?
3. BLUR — unnatural blur or softness?
4. ARTIFACTS — weird textures, floating objects, extra fingers/limbs?
5. RELEVANCE — does this look like professional footage?
6. COMPOSITION — is it well-framed and visually appealing?

Return JSON: { "score": 7, "issues": ["slight blur on edges"], "usable": true, "recommendation": "use" }
Score 8-10: excellent, use as-is
Score 6-7: acceptable, minor issues
Score 4-5: mediocre, use only if no alternative
Score 1-3: unusable, regenerate` }]
    );

    try { fs.unlinkSync(framePath); } catch {}

    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      results.push({
        clipPath,
        score: parsed.score ?? 6,
        issues: parsed.issues ?? [],
        usable: parsed.usable ?? true,
        recommendation: parsed.recommendation ?? 'use',
      });
    } catch {
      results.push({ clipPath, score: 6, issues: [], usable: true, recommendation: 'use' });
    }
  }

  const usable = results.filter(r => r.usable).length;
  const needRegen = results.filter(r => r.recommendation === 'regenerate').length;
  console.log(`[B-Roll QA] ${usable}/${results.length} usable, ${needRegen} need regeneration`);

  return results;
}
