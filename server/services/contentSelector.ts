import { askClaude } from './claude';
import { TranscriptResult } from '../types';
import type { PresenterQualityResult } from './presenterQuality.js';

export interface ScoredSegment {
  start: number;
  end: number;
  text: string;
  speakerId: number;
  scores: {
    delivery: number;        // Speaking quality: pace, confidence, clarity
    content: number;         // Information value: interesting, important?
    emotion: number;         // Emotional impact: passion, surprise, humor?
    conciseness: number;     // Efficiency: rambling vs tight?
    uniqueness: number;      // Said only once, or repeated?
    hookPotential: number;   // Could grab attention in 3 seconds?
    quotability: number;     // Memorable quote someone would share?
    visualInterest: number;  // Engaging body language/gestures?
    audioQuality: number;    // Clean audio? No noise/echo?
    continuity: number;      // Flows well from previous segment?
    relevance: number;       // On-topic for video's purpose?
    energy: number;          // Energy/enthusiasm level?
  };
  totalScore: number;
  decision: 'must-keep' | 'keep' | 'maybe' | 'cut' | 'filler';
  issues: string[];
  editNotes: {
    canBeShortened: boolean;
    trimStart: number;
    trimEnd: number;
    needsBRoll: boolean;
    brollReason?: string;
    needsZoom: boolean;
    zoomType?: 'in' | 'out';
    hasGesture: boolean;
    hasPause: boolean;
    canCombineWith?: number;
  };
}

export interface ContentSelectionResult {
  segments: ScoredSegment[];
  summary: {
    totalFootageDuration: number;
    keepDuration: number;
    cutDuration: number;
    cutPercentage: number;
    averageScore: number;
    lowestKeptScore: number;
    mustKeepCount: number;
    keepCount: number;
    maybeCount: number;
    cutCount: number;
    fillerCount: number;
  };
  topMoments: Array<{
    rank: number;
    segment: ScoredSegment;
    reason: string;
    suggestedUse: 'hook' | 'highlight' | 'social-clip' | 'quote-card' | 'closing';
  }>;
  reconstructions: Array<{
    finalText: string;
    fragments: Array<{ segmentIndex: number; start: number; end: number; text: string }>;
    reason: string;
  }>;
  suggestedOrder: Array<{ segmentIndex: number; reason: string }>;
  brollNeeded: Array<{ start: number; end: number; reason: string; suggestedPrompt: string }>;
}

export function breakIntoSegments(transcript: TranscriptResult): Array<{ start: number; end: number; text: string; speakerId: number }> {
  const segments: Array<{ start: number; end: number; text: string; speakerId: number }> = [];
  let currentWords: any[] = [];
  let segStart = 0;
  let currentSpeaker = 0;

  for (let i = 0; i < transcript.words.length; i++) {
    const word = transcript.words[i];
    const prevWord = i > 0 ? transcript.words[i - 1] : null;

    const timeSincePrev = prevWord ? word.start - prevWord.end : 0;
    const isSentenceEnd = prevWord && /[.!?]$/.test(currentWords.map(w => w.word).join(' ').trim());
    const isSpeakerChange = prevWord && word.speaker !== currentSpeaker;
    const isLongPause = timeSincePrev > 0.8;

    if ((isSentenceEnd || isSpeakerChange || isLongPause) && currentWords.length >= 3) {
      segments.push({
        start: segStart,
        end: prevWord!.end,
        text: currentWords.map(w => w.word).join(' ').trim(),
        speakerId: currentSpeaker,
      });
      currentWords = [];
      segStart = word.start;
      currentSpeaker = word.speaker;
    }

    if (currentWords.length === 0) {
      segStart = word.start;
      currentSpeaker = word.speaker;
    }
    currentWords.push(word);
  }

  if (currentWords.length > 0) {
    segments.push({
      start: segStart,
      end: currentWords[currentWords.length - 1].end,
      text: currentWords.map(w => w.word).join(' ').trim(),
      speakerId: currentSpeaker,
    });
  }

  return segments;
}

