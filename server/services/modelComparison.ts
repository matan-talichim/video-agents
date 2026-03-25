import fs from 'fs';
import * as kie from './kie.js';

export interface ComparisonResult {
  model: string;
  success: boolean;
  outputPath: string | null;
  duration?: number;
  fileSize?: number;
  error?: string;
}

// Generate the same prompt on multiple models and return all results
export async function compareModels(
  prompt: string,
  models: string[],
  duration: number,
  outputDir: string
): Promise<ComparisonResult[]> {
  console.log(`[Compare] Generating "${prompt.slice(0, 50)}..." on ${models.length} models`);

  // Generate on all models in parallel (respecting rate limits via kie.ts semaphore)
  const promises = models.map(async (model) => {
    const outputPath = `${outputDir}/compare_${model.replace(/[\s.]/g, '_')}.mp4`;
    const startTime = Date.now();

    try {
      await kie.generateVideo(prompt, model as any, duration, outputPath);
      const elapsed = (Date.now() - startTime) / 1000;

      return {
        model,
        success: true,
        outputPath,
        duration: elapsed,
        fileSize: fs.statSync(outputPath).size,
      };
    } catch (error: any) {
      return {
        model,
        success: false,
        outputPath: null,
        error: error.message,
        duration: (Date.now() - startTime) / 1000,
      };
    }
  });

  const settled = await Promise.allSettled(promises);
  const results: ComparisonResult[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    }
  }

  console.log(`[Compare] Results: ${results.filter(r => r.success).length}/${models.length} succeeded`);
  return results;
}
