import fs from 'fs';
import { askClaudeVision, askClaude } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import type { TranscriptResult, VerifiedSpeakerMap, VerifiedSpeaker, SpeakerCorrection } from '../types.js';

// ── Internal Types ──

interface AudioConsistencyResult {
  suspectedMerges: Array<{
    speakerId: number;
    confidence: number;
    evidence: string;
    splitPoints: Array<{ afterSegmentIndex: number; reason: string }>;
  }>;
  suspectedSplits: Array<{
    speakerIds: number[];
    confidence: number;
    evidence: string;
  }>;
}

interface VisualSpeakerData {
  speakerId: number;
  framesAnalyzed: number;
  onCameraFrames: number;
  offCameraFrames: number;
  isConsistentlyOnCamera: boolean;
  inconsistentFrames: number;
  descriptions: string[];
  frameAnalyses: FrameAnalysis[];
}

interface VisualVerificationResult {
  speakerVisuals: Record<number, VisualSpeakerData>;
}

interface FrameAnalysis {
  timestamp: number;
  peopleCount: number;
  speakingPerson: {
    detected: boolean;
    position: string;
    description: string;
    lipsOpen: boolean;
    facingCamera: boolean;
  } | null;
  otherPeople: Array<{ position: string; description: string; likelySpeaking: boolean }>;
  matchesAudioSpeaker: boolean;
  confidence: number;
}

interface CrossValidationResult {
  verifiedSpeakers: VerifiedSpeaker[];
  corrections: SpeakerCorrection[];
  confidence: number;
}

// ── Main Export ──

export async function verifySpeakers(
  videoPath: string,
  transcript: TranscriptResult
): Promise<VerifiedSpeakerMap> {
  console.log('[Speaker Verify] Starting 3-layer speaker verification...');

  const speakerSegments = groupBySpeaker(transcript);
  const speakerIds = Object.keys(speakerSegments).map(Number);

  console.log(`[Speaker Verify] Deepgram found ${speakerIds.length} speakers`);

  // === LAYER 1: AUDIO CONSISTENCY CHECK ===
  const audioCheck = await checkAudioConsistency(transcript, speakerSegments);

  // === LAYER 2: VISUAL VERIFICATION ===
  const visualCheck = await visualSpeakerVerification(videoPath, speakerSegments);

  // === LAYER 3: CROSS-VALIDATION ===
  const crossValidation = await crossValidateSpeakers(audioCheck, visualCheck, transcript, speakerSegments);

  // Apply corrections to the transcript so downstream code uses corrected IDs
  applySpeakerCorrections(transcript, crossValidation.corrections);

  return {
    speakers: crossValidation.verifiedSpeakers,
    corrections: crossValidation.corrections,
    confidence: crossValidation.confidence,
    verificationMethod: '3-layer: audio-consistency + visual-detection + cross-validation',
  };
}

// ── LAYER 1: AUDIO CONSISTENCY ──
// Detects when Deepgram merged two speakers into one ID or split one into two.