export async function scoreSegments(
  segments: Array<{ start: number; end: number; text: string; speakerId: number }>,
  targetDuration: number | undefined,
  videoCategory: string,
  videoPurpose: string
): Promise<ScoredSegment[]> {
  const batchSize = 12;
  const allScored: ScoredSegment[] = [];

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);

    const response = await askClaude(
      `You are the world's most critical video editor. Score each segment ruthlessly — only the BEST moments survive. Use the FULL range: 1-2 terrible, 3-4 weak, 5-6 average, 7-8 good, 9-10 excellent. Don't give everything 7.`,

      `Video: ${videoCategory} | Purpose: ${videoPurpose} | ${targetDuration ? `Target: ${targetDuration}s` : 'Suggest optimal duration'}

Score these segments:
${batch.map((seg, idx) => `[${i + idx}] ${seg.start.toFixed(1)}s-${seg.end.toFixed(1)}s: "${seg.text}"`).join('\n')}

For EACH segment return JSON array:
[{
  "idx": ${i},
  "scores": {
    "delivery": 7,     // Speaking quality. 1-3=mumbling/stuttering. 8-10=clear/confident/engaging.
    "content": 8,      // Info value. 1-3=obvious/generic. 8-10=unique insight/key fact.
    "emotion": 6,      // Feeling. 1-3=robotic. 8-10=passionate/funny/moving.
    "conciseness": 5,  // Efficiency. 1-3=rambling. 8-10=every word counts.
    "uniqueness": 9,   // Said only once? 1=repeated 4+ times. 7+=only time said.
    "hookPotential": 8,// Grab attention in 3s? 1-3=boring. 8-10=stop scrolling.
    "quotability": 7,  // Share-worthy? 1-3=generic. 8-10=memorable/tweetable.
    "visualInterest": 6,// Body language. 1-3=frozen. 8-10=animated/gestures.
    "audioQuality": 8, // Technical. 1-3=noisy/echo. 8-10=clean/professional.
    "continuity": 7,   // Flow from previous. 1-3=abrupt. 8-10=natural.
    "relevance": 9,    // On-topic? 1-3=tangent. 8-10=directly serves purpose.
    "energy": 6        // Enthusiasm. 1-3=tired/bored. 8-10=passionate/alive.
  },
  "issues": ["filler-word", "low-energy"],
  "editNotes": {
    "canBeShortened": true,
    "trimStart": 0.3,
    "trimEnd": 0.5,
    "needsBRoll": false,
    "needsZoom": true,
    "zoomType": "in",
    "hasGesture": false,
    "hasPause": false,
    "canCombineWith": null
  }
}]

Issues to flag: "filler-word", "repetition", "off-topic", "low-energy", "noise", "stumble", "incomplete", "reading", "too-fast", "too-slow", "dead-air"`
    );

    try {
      const scored = JSON.parse(response);
      for (const item of scored) {
        const segIdx = item.idx - i;
        const seg = batch[segIdx];
        if (!seg) continue;

        const weights = { delivery: 12, content: 15, emotion: 15, conciseness: 8, uniqueness: 10, hookPotential: 8, quotability: 5, visualInterest: 5, audioQuality: 7, continuity: 5, relevance: 7, energy: 3 };
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        const weightedScore = Object.entries(item.scores).reduce((sum, [key, val]) => {
          return sum + ((val as number) * (weights[key as keyof typeof weights] || 5));
        }, 0) / totalWeight * 10;

        const decision = weightedScore >= 75 ? 'must-keep' : weightedScore >= 60 ? 'keep' : weightedScore >= 45 ? 'maybe' : weightedScore >= 30 ? 'cut' : 'filler';

        allScored.push({
          start: seg.start, end: seg.end, text: seg.text, speakerId: seg.speakerId,
          scores: item.scores,
          totalScore: Math.round(weightedScore),
          decision,
          issues: item.issues || [],
          editNotes: item.editNotes || { canBeShortened: false, trimStart: 0, trimEnd: 0, needsBRoll: false, needsZoom: false, hasGesture: false, hasPause: false },
        });
      }
    } catch {
      for (const seg of batch) {
        allScored.push({
          start: seg.start, end: seg.end, text: seg.text, speakerId: seg.speakerId,
          scores: { delivery: 5, content: 5, emotion: 5, conciseness: 5, uniqueness: 5, hookPotential: 5, quotability: 5, visualInterest: 5, audioQuality: 5, continuity: 5, relevance: 5, energy: 5 },
          totalScore: 50, decision: 'maybe', issues: ['scoring-failed'],
          editNotes: { canBeShortened: false, trimStart: 0, trimEnd: 0, needsBRoll: false, needsZoom: false, hasGesture: false, hasPause: false },
        });
      }
    }
  }

  return allScored;
}

