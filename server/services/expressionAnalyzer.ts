// server/services/expressionAnalyzer.ts
// Analyzes facial micro-expressions to guide editing decisions (zoom, B-Roll cover, cut).

import { askClaudeVision } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface ExpressionAnalysis {
  expressions: Array<{
    timestamp: number;
    expression: 'genuine-smile' | 'nervous' | 'confident' | 'uncertain' | 'passionate' | 'bored' | 'neutral' | 'looking-away' | 'eyes-closed';
    confidence: number;
    recommendation: 'zoom-in' | 'keep' | 'cover-with-broll' | 'use-as-hook' | 'cut';
    reason: string;
  }>;
}

export async function analyzeExpressions(
  videoPath: string,
  duration: number,
  presenterTimestamps: Array<{ start: number; end: number }>
): Promise<ExpressionAnalysis> {
  console.log(`[Expressions] Analyzing facial expressions across ${presenterTimestamps.length} presenter segments`);

  // Sample 1 frame per 3 seconds during presenter segments only
  const samplePoints: number[] = [];
  for (const seg of presenterTimestamps) {
    for (let t = seg.start; t < seg.end; t += 3) {
      samplePoints.push(t);
    }
  }

  // Limit to 12 frames to control costs
  const selectedPoints = samplePoints.length > 12
    ? samplePoints.filter((_, i) => i % Math.ceil(samplePoints.length / 12) === 0).slice(0, 12)
    : samplePoints;

  const frames: Array<{ path: string; timestamp: number }> = [];
  for (let i = 0; i < selectedPoints.length; i++) {
    const framePath = `temp/expr_${i}.jpg`;
    try {
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${selectedPoints[i]} -vframes 1 -q:v 2 -y "${framePath}"`);
      frames.push({ path: framePath, timestamp: selectedPoints[i] });
    } catch (error: any) {
      console.error(`[Expressions] Failed to extract frame at ${selectedPoints[i]}s:`, error.message);
    }
  }

  if (frames.length === 0) {
    console.warn('[Expressions] No frames extracted, skipping analysis');
    return { expressions: [] };
  }

  // Send in batches of 6 to Claude Vision
  const allExpressions: ExpressionAnalysis['expressions'] = [];

  for (let batch = 0; batch < frames.length; batch += 6) {
    const batchFrames = frames.slice(batch, batch + 6);
    const images = batchFrames.map(f => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data: fs.readFileSync(f.path).toString('base64'),
      },
    }));

    try {
      const response = await askClaudeVision(
        'You analyze facial expressions in video frames to guide editing decisions.',
        [
          ...images,
          {
            type: 'text',
            text: `Analyze the speaker's facial expression in each of these ${batchFrames.length} frames.
Timestamps: ${batchFrames.map(f => f.timestamp.toFixed(1) + 's').join(', ')}

For each frame return:
{
  "timestamp": <seconds>,
  "expression": "genuine-smile|nervous|confident|uncertain|passionate|bored|neutral|looking-away|eyes-closed",
  "confidence": 0.85,
  "recommendation": "<see rules below>",
  "reason": "explanation"
}

EDITING RECOMMENDATIONS:
- genuine-smile / passionate / confident → "zoom-in" (show this face! it builds trust)
- nervous / uncertain → "cover-with-broll" (keep the audio but hide the face)
- bored / neutral → "keep" (okay but don't zoom in)
- looking-away / eyes-closed → "cut" (remove this segment if possible)
- Use "use-as-hook" if expression is very strong (genuine surprise/excitement)

Return JSON array for all ${batchFrames.length} frames.`,
          },
        ]
      );

      const parsed = JSON.parse(response);
      const results = Array.isArray(parsed) ? parsed : [];
      for (let i = 0; i < results.length; i++) {
        allExpressions.push({
          ...results[i],
          timestamp: batchFrames[i]?.timestamp || results[i].timestamp,
        });
      }
    } catch (error: any) {
      console.error(`[Expressions] Batch analysis failed:`, error.message);
    }
  }

  // Cleanup
  for (const f of frames) {
    try { fs.unlinkSync(f.path); } catch {}
  }

  const positive = allExpressions.filter(e =>
    ['genuine-smile', 'passionate', 'confident'].includes(e.expression)
  ).length;
  const negative = allExpressions.filter(e =>
    ['nervous', 'looking-away', 'eyes-closed'].includes(e.expression)
  ).length;

  console.log(`[Expressions] Analyzed ${allExpressions.length} frames. Positive: ${positive}, Negative: ${negative}, Neutral: ${allExpressions.length - positive - negative}`);

  return { expressions: allExpressions };
}
