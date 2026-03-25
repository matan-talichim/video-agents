import { askClaude } from './claude.js';

export interface ModelRecommendation {
  model: string;
  reason: string;
  confidence: number;
}

// AI selects the best model for a given prompt
export async function selectBestModel(
  prompt: string,
  budget: 'low' | 'medium' | 'high'
): Promise<ModelRecommendation> {
  const response = await askClaude(
    'You are an AI video generation expert who knows the strengths of each model.',
    `Select the best AI video model for this generation prompt: "${prompt}"

Budget level: ${budget}

Available models:
1. veo-3.1-fast — Best for: cinematic, nature, architecture. Fast. Medium cost.
2. sora-2 — Best for: highest quality, complex scenes, people. Slow. High cost.
3. kling-v2.5-turbo — Best for: fast turnaround, simple scenes, social media. Fastest. Low cost.
4. wan-2.5 — Best for: artistic styles, abstract, creative. Slow. Medium cost.
5. seedance-1.5-pro — Best for: product shots, e-commerce, motion. Medium speed. Medium cost.

Return JSON: { "model": "model-name", "reason": "why this model", "confidence": 0.85 }

Consider:
- Budget "low" → prefer kling-v2.5-turbo
- Budget "high" → prefer sora-2
- If prompt mentions buildings/real estate → veo-3.1-fast
- If prompt mentions products → seedance-1.5-pro
- If prompt is artistic/abstract → wan-2.5`
  );

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Default to kling turbo (fast + cheap)
    return { model: 'kling-v2.5-turbo', reason: 'Default fast model', confidence: 0.5 };
  }
}