export async function detectRepetitions(
  segments: ScoredSegment[]
): Promise<ScoredSegment[]> {

  const response = await askClaude(
    'You detect repeated content in video transcripts — where the speaker says the same idea multiple times (multiple takes).',
    `Find groups of segments that express the SAME idea (even with different words):

${segments.map((s, i) => `[${i}] (score: ${s.totalScore}) "${s.text}"`).join('\n')}

For each group, identify the BEST version.
Return JSON:
{
  "repetitionGroups": [
    {
      "segments": [2, 5, 8],
      "bestIndex": 5,
      "reason": "segment 5 has best delivery and is most concise"
    }
  ]
}

Only flag TRUE repetitions — same idea, different words. Don't flag similar but distinct points.`
  );

  try {
    const result = JSON.parse(response);

    for (const group of result.repetitionGroups) {
      for (const idx of group.segments) {
        if (idx === group.bestIndex) continue;
        if (segments[idx]) {
          segments[idx].scores.uniqueness = Math.min(segments[idx].scores.uniqueness, 3);
          segments[idx].issues.push(`repetition — segment ${group.bestIndex} is better`);

          // Recalculate score
          const weights = { delivery: 12, content: 15, emotion: 15, conciseness: 8, uniqueness: 10, hookPotential: 8, quotability: 5, visualInterest: 5, audioQuality: 7, continuity: 5, relevance: 7, energy: 3 };
          const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
          const newScore = Object.entries(segments[idx].scores).reduce((sum, [key, val]) => sum + (val * (weights[key as keyof typeof weights] || 5)), 0) / totalWeight * 10;
          segments[idx].totalScore = Math.round(newScore);
          segments[idx].decision = newScore >= 75 ? 'must-keep' : newScore >= 60 ? 'keep' : newScore >= 45 ? 'maybe' : newScore >= 30 ? 'cut' : 'filler';
          segments[idx].editNotes.canCombineWith = group.bestIndex;
        }
      }
    }
  } catch {}

  return segments;
}

export async function findReconstructions(
  segments: ScoredSegment[]
): Promise<Array<{ finalText: string; fragments: Array<{ segmentIndex: number; start: number; end: number; text: string }>; reason: string }>> {

  // Find segments marked as combinable
  const combinableGroups = new Map<number, number[]>();
  for (let i = 0; i < segments.length; i++) {
    const combineWith = segments[i].editNotes.canCombineWith;
    if (combineWith !== undefined && combineWith !== null) {
      if (!combinableGroups.has(combineWith)) combinableGroups.set(combineWith, [combineWith]);
      const group = combinableGroups.get(combineWith)!;
      if (!group.includes(i)) group.push(i);
    }
  }

  if (combinableGroups.size === 0) return [];

  const response = await askClaude(
    'You reconstruct the perfect sentence from multiple takes of the same content.',
    `These groups contain multiple takes of the same content. Construct the BEST version by picking best FRAGMENTS from each take.

${Array.from(combinableGroups.entries()).map(([bestIdx, indices]) =>
  `GROUP (best: ${bestIdx}):\n${indices.map(i => `  [${i}] "${segments[i]?.text}" (delivery: ${segments[i]?.scores.delivery})`).join('\n')}`
).join('\n\n')}

For each group return:
{
  "finalText": "the reconstructed perfect sentence",
  "fragments": [
    { "segmentIndex": 2, "start": 10.5, "end": 12.3, "text": "best opening from take 2" },
    { "segmentIndex": 5, "start": 25.1, "end": 27.8, "text": "best middle from take 5" }
  ],
  "reason": "took confident opening from take 2 and concise explanation from take 5"
}

Rules:
- Must sound NATURAL when audio is spliced
- Pick fragments at natural word boundaries (not mid-word)
- Each fragment at least 1 second long
- Maximum 3 fragments per reconstruction
- Only reconstruct if result is SIGNIFICANTLY better than best single take`
  );

  try {
    const result = JSON.parse(response);
    return Array.isArray(result) ? result : [result];
  } catch {
    return [];
  }
}