async function checkAudioConsistency(
  transcript: TranscriptResult,
  speakerSegments: Record<number, Array<{ start: number; end: number; text: string }>>
): Promise<AudioConsistencyResult> {
  const results: AudioConsistencyResult = { suspectedMerges: [], suspectedSplits: [] };

  // Check 1: Does a single speaker ID contain two different people?
  for (const [speakerId, segments] of Object.entries(speakerSegments)) {
    if (segments.length < 3) continue;

    try {
      const contentAnalysis = await askClaude(
        'You detect if multiple people were incorrectly merged into one speaker ID. Return ONLY valid JSON, no markdown.',
        `These segments are all labeled as "Speaker ${speakerId}" by the speech recognition system.
Sometimes the system makes mistakes and merges two different people into one ID.

Analyze these segments and tell me: is this ONE person or could it be TWO different people?

Segments:
${segments.slice(0, 10).map((s, i) => `[${i}] [${s.start.toFixed(1)}s-${s.end.toFixed(1)}s]: "${s.text}"`).join('\n')}

Signs that it's TWO people merged:
- Dramatic change in speaking style (formal vs casual)
- Some segments are giving instructions ("תתחיל", "עוד פעם") and others are presenting
- Content topics that don't connect (one talks about the product, other gives directions)
- Very different sentence lengths or speaking patterns

Return JSON:
{
  "isOnePerson": true,
  "confidence": 0.85,
  "evidence": "explanation in Hebrew",
  "suspectedSplitPoints": []
}`
      );

      const jsonStr = contentAnalysis.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(jsonStr);
      if (!result.isOnePerson) {
        results.suspectedMerges.push({
          speakerId: Number(speakerId),
          confidence: result.confidence ?? 0.7,
          evidence: result.evidence || '',
          splitPoints: result.suspectedSplitPoints || [],
        });
      }
    } catch (error: any) {
      console.error(`[Speaker Verify] Audio merge check failed for speaker ${speakerId}:`, error.message);
    }
  }

  // Check 2: Are two speaker IDs actually the same person?
  const speakerIdList = Object.keys(speakerSegments).map(Number);

  if (speakerIdList.length >= 2) {
    for (let i = 0; i < speakerIdList.length; i++) {
      for (let j = i + 1; j < speakerIdList.length; j++) {
        const id1 = speakerIdList[i];
        const id2 = speakerIdList[j];
        const segs1 = speakerSegments[id1];
        const segs2 = speakerSegments[id2];

        // Check if they alternate frequently (sign of incorrect split)
        const allSegs = [
          ...segs1.map(s => ({ ...s, speaker: id1 })),
          ...segs2.map(s => ({ ...s, speaker: id2 })),
        ].sort((a, b) => a.start - b.start);

        let switches = 0;
        for (let k = 1; k < allSegs.length; k++) {
          if (allSegs[k].speaker !== allSegs[k - 1].speaker) switches++;
        }

        const totalDuration = Math.max(...allSegs.map(s => s.end)) - Math.min(...allSegs.map(s => s.start));
        if (totalDuration <= 0) continue;
        const switchRate = switches / (totalDuration / 10);

        if (switchRate > 1.5) {
          try {
            const mergeCheck = await askClaude(
              'You check if two speaker IDs are actually the same person. Return ONLY valid JSON, no markdown.',
              `Speaker ${id1} says: "${segs1.slice(0, 3).map(s => s.text).join(' | ')}"
Speaker ${id2} says: "${segs2.slice(0, 3).map(s => s.text).join(' | ')}"

They switch ${switches} times in ${totalDuration.toFixed(0)} seconds.

Is this likely the SAME person incorrectly split into two IDs?
Return JSON: { "samePerson": true, "confidence": 0.8, "evidence": "Hebrew explanation" }`
            );

            const jsonStr = mergeCheck.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            const result = JSON.parse(jsonStr);
            if (result.samePerson) {
              results.suspectedSplits.push({
                speakerIds: [id1, id2],
                confidence: result.confidence ?? 0.7,
                evidence: result.evidence || '',
              });
            }
          } catch (error: any) {
            console.error(`[Speaker Verify] Audio split check failed for speakers ${id1}+${id2}:`, error.message);
          }
        }
      }
    }
  }

  console.log(
    `[Speaker Verify] Layer 1 done — ${results.suspectedMerges.length} suspected merges, ${results.suspectedSplits.length} suspected splits`
  );

  return results;
}

// ── LAYER 2: VISUAL VERIFICATION ──
// Extract frames during each speaker's turn and verify who's on camera.

