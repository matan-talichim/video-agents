import { askClaude } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';

export interface LoopPlan {
  strategy: 'visual-match' | 'audio-match' | 'text-cliffhanger' | 'question-answer' | 'none';
  lastFrameAdjustment: string;  // what to change in the last 1-2 seconds
  firstFrameConnection: string; // how the first frame connects
  endText?: string;             // text to show at the very end that connects to the start
  description: string;          // Hebrew description
}

export async function planLoop(
  transcript: any,
  hookText: string,
  duration: number,
  platform: string
): Promise<LoopPlan> {
  // Only loop for short-form vertical content
  if (platform !== 'tiktok' && platform !== 'instagram-reels') {
    return { strategy: 'none', lastFrameAdjustment: '', firstFrameConnection: '', description: 'לא רלוונטי לפלטפורמה זו' };
  }

  if (duration > 60) {
    return { strategy: 'none', lastFrameAdjustment: '', firstFrameConnection: '', description: 'סרטון ארוך מדי ל-loop' };
  }

  console.log(`[Loop] Planning loop strategy for ${duration}s ${platform} video...`);

  try {
    const response = await askClaude(
      `You create loop-able videos for TikTok and Reels. A loop is when the END of the video connects to the BEGINNING, causing viewers to watch again (which the algorithm LOVES).`,

      `Create a loop strategy for this ${duration}s ${platform} video.

Opening hook text: "${hookText}"
Content summary: "${transcript?.fullText?.slice(0, 200) || ''}"

Choose the BEST loop strategy:

1. "visual-match" — Last shot visually matches the first shot (same framing, same colors)
2. "audio-match" — Last word flows into the first word
3. "text-cliffhanger" — Last second shows text that creates a cliffhanger, answer is in the hook
4. "question-answer" — Video ends with a question, answer is in the hook

Return JSON only:
{
  "strategy": "text-cliffhanger",
  "lastFrameAdjustment": "add text overlay in last 1.5 seconds",
  "firstFrameConnection": "the hook text answers the cliffhanger",
  "endText": "...חכו לראות",
  "description": "Hebrew description of the loop strategy"
}

The loop should feel NATURAL, not forced.`
    );

    const plan = JSON.parse(response);
    console.log(`[Loop] Strategy: ${plan.strategy} — ${plan.description}`);
    return plan;
  } catch (error: any) {
    console.error('[Loop] Planning failed:', error.message);
    return {
      strategy: 'text-cliffhanger',
      lastFrameAdjustment: 'add "..." text',
      firstFrameConnection: 'hook answers the cliffhanger',
      endText: '...',
      description: 'loop בסיסי',
    };
  }
}

// Apply loop to the rendered video
export async function applyLoop(
  videoPath: string,
  loopPlan: LoopPlan,
  outputPath: string,
  duration: number
): Promise<string> {
  if (loopPlan.strategy === 'none') {
    return videoPath;
  }

  console.log(`[Loop] Applying ${loopPlan.strategy} loop...`);

  // Add end text overlay in the last 1.5 seconds
  if (loopPlan.endText) {
    const text = loopPlan.endText.replace(/'/g, "'\\''").replace(/:/g, '\\:');
    const startTime = Math.max(0, duration - 1.5);

    try {
      await runFFmpeg(
        `ffmpeg -i "${videoPath}" -vf "drawtext=text='${text}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(t,${startTime})'" -c:a copy -y "${outputPath}"`
      );
      return outputPath;
    } catch (error: any) {
      console.error('[Loop] Apply failed:', error.message);
      return videoPath;
    }
  }

  return videoPath;
}