export async function determineOptimalOrder(
  segments: ScoredSegment[],
  targetDuration: number | undefined,
  videoCategory: string
): Promise<Array<{ segmentIndex: number; reason: string }>> {

  // Get kept segments with original indices
  const keptSegments = segments
    .map((s, i) => ({ ...s, originalIndex: i }))
    .filter(s => s.decision === 'must-keep' || s.decision === 'keep');

  // If too much content for target duration, drop lowest-scored
  if (targetDuration) {
    const totalKept = keptSegments.reduce((sum, s) => sum + (s.end - s.start), 0);
    if (totalKept > targetDuration * 1.2) {
      keptSegments.sort((a, b) => b.totalScore - a.totalScore);
      let duration = 0;
      const fitting = [];
      for (const seg of keptSegments) {
        if (duration + (seg.end - seg.start) <= targetDuration * 1.1) {
          fitting.push(seg);
          duration += (seg.end - seg.start);
        }
      }
      keptSegments.length = 0;
      keptSegments.push(...fitting);
    }
  }

  const response = await askClaude(
    'You determine the optimal order for video segments to maximize engagement.',
    `Determine the BEST order for these ${videoCategory} video segments:

${keptSegments.map(s => `[${s.originalIndex}] (score: ${s.totalScore}, hook: ${s.scores.hookPotential}) "${s.text.slice(0, 80)}"`).join('\n')}

Rules:
1. HOOK FIRST: Highest hookPotential goes FIRST (even if chronologically from the middle)
2. After hook, return to chronological order
3. CTA/conclusion always LAST
4. Group related topics together
5. Build energy: strong start → build → peak → resolve with CTA

Return JSON array:
[{ "segmentIndex": 7, "reason": "strongest hook" }, { "segmentIndex": 0, "reason": "natural intro" }, ...]`
  );

  try {
    return JSON.parse(response);
  } catch {
    return keptSegments.map(s => ({ segmentIndex: s.originalIndex, reason: 'chronological' }));
  }
}

// The main entry point — runs all selection steps in order
export async function selectBestContent(
  transcript: TranscriptResult,
  targetDuration: number | undefined,
  videoCategory: string,
  videoPurpose: string
): Promise<ContentSelectionResult> {
  console.log('[Content Selection] Starting 12-dimension scoring...');

  // Step 1: Break into natural segments
  const rawSegments = breakIntoSegments(transcript);
  console.log(`[Content Selection] ${rawSegments.length} segments to evaluate`);

  // Step 2: Score ALL segments
  const scored = await scoreSegments(rawSegments, targetDuration, videoCategory, videoPurpose);

  // Step 3: Detect repetitions
  const withRepetitions = await detectRepetitions(scored);

  // Step 4: Find reconstruction opportunities
  const reconstructions = await findReconstructions(withRepetitions);

  // Step 5: Determine optimal ordering
  const ordering = await determineOptimalOrder(withRepetitions, targetDuration, videoCategory);

  // Step 6: Build final result
  return buildSelectionResult(withRepetitions, reconstructions, ordering, targetDuration);
}

function buildSelectionResult(
  segments: ScoredSegment[],
  reconstructions: any[],
  ordering: any[],
  targetDuration: number | undefined
): ContentSelectionResult {

  const kept = segments.filter(s => s.decision === 'must-keep' || s.decision === 'keep');
  const totalDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const keepDuration = kept.reduce((sum, s) => sum + (s.end - s.start), 0);

  // Top 5 moments ranked by score
  const topMoments = [...segments]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5)
    .map((seg, i) => ({
      rank: i + 1,
      segment: seg,
      reason: getTopMomentReason(seg),
      suggestedUse: (seg.scores.hookPotential >= 8 ? 'hook' : seg.scores.quotability >= 8 ? 'quote-card' : seg.scores.emotion >= 8 ? 'social-clip' : i === 0 ? 'hook' : 'highlight') as any,
    }));

  // B-Roll needed list
  const brollNeeded = segments
    .filter(s => s.editNotes.needsBRoll && (s.decision === 'must-keep' || s.decision === 'keep'))
    .map(s => ({
      start: s.start,
      end: s.end,
      reason: s.editNotes.brollReason || 'visual variety needed',
      suggestedPrompt: `Professional cinematic footage related to: ${s.text.slice(0, 80)}`,
    }));

  return {
    segments,
    summary: {
      totalFootageDuration: totalDuration,
      keepDuration,
      cutDuration: totalDuration - keepDuration,
      cutPercentage: Math.round((1 - keepDuration / totalDuration) * 100),
      averageScore: Math.round(kept.reduce((sum, s) => sum + s.totalScore, 0) / (kept.length || 1)),
      lowestKeptScore: kept.length > 0 ? Math.min(...kept.map(s => s.totalScore)) : 0,
      mustKeepCount: segments.filter(s => s.decision === 'must-keep').length,
      keepCount: segments.filter(s => s.decision === 'keep').length,
      maybeCount: segments.filter(s => s.decision === 'maybe').length,
      cutCount: segments.filter(s => s.decision === 'cut').length,
      fillerCount: segments.filter(s => s.decision === 'filler').length,
    },
    topMoments,
    reconstructions,
    suggestedOrder: ordering,
    brollNeeded,
  };
}