async function visualSpeakerVerification(
  videoPath: string,
  speakerSegments: Record<number, Array<{ start: number; end: number; text: string }>>
): Promise<VisualVerificationResult> {
  const speakerVisuals: Record<number, VisualSpeakerData> = {};
  const tempDir = `temp/verify_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  for (const [speakerId, segments] of Object.entries(speakerSegments)) {
    const id = Number(speakerId);

    // Sample up to 5 segments longer than 0.8s
    const samplesToCheck = segments.filter(s => (s.end - s.start) > 0.8).slice(0, 5);
    if (samplesToCheck.length === 0) continue;

    const frameAnalyses: FrameAnalysis[] = [];

    for (let i = 0; i < samplesToCheck.length; i++) {
      const seg = samplesToCheck[i];
      const midpoint = (seg.start + seg.end) / 2;
      const framePath = `${tempDir}/s${id}_f${i}.jpg`;

      try {
        await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${midpoint} -vframes 1 -q:v 2 -y "${framePath}"`);
        if (!fs.existsSync(framePath)) continue;

        const imageBase64 = fs.readFileSync(framePath).toString('base64');

        const response = await askClaudeVision(
          'You verify who is speaking in a video frame by analyzing lip movement and face position. Return ONLY valid JSON, no markdown.',
          [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
            },
            {
              type: 'text',
              text: `At timestamp ${midpoint.toFixed(1)}s, the audio transcript says Speaker ${id} is talking and saying: "${seg.text.slice(0, 80)}"

Analyze this frame:
1. How many people are visible?
2. Is there someone who appears to be SPEAKING (lips parted/moving, facing camera)?
3. Is there someone who appears to be LISTENING (lips closed, looking to the side)?
4. Describe each visible person briefly.

Return JSON:
{
  "peopleCount": 1,
  "speakingPerson": {
    "detected": true,
    "position": "center",
    "description": "short description in Hebrew",
    "lipsOpen": true,
    "facingCamera": true
  },
  "otherPeople": [],
  "matchesAudioSpeaker": true,
  "confidence": 0.9,
  "notes": ""
}`,
            },
          ]
        );

        const jsonStr = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const analysis = JSON.parse(jsonStr);
        frameAnalyses.push({ timestamp: midpoint, ...analysis });
      } catch (error: any) {
        console.error(`[Speaker Verify] Frame analysis failed at ${midpoint.toFixed(1)}s:`, error.message);
      }

      try { fs.unlinkSync(framePath); } catch {}
    }

    const onCameraCount = frameAnalyses.filter(
      f => f.speakingPerson?.detected && f.matchesAudioSpeaker
    ).length;
    const totalFrames = frameAnalyses.length;
    const inconsistentFrames = frameAnalyses.filter(
      f => f.speakingPerson?.detected && !f.matchesAudioSpeaker
    ).length;

    speakerVisuals[id] = {
      speakerId: id,
      framesAnalyzed: totalFrames,
      onCameraFrames: onCameraCount,
      offCameraFrames: totalFrames - onCameraCount,
      isConsistentlyOnCamera: totalFrames > 0 && onCameraCount >= totalFrames * 0.6,
      inconsistentFrames,
      descriptions: frameAnalyses
        .filter(f => f.speakingPerson?.description)
        .map(f => f.speakingPerson!.description),
      frameAnalyses,
    };
  }

  // Cleanup temp dir
  try { fs.rmdirSync(tempDir); } catch {}

  console.log(`[Speaker Verify] Layer 2 done — analyzed ${Object.keys(speakerVisuals).length} speakers visually`);

  return { speakerVisuals };
}

// ── LAYER 3: CROSS-VALIDATION ──
// Compare audio and visual results, find and fix mismatches.

