import { askClaude } from './claude.js';
import { CINEMATIC_PROMPTING_PROMPT } from './editingRules.js';

export interface CinematicBRollPrompt {
  basicConcept: string;
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
  cameraMovement?: string;
  shotType?: string;
  lighting?: string;
  style?: string;
}

export async function generateCinematicBRollPrompt(
  basicConcept: string,
  videoCategory: string,
  brandStyle?: string
): Promise<CinematicBRollPrompt> {
  try {
    const response = await askClaude(
      CINEMATIC_PROMPTING_PROMPT,
      `Transform this basic B-Roll concept into a cinematic prompt:
Concept: "${basicConcept}"
Category: ${videoCategory}
Brand style: ${brandStyle || 'cinematic-luxury'}

Return ONLY valid JSON, no markdown:
{
  "basicConcept": "...",
  "imagePrompt": "...",
  "videoPrompt": "...",
  "negativePrompt": "...",
  "cameraMovement": "...",
  "shotType": "...",
  "lighting": "...",
  "style": "..."
}`
    );

    const jsonStr = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      basicConcept,
      imagePrompt: parsed.imagePrompt || basicConcept,
      videoPrompt: parsed.videoPrompt || basicConcept,
      negativePrompt: parsed.negativePrompt || 'no text, no watermark, no blurry, no distortion',
      cameraMovement: parsed.cameraMovement,
      shotType: parsed.shotType,
      lighting: parsed.lighting,
      style: parsed.style,
    };
  } catch (error: any) {
    console.error('[BRollGenerator] Cinematic prompt generation failed:', error.message);
    return {
      basicConcept,
      imagePrompt: basicConcept,
      videoPrompt: basicConcept,
      negativePrompt: 'no text, no watermark, no blurry, no distortion',
    };
  }
}

export async function transformBRollPlanToCinematic(
  brollPlan: Array<{ timestamp: number; duration: number; prompt: string; reason: string }>,
  videoCategory: string,
  brandStyle?: string
): Promise<Array<{
  timestamp: number;
  duration: number;
  prompt: string;
  reason: string;
  cinematicPrompt: CinematicBRollPrompt;
}>> {
  const results = [];

  for (const clip of brollPlan) {
    const cinematicPrompt = await generateCinematicBRollPrompt(
      clip.prompt,
      videoCategory,
      brandStyle
    );
    results.push({
      ...clip,
      cinematicPrompt,
    });
  }

  return results;
}