function getTopMomentReason(seg: ScoredSegment): string {
  const topScore = Object.entries(seg.scores).sort((a, b) => b[1] - a[1])[0];
  const reasons: Record<string, string> = {
    delivery: 'ביצוע מעולה — הדובר משדר ביטחון ובהירות',
    content: 'תוכן חשוב — מידע ייחודי וחשוב',
    emotion: 'רגש חזק — רגע שמרגש ומחבר',
    hookPotential: 'הוק פוטנציאלי — מושך תשומת לב מיידית',
    quotability: 'ציטוט חזק — משפט שאנשים ישתפו',
    energy: 'אנרגיה גבוהה — הדובר בשיא ההתלהבות',
  };
  return reasons[topScore[0]] || 'קטע איכותי';
}

// --- Presenter Quality Integration ---

export function verifyCompleteSentences(
  selectedSegments: Array<{ text: string; start: number; end: number }>,
  allWords: Array<{ word: string; start: number; end: number }>
): Array<{ index: number; issue: string; fix: string }> {
  const issues: Array<{ index: number; issue: string; fix: string }> = [];

  for (let i = 0; i < selectedSegments.length; i++) {
    const seg = selectedSegments[i];
    const text = seg.text.trim();

    // Check 1: Does segment end mid-word?
    const lastWord = allWords
      .filter(w => w.start >= seg.start && w.end <= seg.end + 0.1)
      .pop();

    if (lastWord) {
      const lastChar = text[text.length - 1];
      const endsCleanly = ['.', '!', '?', ',', ':', '…'].includes(lastChar) ||
                          text.endsWith(lastWord.word);

      if (!endsCleanly) {
        issues.push({
          index: i,
          issue: `segment ends mid-word: "...${text.slice(-20)}"`,
          fix: `extend segment end by 0.3s to include complete word`
        });
      }
    }

    // Check 2: Does segment start mid-sentence?
    const firstWord = text.split(' ')[0];
    const midSentenceStarters = ['ו', 'אבל', 'כי', 'אז', 'גם', 'או', 'and', 'but', 'so', 'because'];

    if (midSentenceStarters.includes(firstWord) && i > 0) {
      const prevSeg = selectedSegments[i - 1];
      const gap = seg.start - prevSeg.end;

      if (gap > 1.0) {
        issues.push({
          index: i,
          issue: `segment starts mid-sentence with "${firstWord}" but previous segment ended ${gap.toFixed(1)}s ago`,
          fix: `either include connecting content or trim the conjunction`
        });
      }
    }
  }

  return issues;
}

export function applyPresenterQuality(
  scoredSegments: ScoredSegment[],
  presenterQuality: PresenterQualityResult
): ScoredSegment[] {
  for (const seg of scoredSegments) {
    const segIndex = scoredSegments.indexOf(seg);
    const presenterScore = presenterQuality.segmentScores.find(
      ps => ps.segmentIndex === segIndex
    );

    if (!presenterScore) continue;

    // Modify total score based on presenter quality
    const presenterBonus = (presenterScore.overallPresenterScore - 5) * 2;
    seg.totalScore = Math.max(0, Math.min(100, seg.totalScore + presenterBonus));

    // Update decision based on presenter recommendation
    if (presenterScore.recommendation === 'avoid' && seg.decision !== 'must-keep') {
      seg.decision = 'cut';
      const note = ' | Presenter: avoid (poor eye contact/delivery)';
      seg.editNotes.brollReason = (seg.editNotes.brollReason || '') + note;
    }

    if (presenterScore.recommendation === 'use-with-broll-cover') {
      const note = ' | Presenter: cover with B-Roll (keep audio, hide face)';
      seg.editNotes.brollReason = (seg.editNotes.brollReason || '') + note;
      seg.editNotes.needsBRoll = true;
      (seg as any).needsBRollCover = true;
    }

    if (presenterScore.eyeContact >= 8 && presenterScore.recommendation === 'use') {
      seg.editNotes.needsZoom = true;
      seg.editNotes.zoomType = 'in';
      (seg as any).recommendZoomIn = true;
    }

    // Mid-word cut protection
    if (presenterScore.midWordCut) {
      (seg as any).extendEnd = 0.3;
    }
  }

  return scoredSegments;
}
