import fs from 'fs';
import { askClaudeVision, askClaude, parseVisionJSON } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import type { TranscriptResult } from '../types.js';

export interface PresenterDetection {
  presenterId: number;
  presenterDescription: string;
  allSpeakers: SpeakerInfo[];
  presenterSegments: Array<{ start: number; end: number; text: string }>;
  nonPresenterSegments: Array<{ start: number; end: number; speakerId: number; role: string }>;
  confidence: number;
}

export interface SpeakerInfo {
  speakerId: number;
  role: 'presenter' | 'director' | 'assistant' | 'interviewer' | 'background' | 'unknown';
  totalSpeakingTime: number;
  segmentCount: number;
  isOnCamera: boolean;
  description: string;
}

export async function detectPresenter(
  videoPath: string,
  transcript: TranscriptResult
): Promise<PresenterDetection> {
  console.log('[Presenter] Starting presenter detection...');

  // Step 1: Group transcript by speaker
  const speakerSegments = groupBySpeaker(transcript);
  const speakerIds = Object.keys(speakerSegments).map(Number);

  console.log(`[Presenter] Found ${speakerIds.length} unique speakers`);

  // If only one speaker — they're the presenter
  if (speakerIds.length <= 1) {
    const id = speakerIds[0] || 0;
    const segments = speakerSegments[id] || [];
    return {
      presenterId: id,
      presenterDescription: 'דובר יחיד',
      allSpeakers: [{
        speakerId: id,
        role: 'presenter',
        totalSpeakingTime: segments.reduce((sum, s) => sum + (s.end - s.start), 0),
        segmentCount: segments.length,
        isOnCamera: true,
        description: 'דובר יחיד בסרטון',
      }],
      presenterSegments: segments,
      nonPresenterSegments: [],
      confidence: 1.0,
    };
  }

  // Step 2: For each speaker, extract frames during their speech and check if on camera
  const speakerAnalysis: SpeakerInfo[] = [];
  const tempDir = `temp/presenter_detect_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  for (const speakerId of speakerIds) {
    const segments = speakerSegments[speakerId];
    if (!segments || segments.length === 0) continue;

    // Pick up to 3 segments longer than 1 second to check visually
    const samplesToCheck = segments
      .filter(s => (s.end - s.start) > 1)
      .slice(0, 3);

    let onCameraCount = 0;
    let description = '';

    for (const sample of samplesToCheck) {
      const midpoint = (sample.start + sample.end) / 2;
      const framePath = `${tempDir}/s${speakerId}_${midpoint.toFixed(0)}.jpg`;

      try {
        await runFFmpeg(
          `ffmpeg -i "${videoPath}" -ss ${midpoint} -vframes 1 -q:v 2 -y "${framePath}"`
        );

        if (!fs.existsSync(framePath)) continue;

        const imageBase64 = fs.readFileSync(framePath).toString('base64');

        const response = await askClaudeVision(
          'You detect if a person in a video frame is actively speaking (presenting to camera). Return ONLY valid JSON, no markdown.',
          [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
            },
            {
              type: 'text',
              text: `At this moment, speaker ${speakerId} is talking according to the audio transcript.
Look at this frame and answer:
1. Is there a person FACING THE CAMERA who appears to be speaking (lips open/moving, looking at camera)?
2. Or is the speaking voice coming from OFF-CAMERA (no one facing camera has open lips)?
3. Describe the person on camera briefly (appearance, position).

Return JSON:
{
  "isOnCamera": true/false,
  "isSpeakingToCamera": true/false,
  "personDescription": "short description in Hebrew",
  "lipsAppearOpen": true/false,
  "lookingAtCamera": true/false
}`,
            },
          ]
        );

        const result = parseVisionJSON(response, { isOnCamera: false, isSpeakingToCamera: false, personDescription: '' });
        if (result.isOnCamera && result.isSpeakingToCamera) onCameraCount++;
        if (!description && result.personDescription) description = result.personDescription;

        try { fs.unlinkSync(framePath); } catch {}
      } catch (error: any) {
        console.error(`[Presenter] Frame check failed for speaker ${speakerId}:`, error.message);
      }
    }

    const totalTime = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
    const isOnCamera = samplesToCheck.length > 0 && onCameraCount >= Math.ceil(samplesToCheck.length / 2);

    speakerAnalysis.push({
      speakerId,
      role: isOnCamera ? 'presenter' : 'unknown',
      totalSpeakingTime: totalTime,
      segmentCount: segments.length,
      isOnCamera,
      description: description || `דובר ${speakerId}`,
    });
  }

  // Cleanup temp dir
  try { fs.rmdirSync(tempDir); } catch {}

  // Step 3: Determine the presenter
  const onCameraSpeakers = speakerAnalysis.filter(s => s.isOnCamera);
  const multiplePresenters = onCameraSpeakers.length >= 2;

  let presenter: SpeakerInfo;

  if (onCameraSpeakers.length > 0) {
    // Pick the on-camera speaker with most speaking time
    presenter = onCameraSpeakers.sort((a, b) => b.totalSpeakingTime - a.totalSpeakingTime)[0];
    presenter.role = 'presenter';

    // Interview format: if 2+ people on camera, mark second as interviewer/interviewee
    if (multiplePresenters) {
      for (const speaker of onCameraSpeakers) {
        if (speaker.speakerId === presenter.speakerId) continue;
        speaker.role = 'interviewer';
      }
    }
  } else {
    // No on-camera speaker found — pick the one with most speaking time
    presenter = speakerAnalysis.sort((a, b) => b.totalSpeakingTime - a.totalSpeakingTime)[0];
    presenter.role = 'presenter';
  }

  // Step 4: Classify off-camera speakers using Claude
  for (const speaker of speakerAnalysis) {
    if (speaker.speakerId === presenter.speakerId) continue;
    if (speaker.isOnCamera) continue; // Already classified (interviewer)

    const offCameraSegs = speakerSegments[speaker.speakerId];
    if (!offCameraSegs || offCameraSegs.length === 0) continue;

    const sampleTexts = offCameraSegs.slice(0, 5).map(s => s.text).join(' | ');

    try {
      const roleResponse = await askClaude(
        'You classify speaker roles in video production. Return ONLY valid JSON, no markdown.',
        `The main presenter (on camera) is speaker ${presenter.speakerId}.
Speaker ${speaker.speakerId} is OFF-CAMERA and says: "${sampleTexts}"

What is their role?
- "director": giving instructions like "תתחיל", "עוד פעם", "יותר לאט"
- "assistant": reading script/teleprompter for the presenter to repeat
- "interviewer": asking questions that the presenter answers
- "background": random background chatter, not relevant

Return JSON: { "role": "director|assistant|interviewer|background", "reason": "why" }`
      );

      const jsonStr = roleResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(jsonStr);
      speaker.role = result.role || 'unknown';
    } catch {
      // Fallback: short speakers are background, longer ones are assistants
      speaker.role = speaker.totalSpeakingTime > 30 ? 'assistant' : 'background';
    }
  }

  // Step 5: Build presenter segments and non-presenter segments
  const presenterSegs = speakerSegments[presenter.speakerId] || [];
  const nonPresenterSegs: Array<{ start: number; end: number; speakerId: number; role: string }> = [];

  // For interview format, include interviewer segments too (they're on camera)
  const keepSpeakerIds = new Set<number>([presenter.speakerId]);
  for (const speaker of speakerAnalysis) {
    if (speaker.role === 'interviewer' && speaker.isOnCamera) {
      keepSpeakerIds.add(speaker.speakerId);
    }
  }

  for (const speaker of speakerAnalysis) {
    if (keepSpeakerIds.has(speaker.speakerId)) continue;
    for (const seg of (speakerSegments[speaker.speakerId] || [])) {
      nonPresenterSegs.push({
        start: seg.start,
        end: seg.end,
        speakerId: speaker.speakerId,
        role: speaker.role,
      });
    }
  }

  const confidence = onCameraSpeakers.length > 0 ? 0.9 : 0.6;

  console.log(`[Presenter] Detected: speaker ${presenter.speakerId} is the presenter (${presenter.description})`);
  console.log(`[Presenter] ${presenterSegs.length} presenter segments, ${nonPresenterSegs.length} non-presenter segments to exclude`);
  if (multiplePresenters) {
    console.log(`[Presenter] Interview format detected — keeping ${keepSpeakerIds.size} on-camera speakers`);
  }

  return {
    presenterId: presenter.speakerId,
    presenterDescription: presenter.description,
    allSpeakers: speakerAnalysis,
    presenterSegments: presenterSegs,
    nonPresenterSegments: nonPresenterSegs,
    confidence,
  };
}

/**
 * Filter a transcript to only include words from the presenter (and interviewers if on camera).
 * Used to feed clean presenter-only text to content analysis.
 */
export function filterTranscriptToPresenter(
  transcript: TranscriptResult,
  presenterId: number,
  keepSpeakerIds?: number[]
): TranscriptResult {
  const keepIds = new Set(keepSpeakerIds || [presenterId]);
  keepIds.add(presenterId);

  const filteredWords = transcript.words.filter(w => keepIds.has(w.speaker));
  return {
    words: filteredWords,
    fullText: filteredWords.map(w => w.word).join(' '),
  };
}

/**
 * Group transcript words into contiguous segments per speaker.
 */
function groupBySpeaker(
  transcript: TranscriptResult
): Record<number, Array<{ start: number; end: number; text: string }>> {
  const groups: Record<number, Array<{ start: number; end: number; text: string }>> = {};
  const words = transcript.words;

  if (words.length === 0) return groups;

  let currentSpeaker = words[0].speaker;
  let segmentStart = words[0].start;
  let segmentWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (word.speaker !== currentSpeaker) {
      // Save current segment
      if (!groups[currentSpeaker]) groups[currentSpeaker] = [];
      groups[currentSpeaker].push({
        start: segmentStart,
        end: words[i - 1]?.end || word.start,
        text: segmentWords.join(' '),
      });

      // Start new segment
      currentSpeaker = word.speaker;
      segmentStart = word.start;
      segmentWords = [];
    }

    segmentWords.push(word.word);
  }

  // Save last segment
  if (segmentWords.length > 0) {
    if (!groups[currentSpeaker]) groups[currentSpeaker] = [];
    groups[currentSpeaker].push({
      start: segmentStart,
      end: words[words.length - 1]?.end || 0,
      text: segmentWords.join(' '),
    });
  }

  return groups;
}