async function crossValidateSpeakers(
  audioCheck: AudioConsistencyResult,
  visualCheck: VisualVerificationResult,
  transcript: TranscriptResult,
  speakerSegments: Record<number, Array<{ start: number; end: number; text: string }>>
): Promise<CrossValidationResult> {
  const corrections: SpeakerCorrection[] = [];

  // Handle suspected merges (one ID = two people)
  for (const merge of audioCheck.suspectedMerges) {
    const visual = visualCheck.speakerVisuals[merge.speakerId];

    if (visual && visual.inconsistentFrames > 0) {
      // CONFIRMED: two people merged into one ID
      corrections.push({
        type: 'split',
        description: `דובר ${merge.speakerId} פוצל ל-2 דוברים — הזיהוי האוטומטי טעה`,
        originalSpeakerIds: [merge.speakerId],
        correctedSpeakerId: -1,
        evidence: `${merge.evidence}. אימות ויזואלי: נראו פנים שונות ב-${visual.inconsistentFrames} פריימים`,
      });
    }
  }

  // Handle suspected splits (two IDs = one person)
  for (const split of audioCheck.suspectedSplits) {
    const visual1 = visualCheck.speakerVisuals[split.speakerIds[0]];
    const visual2 = visualCheck.speakerVisuals[split.speakerIds[1]];

    if (visual1 && visual2) {
      // Compare descriptions
      try {
        const descMatch = await askClaude(
          'You compare person descriptions to determine if they are the same person. Return ONLY valid JSON, no markdown.',
          `Person A (speaker ${split.speakerIds[0]}): "${visual1.descriptions.join(', ')}"
Person B (speaker ${split.speakerIds[1]}): "${visual2.descriptions.join(', ')}"

Are these descriptions of the SAME person?
Return JSON: { "samePerson": true, "confidence": 0.8 }`
        );

        const jsonStr = descMatch.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const result = JSON.parse(jsonStr);
        if (result.samePerson) {
          corrections.push({
            type: 'merge',
            description: `דוברים ${split.speakerIds.join(' ו-')} אוחדו — זה אותו אדם`,
            originalSpeakerIds: split.speakerIds,
            correctedSpeakerId: split.speakerIds[0],
            evidence: `${split.evidence}. אימות ויזואלי: אותו אדם בשני ה-IDs (ביטחון ${Math.round((result.confidence ?? 0.7) * 100)}%)`,
          });
        }
      } catch (error: any) {
        console.error('[Speaker Verify] Description comparison failed:', error.message);
      }
    }
  }

  // Build final verified speaker list
  const verifiedSpeakers: VerifiedSpeaker[] = [];

  for (const [idStr, segments] of Object.entries(speakerSegments)) {
    const speakerId = Number(idStr);
    const visual = visualCheck.speakerVisuals[speakerId];

    // Skip if this speaker was merged into another
    const wasMerged = corrections.find(
      c => c.type === 'merge' && c.originalSpeakerIds.includes(speakerId) && c.correctedSpeakerId !== speakerId
    );
    if (wasMerged) continue;

    // Collect any IDs that were merged into this one
    const mergedIds = corrections
      .filter(c => c.type === 'merge' && c.correctedSpeakerId === speakerId)
      .flatMap(c => c.originalSpeakerIds.filter(id => id !== speakerId));

    // Combine segments from merged speakers
    const allSegments = [...segments];
    for (const mergedId of mergedIds) {
      if (speakerSegments[mergedId]) {
        allSegments.push(...speakerSegments[mergedId]);
      }
    }
    allSegments.sort((a, b) => a.start - b.start);

    verifiedSpeakers.push({
      id: speakerId,
      originalIds: [speakerId, ...mergedIds],
      role: visual?.isConsistentlyOnCamera ? 'presenter' : 'unknown',
      isOnCamera: visual?.isConsistentlyOnCamera || false,
      description: visual?.descriptions[0] || `דובר ${speakerId}`,
      voiceCharacteristics: '',
      segments: allSegments,
      totalTime: allSegments.reduce((sum, s) => sum + (s.end - s.start), 0),
    });
  }

  // Sort by total time descending
  verifiedSpeakers.sort((a, b) => b.totalTime - a.totalTime);

  // Calculate overall confidence
  const totalCorrections = corrections.length;
  const confidence = totalCorrections === 0 ? 0.95 : Math.max(0.6, 0.95 - totalCorrections * 0.1);

  console.log(`[Speaker Verify] Layer 3 done — ${corrections.length} corrections. Confidence: ${Math.round(confidence * 100)}%`);

  return { verifiedSpeakers, corrections, confidence };
}

// ── Helpers ──

function applySpeakerCorrections(
  transcript: TranscriptResult,
  corrections: SpeakerCorrection[]
): void {
  for (const correction of corrections) {
    if (correction.type === 'merge') {
      for (const word of transcript.words) {
        if (correction.originalSpeakerIds.includes(word.speaker) && word.speaker !== correction.correctedSpeakerId) {
          word.speaker = correction.correctedSpeakerId;
        }
      }
    }
    // Split corrections are informational — visual analysis already identified the change
  }
}

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
      if (!groups[currentSpeaker]) groups[currentSpeaker] = [];
      groups[currentSpeaker].push({
        start: segmentStart,
        end: words[i - 1]?.end || word.start,
        text: segmentWords.join(' '),
      });

      currentSpeaker = word.speaker;
      segmentStart = word.start;
      segmentWords = [];
    }

    segmentWords.push(word.word);
  }

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
