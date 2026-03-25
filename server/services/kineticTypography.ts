import { askClaude } from './claude.js';
import type { TranscriptResult } from '../types.js';

export interface KineticTextElement {
  text: string;
  startTime: number;
  endTime: number;
  animation: 'explode' | 'bounce' | 'typewriter' | 'wave' | 'shake' | 'fade-in' | 'slide-up';
  emphasis: 'normal' | 'strong' | 'highlight';
  fontSize: 'small' | 'medium' | 'large';
}

/**
 * Analyze transcript and create kinetic typography plan.
 * Identifies 3-5 key moments where animated text would add visual impact.
 */
export async function planKineticTypography(transcript: TranscriptResult): Promise<KineticTextElement[]> {
  console.log('[KineticTypography] Planning kinetic text elements...');
  const startTime = Date.now();

  try {
    const response = await askClaude(
      'You plan kinetic typography for professional video editing. Return only valid JSON array.',
      `Analyze this transcript and identify 3-5 key moments where animated text would add impact.

Transcript: ${transcript.fullText}

For each moment, choose:
- text: the exact words to animate (1-4 words max)
- startTime / endTime: when the text appears (match transcript timing)
- animation: explode (words fly from edges), bounce (words bounce in), typewriter (char by char), wave (text undulates), shake (vibrates on emphasis)
- emphasis: normal, strong (bigger), highlight (colored)
- fontSize: small, medium, large

Return JSON array:
[{ "text": "...", "startTime": 5.2, "endTime": 7.0, "animation": "bounce", "emphasis": "strong", "fontSize": "large" }]

Rules:
- Only animate KEY words/phrases (not full sentences)
- Don't animate during the first 2 seconds (hook area)
- Space them at least 8 seconds apart
- Match animation to content (numbers -> bounce, emotions -> wave, actions -> explode)`
    );

    const jsonStr = response
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const elements: KineticTextElement[] = JSON.parse(jsonStr);
    const duration = Date.now() - startTime;
    console.log(`[KineticTypography] Planned ${elements.length} elements in ${duration}ms`);
    return elements;
  } catch (error: any) {
    console.error('[KineticTypography] Planning failed:', error.message);
    return [];
  }
}

/**
 * Generate FFmpeg drawtext command for a single kinetic text element.
 * This is the basic FFmpeg version — Remotion animated version comes in Phase 9.
 */
export function addKineticTextCommand(input: string, element: KineticTextElement, output: string): string {
  const fontSize = element.fontSize === 'large' ? 48 : element.fontSize === 'medium' ? 36 : 24;
  const color = element.emphasis === 'highlight' ? '#7c3aed' : element.emphasis === 'strong' ? '#ffffff' : '#cccccc';

  // Escape single quotes in text for FFmpeg
  const safeText = element.text.replace(/'/g, "'\\''");

  return `ffmpeg -i "${input}" -vf "drawtext=text='${safeText}':fontsize=${fontSize}:fontcolor=${color}:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${element.startTime},${element.endTime})':box=1:boxcolor=black@0.4:boxborderw=10" -c:a copy -y "${output}"`;
}
