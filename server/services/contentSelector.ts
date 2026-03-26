import { askClaude } from './claude';
import { TranscriptResult } from '../types';

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
