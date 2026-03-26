import { askClaudeVision } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface PresenterQualityResult {
  segmentScores: Array<{
    segmentIndex: number;
    startTime: number;
    endTime: number;
    eyeContact: number;          // 1-10: 10 = direct eye contact with camera
    bodyLanguage: number;        // 1-10: 10 = confident posture, no fidgeting
    completeSentence: boolean;   // did they finish the sentence cleanly?
    midWordCut: boolean;         // was the sentence cut mid-word?
    lookingAt: 'camera' | 'side' | 'down' | 'notes' | 'other-person';
    overallPresenterScore: number; // weighted average
    recommendation: 'use' | 'use-with-broll-cover' | 'avoid';
    reason: string;
  }>;
}

export async function analyzePresenterQuality(
  videoPath: string,
  segments: Array<{ start: number; end: number; text: string; index: number }>,
  jobId: string
): Promise<PresenterQualityResult> {
  console.log(`[Presenter QA] Analyzing ${segments.length} segments for presenter quality...`);

  const segmentScores: PresenterQualityResult['segmentScores'] = [];

  // Process in batches of 6 (send 1 frame per segment to Vision)
  for (let batch = 0; batch < segments.length; batch += 6) {
    const batchSegments = segments.slice(batch, batch + 6);
    const frames: Array<{ path: string; segment: typeof batchSegments[0] }> = [];

    for (const seg of batchSegments) {
      // Take frame from middle of segment (most representative)
      const midTime = (seg.start + seg.end) / 2;
      const framePath = `temp/${jobId}/presenter_qa_${seg.index}.jpg`;
      try {
        await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${midTime} -vframes 1 -q:v 2 -y "${framePath}"`);
        frames.push({ path: framePath, segment: seg });
      } catch {
        // If frame extraction fails, give neutral score
        segmentScores.push({
          segmentIndex: seg.index, startTime: seg.start, endTime: seg.end,
          eyeContact: 5, bodyLanguage: 5, completeSentence: true, midWordCut: false,
          lookingAt: 'camera', overallPresenterScore: 5, recommendation: 'use', reason: 'לא ניתן לנתח'
        });
      }
    }

    if (frames.length === 0) continue;

    const images = frames.map(f => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: fs.readFileSync(f.path).toString('base64') }
    }));

    const segmentTexts = frames.map((f, i) =>
      `Frame ${i + 1} (segment ${f.segment.index}, ${f.segment.start.toFixed(1)}s-${f.segment.end.toFixed(1)}s): "${f.segment.text}"`
    ).join('\n');

    const response = await askClaudeVision(
      `You analyze presenter/speaker quality in video frames. You check: eye contact with camera, body language, and professional appearance. Be strict — only high-quality presenter moments should be shown to viewers.`,
      [
        ...images,
        { type: 'text', text: `Analyze the presenter in each frame:

${segmentTexts}

For EACH frame, check:

1. EYE CONTACT (1-10):
   10 = looking directly into camera lens (feels like looking at viewer)
   7-8 = mostly at camera, occasional glance away
   5-6 = alternating between camera and notes/screen
   3-4 = mostly looking away from camera
   1-2 = not looking at camera at all

2. BODY LANGUAGE (1-10):
   10 = confident, open posture, natural gestures
   7-8 = comfortable, mostly still, professional
   5-6 = slightly stiff or fidgety
   3-4 = visibly uncomfortable, closed posture
   1-2 = distracting movements, hunched, looking lost

3. LOOKING AT:
   "camera" = direct eye contact with lens
   "side" = looking to the side (at another person or off-screen)
   "down" = looking down at notes/phone/table
   "notes" = clearly reading from a script/teleprompter (less natural)
   "other-person" = in conversation, looking at interviewer

4. COMPLETE SENTENCE: Check the transcript text — does it end cleanly or mid-word?
   "${frames[0]?.segment.text}" → does this end at a natural sentence boundary?

5. RECOMMENDATION:
   "use" = great presenter moment, show to viewers
   "use-with-broll-cover" = audio is good but visually weak — cover face with B-Roll, keep voice
   "avoid" = both audio and visual are weak — cut this segment

Return JSON array for all ${frames.length} frames:
[{
  "segmentIndex": 0,
  "eyeContact": 9,
  "bodyLanguage": 8,
  "completeSentence": true,
  "midWordCut": false,
  "lookingAt": "camera",
  "overallPresenterScore": 8.5,
  "recommendation": "use",
  "reason": "קשר עין מצוין, שפת גוף בטוחה, משפט שלם"
}]` }
      ]
    );

    // Cleanup frames
    for (const f of frames) { try { fs.unlinkSync(f.path); } catch {} }

    try {
      const parsed = JSON.parse(response);
      for (let i = 0; i < parsed.length; i++) {
        segmentScores.push({
          ...parsed[i],
          segmentIndex: frames[i]?.segment.index ?? parsed[i].segmentIndex,
          startTime: frames[i]?.segment.start ?? 0,
          endTime: frames[i]?.segment.end ?? 0,
        });
      }
    } catch {
      // Fallback neutral scores for this batch
      for (const f of frames) {
        segmentScores.push({
          segmentIndex: f.segment.index, startTime: f.segment.start, endTime: f.segment.end,
          eyeContact: 6, bodyLanguage: 6, completeSentence: true, midWordCut: false,
          lookingAt: 'camera', overallPresenterScore: 6, recommendation: 'use', reason: 'ניתוח בסיסי'
        });
      }
    }
  }

  // Log summary
  const good = segmentScores.filter(s => s.recommendation === 'use').length;
  const cover = segmentScores.filter(s => s.recommendation === 'use-with-broll-cover').length;
  const avoid = segmentScores.filter(s => s.recommendation === 'avoid').length;
  console.log(`[Presenter QA] Results: ${good} use, ${cover} cover with B-Roll, ${avoid} avoid`);

  return { segmentScores };
}
