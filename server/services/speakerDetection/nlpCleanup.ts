import { askClaude, extractJSON } from '../claude';

export async function cleanupPresenterTranscript(
  presenterSegments: Array<{ text: string; start: number; end: number }>,
  removedSegments: Array<{ text: string; start: number; end: number }>
): Promise<{
  cleanedSegments: Array<{ text: string; start: number; end: number; action: 'keep' | 'remove-duplicate' | 'keep-best-take' }>;
  removedDuplicates: number;
}> {

  // Only call Claude if there are enough segments to analyze
  if (presenterSegments.length < 2) {
    return {
      cleanedSegments: presenterSegments.map(s => ({ ...s, action: 'keep' as const })),
      removedDuplicates: 0
    };
  }

  try {
    const response = await askClaude(
      `You analyze Hebrew transcripts from video recordings. Your job is to detect
repeated takes — when a presenter says the same thing multiple times because
they are re-recording. In these cases, keep ONLY the LAST take (it's usually
the best). Also detect and remove any production instructions that slipped
through (like "עוד פעם", "יאללה", "מוכן?"). Return JSON only.`,

      `Here are transcript segments from a presenter (already filtered to remove
off-camera speakers). Check for repeated takes and production artifacts:

${presenterSegments.map((s, i) => `[${i}] (${s.start.toFixed(1)}s-${s.end.toFixed(1)}s): "${s.text}"`).join('\n')}

${removedSegments.length > 0 ? `\nFor context, these segments were identified as off-camera speakers and removed:\n${removedSegments.slice(0, 5).map(s => `(${s.start.toFixed(1)}s): "${s.text}"`).join('\n')}` : ''}

Return JSON:
{
  "segments": [
    { "index": 0, "action": "keep", "reason": "unique content" },
    { "index": 1, "action": "remove-duplicate", "reason": "same as segment 3 but worse delivery" },
    { "index": 2, "action": "keep", "reason": "production instruction removed" },
    { "index": 3, "action": "keep-best-take", "reason": "better version of segment 1" }
  ]
}`
    );

    const parsed = JSON.parse(extractJSON(response));

    const cleanedSegments = presenterSegments.map((seg, i) => {
      const decision = parsed.segments?.find((s: any) => s.index === i);
      return {
        ...seg,
        action: (decision?.action || 'keep') as 'keep' | 'remove-duplicate' | 'keep-best-take',
      };
    });

    const removedDuplicates = cleanedSegments.filter(s => s.action === 'remove-duplicate').length;
    console.log(`[NLP] Removed ${removedDuplicates} duplicate takes`);

    return { cleanedSegments, removedDuplicates };
  } catch {
    console.warn('[NLP] Failed to parse response, keeping all segments');
    return {
      cleanedSegments: presenterSegments.map(s => ({ ...s, action: 'keep' as const })),
      removedDuplicates: 0
    };
  }
}
