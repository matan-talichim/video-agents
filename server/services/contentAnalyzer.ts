import fs from 'fs';
import { askClaude, askClaudeVision } from './claude.js';
import { runFFmpeg, extractFrame, getVideoDuration } from './ffmpeg.js';
import { MASTER_EDITING_PROMPT } from './editingRules.js';
import type { EditingBlueprint } from './editingRules.js';
import { getMasterPromptContext } from './masterPromptOptimizer.js';
import { getBrainContext } from './editorBrain.js';
import type { TranscriptResult } from '../types.js';

export interface ContentAnalysis {
  // Who is speaking
  presenter: {
    name?: string;
    speakingSegments: Array<{ start: number; end: number }>;
    silentSegments: Array<{ start: number; end: number }>;
    totalSpeakingTime: number;
    totalSilentTime: number;
  };

  // Content quality rating per segment
  segments: Array<{
    start: number;
    end: number;
    type: 'speaking' | 'silence' | 'filler' | 'repetition' | 'off-topic' | 'key-moment';
    quality: number;
    keepRecommendation: 'must-keep' | 'keep' | 'optional' | 'cut';
    reason: string;
  }>;

  // Best moments (for hooks, highlights, social clips)
  bestMoments: Array<{
    start: number;
    end: number;
    type: 'hook' | 'quote' | 'emotional' | 'funny' | 'key-point' | 'cta';
    score: number;
    text: string;
    suggestedUse: string;
  }>;

  // Content structure
  structure: {
    introduction: { start: number; end: number } | null;
    mainPoints: Array<{ start: number; end: number; topic: string }>;
    conclusion: { start: number; end: number } | null;
    offTopicSegments: Array<{ start: number; end: number; reason: string }>;
  };

  // Recommended edit
  recommendedEdit: {
    totalDuration: number;
    segments: Array<{ start: number; end: number; reason: string }>;
    hookSegment: { start: number; end: number } | null;
    suggestedOrder: 'chronological' | 'hook-first' | 'best-moments';
  };

  // Visual analysis
  visual: {
    presenterPosition: 'center' | 'left' | 'right';
    hasGoodLighting: boolean;
    backgroundType: 'office' | 'outdoor' | 'studio' | 'home' | 'other';
    cameraAngle: 'front' | 'side' | 'multiple';
  };

  // Sentence reconstruction
  reconstructedSentences: Array<{
    finalText: string;
    fragments: Array<{ start: number; end: number; sourceText: string }>;
    reason: string;
  }>;

  // B-Roll cover strategy
  brollCoverMoments: Array<{
    start: number;
    end: number;
    reason: string;
    suggestedPrompt: string;
    triggerWord?: string;
    triggerWordTimestamp?: number;
  }>;

  // Emotional arc plan
  emotionalArc: Array<{
    section: 'hook' | 'build' | 'peak' | 'resolution';
    start: number;
    end: number;
    musicMood: string;
    energy: number;
  }>;

  // Pacing plan
  pacingPlan: Array<{
    start: number;
    end: number;
    cutFrequency: 'fast' | 'medium' | 'slow';
    addZoom: boolean;
    addBRoll: boolean;
  }>;

  // Cut transitions
  cutTransitions: Array<{
    at: number;
    type: 'hard' | 'lcutBroll' | 'crossfade' | 'smashCut' | 'cutaway' | 'montage' | 'broll-bridge' | 'zoom' | 'flash';
    murchScore?: number;
    audioOverlapAfter?: number;
    fakeZoom?: boolean;
    duration?: number;
    reason?: string;
  }>;

  // Footage issues and solutions
  footageIssues: Array<{
    issue: string;
    solution: string;
  }>;

  // Top 3 hook options
  hookOptions: Array<{
    start: number;
    end: number;
    text: string;
    viralScore: number;
    reason: string;
  }>;

  // Music sync plan
  musicSync?: {
    ducking: Array<{
      start: number;
      end: number;
      volume: number;
      reason: string;
    }>;
    beatAlignedCuts: number[];
  };

  // Sound design plan
  soundDesign?: {
    roomToneSource?: { start: number; end: number };
    voiceProcessing?: {
      highPass: number;
      compression: boolean;
      normalize: number;
    };
    sfx: Array<{
      type: 'whoosh' | 'ding' | 'rise' | 'impact' | 'click';
      at: number;
      duration?: number;
      volume: number;
      reason: string;
    }>;
  };

  // Smart zoom plan
  zooms?: Array<{
    timestamp: number;
    zoomFrom: number;
    zoomTo: number;
    duration: number;
    easing: string;
    reason: string;
  }>;

  // Color grading plan
  colorPlan?: Array<{
    segment: { start: number; end: number };
    temperature: 'warm' | 'neutral' | 'cool';
    saturation: 'low' | 'normal' | 'high';
    contrast: 'low' | 'medium' | 'high';
    lut: 'cinematic' | 'bright' | 'moody' | 'vintage' | 'none';
    skinToneProtection: boolean;
    matchPrevious: boolean;
  }>;

  // Platform optimization
  platformOptimization?: {
    platform: string;
    hookStrategy: { type: string; text: string; duration: number };
    safeZone: { top: number; bottom: number; right: number };
    idealCutFrequency: number;
    captionPosition: string;
    loopable: boolean;
    endStrategy: string;
  };

  // Complete editing blueprint
  editingBlueprint?: EditingBlueprint;

  // Detailed emotional arc (rollercoaster phases)
  detailedEmotionalArc: Array<{
    start: number;
    end: number;
    energy: number;         // 1-10
    phase: string;
    editStyle: string;
  }>;

  // Protected silences (strategic pauses to keep)
  protectedSilences: Array<{
    at: number;
    duration: number;
    type: 'impact' | 'anticipation' | 'rhetorical' | 'emotional' | 'comedic';
    reason: string;
  }>;
}

export async function analyzeContent(
  videoPath: string,
  transcript: TranscriptResult,
  targetDuration?: number
): Promise<ContentAnalysis> {
  // Step 1: Extract key frames for visual analysis
  const duration = await getVideoDuration(videoPath);
  const frameCount = Math.min(10, Math.ceil(duration / 10));
  const frames: string[] = [];
  const tempDir = `temp/content_analysis_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  for (let i = 0; i < frameCount; i++) {
    const timestamp = (duration / (frameCount + 1)) * (i + 1);
    const framePath = `${tempDir}/frame_${i}.jpg`;
    try {
      await extractFrame(videoPath, timestamp, framePath);
      if (fs.existsSync(framePath)) {
        frames.push(framePath);
      }
    } catch {
      // Skip failed frame extractions
    }
  }

  // Step 2: Visual analysis with Claude Vision
  let visual: ContentAnalysis['visual'] = {
    presenterPosition: 'center',
    hasGoodLighting: true,
    backgroundType: 'other',
    cameraAngle: 'front',
  };

  if (frames.length > 0) {
    try {
      const frameImages = frames.slice(0, 5).map(f => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: fs.readFileSync(f).toString('base64'),
        },
      }));

      const visualResponse = await askClaudeVision(
        'You analyze video frames to understand the visual setup. Return ONLY valid JSON, no markdown.',
        [
          ...frameImages,
          {
            type: 'text',
            text: `Analyze these video frames. Return JSON:
{
  "presenterPosition": "center|left|right",
  "hasGoodLighting": true/false,
  "backgroundType": "office|outdoor|studio|home|other",
  "cameraAngle": "front|side|multiple",
  "presenterDescription": "short description"
}`,
          },
        ]
      );

      const jsonStr = visualResponse
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(jsonStr);
      visual = {
        presenterPosition: parsed.presenterPosition || 'center',
        hasGoodLighting: parsed.hasGoodLighting ?? true,
        backgroundType: parsed.backgroundType || 'other',
        cameraAngle: parsed.cameraAngle || 'front',
      };
    } catch (error: any) {
      console.error('[ContentAnalyzer] Visual analysis failed:', error.message);
    }
  }

  // Step 3: Deep content analysis with Claude
  try {
    const contentResponse = await askClaude(
      `You are a professional video editor analyzing a transcript to create the best possible edit.
Your job is to:
1. Identify who is the main presenter and when they speak
2. Find the BEST moments worth keeping
3. Find segments to CUT (off-topic, repetitive, low-energy, filler)
4. Suggest the optimal edit structure
5. Identify a strong hook (opening moment)
6. Plan B-Roll cover moments for visual variety
7. Design an emotional arc for music/energy
8. Detect footage issues and suggest solutions
9. Provide 3 hook options ranked by viral potential

Be ruthless — a great 45-second video is better than a mediocre 90-second one.
Cut aggressively: remove all dead air, tangents, repetitions, weak points.
Keep only the gold — the moments that make viewers stop scrolling.
Return ONLY valid JSON, no markdown code blocks.`,

      `Here is the full transcript of a ${Math.round(duration)}-second video:

${transcript.words.map(w => `[${w.start.toFixed(1)}s] ${w.word}`).join(' ')}

Full text: "${transcript.fullText}"

${targetDuration ? `Target duration: ${targetDuration} seconds (must cut to fit)` : 'No specific target duration — suggest the optimal length.'}

Analyze this content and return JSON with ALL of the following fields:

{
  "presenter": {
    "speakingSegments": [{"start": 0, "end": 5.2}],
    "silentSegments": [{"start": 5.2, "end": 7.0}],
    "totalSpeakingTime": 85,
    "totalSilentTime": 15
  },
  "segments": [
    {
      "start": 0, "end": 3.5,
      "type": "speaking",
      "quality": 8,
      "keepRecommendation": "must-keep",
      "reason": "Strong opening statement"
    }
  ],
  "bestMoments": [
    {
      "start": 15.5, "end": 19.2,
      "type": "hook",
      "score": 9,
      "text": "the powerful quote here",
      "suggestedUse": "Use as opening hook"
    }
  ],
  "structure": {
    "introduction": {"start": 0, "end": 12},
    "mainPoints": [
      {"start": 12, "end": 35, "topic": "main topic 1"}
    ],
    "conclusion": {"start": 58, "end": 70},
    "offTopicSegments": [
      {"start": 42, "end": 47, "reason": "tangent about unrelated topic"}
    ]
  },
  "recommendedEdit": {
    "totalDuration": 45,
    "segments": [
      {"start": 15.5, "end": 19.2, "reason": "hook - moved to opening"},
      {"start": 0, "end": 12, "reason": "introduction"}
    ],
    "hookSegment": {"start": 15.5, "end": 19.2},
    "suggestedOrder": "hook-first"
  },
  "reconstructedSentences": [
    {
      "finalText": "the reconstructed sentence",
      "fragments": [{"start": 5.0, "end": 6.5, "sourceText": "fragment from take 1"}],
      "reason": "Combined best parts of two takes"
    }
  ],
  "brollCoverMoments": [
    {
      "start": 10.0, "end": 13.0,
      "reason": "Speaker looking away from camera",
      "suggestedPrompt": "Professional office environment, modern workspace"
    }
  ],
  "emotionalArc": [
    {
      "section": "hook",
      "start": 0, "end": 5,
      "musicMood": "intense",
      "energy": 9
    }
  ],
  "pacingPlan": [
    {
      "start": 0, "end": 15,
      "cutFrequency": "fast",
      "addZoom": true,
      "addBRoll": false
    }
  ],
  "cutTransitions": [
    {
      "at": 12.0,
      "type": "lcutBroll",
      "murchScore": 8,
      "audioOverlapAfter": 1.0,
      "reason": "speaker mentions visual — L-cut to B-Roll"
    },
    {
      "at": 25.0,
      "type": "hard",
      "murchScore": 7,
      "fakeZoom": true,
      "reason": "sentence break — fake zoom to simulate camera change"
    },
    {
      "at": 45.0,
      "type": "crossfade",
      "murchScore": 9,
      "duration": 0.8,
      "reason": "topic change — dissolve to mark new section"
    }
  ],
  "footageIssues": [
    {
      "issue": "Poor lighting in first 10 seconds",
      "solution": "lighting-enhancement"
    }
  ],
  "hookOptions": [
    {
      "start": 15.5, "end": 19.2,
      "text": "the hook text",
      "viralScore": 9,
      "reason": "Strong emotional statement that creates curiosity"
    }
  ],
  "musicSync": {
    "ducking": [
      { "start": 0, "end": 3, "volume": -6, "reason": "intro — music prominent" },
      { "start": 3, "end": 45, "volume": -20, "reason": "speaking — music low" },
      { "start": 45, "end": 50, "volume": -6, "reason": "outro — music prominent" }
    ],
    "beatAlignedCuts": [3.2, 6.4, 9.6, 12.8]
  },
  "soundDesign": {
    "roomToneSource": { "start": 5.2, "end": 7.5 },
    "voiceProcessing": { "highPass": 80, "compression": true, "normalize": -14 },
    "sfx": [
      { "type": "whoosh", "at": 15.5, "volume": -15, "reason": "cut to B-Roll" },
      { "type": "rise", "at": 28.0, "duration": 2.0, "volume": -12, "reason": "building to key point" },
      { "type": "impact", "at": 30.0, "volume": -10, "reason": "main benefit reveal" }
    ]
  },
  "zooms": [
    { "timestamp": 15.5, "zoomFrom": 1.0, "zoomTo": 1.15, "duration": 1.5, "easing": "ease-in-out", "reason": "key statistic — emphasize" },
    { "timestamp": 30.0, "zoomFrom": 1.15, "zoomTo": 1.0, "duration": 1.5, "easing": "ease-in-out", "reason": "new topic — zoom out for breathing room" }
  ],
  "colorPlan": [
    {
      "segment": { "start": 0, "end": 15 },
      "temperature": "cool",
      "saturation": "normal",
      "contrast": "medium",
      "lut": "cinematic",
      "skinToneProtection": true,
      "matchPrevious": false
    },
    {
      "segment": { "start": 15, "end": 45 },
      "temperature": "warm",
      "saturation": "high",
      "contrast": "medium",
      "lut": "bright",
      "skinToneProtection": true,
      "matchPrevious": true
    }
  ],
  "platformOptimization": {
    "platform": "instagram-reels",
    "hookStrategy": { "type": "text-hook", "text": "hook text here", "duration": 1.5 },
    "safeZone": { "top": 15, "bottom": 15, "right": 15 },
    "idealCutFrequency": 3,
    "captionPosition": "center-vertical",
    "loopable": true,
    "endStrategy": "cta"
  },
  "detailedEmotionalArc": [
    { "start": 0, "end": 1, "energy": 6, "phase": "start", "editStyle": "establishing — medium shot, gentle music fade-in" },
    { "start": 1, "end": 3, "energy": 9, "phase": "hook", "editStyle": "fast cuts, bold text overlay, SFX impact" }
  ],
  "protectedSilences": [
    { "at": 25.3, "duration": 0.8, "type": "impact", "reason": "dramatic pause after key statement" },
    { "at": 40.1, "duration": 0.5, "type": "anticipation", "reason": "pause before price reveal" }
  ]
}

IMPORTANT:
- Rate every segment honestly. Quality 1-3 = cut it. 4-6 = optional. 7-10 = keep.
- The "recommendedEdit" should produce a TIGHT, engaging video. No fluff.
- If you find a great hook moment, put it FIRST in the recommendedEdit.
- "hook-first" means: start with the best moment, then go chronological. This is how viral videos work.
- Identify at least 3-5 "bestMoments" for potential social media clips.
- For footageIssues solutions, use keywords: background-blur, fast-pacing, energetic-music, frequent-broll, noise-reduction, speech-enhancement, lighting-enhancement, color-correction.
- Provide exactly 3 hookOptions ranked by viralScore (highest first).
- brollCoverMoments should cover weak visual moments (speaker looking away, bad framing, jump cuts).
- For brollCoverMoments, use word-level precision: find the exact trigger word timestamp from the transcript and start B-Roll 0.3s before that word.
- Include triggerWord and triggerWordTimestamp in brollCoverMoments when a specific word triggers the B-Roll need.
- For each B-Roll suggestedPrompt, write it like a cinematic director: include camera movement (dolly/drone/tracking), shot type (wide/close-up), lighting (golden hour/studio), depth of field, and style. Always add negative prompts (no text, no watermark). NEVER write vague prompts like "beach" — write "Slow aerial drone shot descending toward coastline, golden hour sunlight, shallow depth of field, cinematic 4K".
- emotionalArc should have 2-4 sections covering the full video.
- detailedEmotionalArc should design a rollercoaster with phases (start, hook, dip, build, breathe, peak, resolve) — energy must NEVER stay flat for >10 seconds.
- protectedSilences should mark strategic pauses that should NOT be removed: impact pauses, anticipation pauses, rhetorical pauses, emotional pauses, comedic pauses.
- cutTransitions should mark where hard cuts happen and suggest transition types.
- For cutTransitions, use this enhanced format: { "at": 5.2, "type": "lcutBroll", "murchScore": 8, "audioOverlapAfter": 1.0, "reason": "speaker mentions beach — L-cut to B-Roll" }
- Valid cut types: "hard", "lcutBroll", "crossfade", "smashCut", "cutaway", "montage"
- For hard cuts, add "fakeZoom": true to simulate a camera angle change
- For crossfades, include "duration" (0.5-1.0s)

${MASTER_EDITING_PROMPT}

${getMasterPromptContext() ? `=== LEARNINGS FROM PAST PROJECTS ===\n${getMasterPromptContext()}` : ''}

${getBrainContext('general', 'all') ? `=== SIMILAR PAST PROJECTS ===\n${getBrainContext('general', 'all')}` : ''}

Based on your content analysis, create a complete "editingBlueprint" following ALL the rules above.
The blueprint should contain: cuts, zooms, brollInsertions, musicSync, soundDesign, colorPlan, platformOptimization, speedRamps, patternInterrupts, emotionalArc.
Include a murchAverageScore (average of all cut murch scores).
Also include "musicSync", "soundDesign", "zooms", "colorPlan", and "platformOptimization" as top-level fields in the response.`
    );

    const jsonStr = contentResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const analysis = JSON.parse(jsonStr);

    // Clean up temp frames
    cleanupFrames(tempDir, frames);

    return {
      ...analysis,
      visual,
      // Ensure all fields exist with defaults
      reconstructedSentences: analysis.reconstructedSentences || [],
      brollCoverMoments: analysis.brollCoverMoments || [],
      emotionalArc: analysis.emotionalArc || [],
      pacingPlan: analysis.pacingPlan || [],
      cutTransitions: analysis.cutTransitions || [],
      footageIssues: analysis.footageIssues || [],
      hookOptions: analysis.hookOptions || [],
      musicSync: analysis.musicSync || undefined,
      soundDesign: analysis.soundDesign || undefined,
      zooms: analysis.zooms || undefined,
      colorPlan: analysis.colorPlan || undefined,
      platformOptimization: analysis.platformOptimization || undefined,
      editingBlueprint: analysis.editingBlueprint || undefined,
      detailedEmotionalArc: analysis.detailedEmotionalArc || [],
      protectedSilences: analysis.protectedSilences || [],
    };
  } catch (error: any) {
    console.error('[ContentAnalyzer] Content analysis failed:', error.message);
    cleanupFrames(tempDir, frames);
    return getDefaultAnalysis(transcript, duration, visual);
  }
}

function cleanupFrames(tempDir: string, frames: string[]): void {
  for (const f of frames) {
    try { fs.unlinkSync(f); } catch {}
  }
  try { fs.rmdirSync(tempDir); } catch {}
}

function getDefaultAnalysis(
  transcript: TranscriptResult,
  duration: number,
  visual?: ContentAnalysis['visual']
): ContentAnalysis {
  const words = transcript.words;
  const firstWord = words[0]?.start || 0;
  const lastWord = words[words.length - 1]?.end || duration;

  return {
    presenter: {
      speakingSegments: [{ start: firstWord, end: lastWord }],
      silentSegments: [],
      totalSpeakingTime: lastWord - firstWord,
      totalSilentTime: duration - (lastWord - firstWord),
    },
    segments: [
      {
        start: 0,
        end: duration,
        type: 'speaking',
        quality: 5,
        keepRecommendation: 'keep',
        reason: 'Default — full content kept (analysis unavailable)',
      },
    ],
    bestMoments: [],
    structure: {
      introduction: { start: 0, end: Math.min(10, duration) },
      mainPoints: [{ start: 10, end: Math.max(10, duration - 10), topic: 'Main content' }],
      conclusion: { start: Math.max(10, duration - 10), end: duration },
      offTopicSegments: [],
    },
    recommendedEdit: {
      totalDuration: duration,
      segments: [{ start: 0, end: duration, reason: 'Full content (no analysis)' }],
      hookSegment: null,
      suggestedOrder: 'chronological',
    },
    visual: visual || {
      presenterPosition: 'center',
      hasGoodLighting: true,
      backgroundType: 'other',
      cameraAngle: 'front',
    },
    reconstructedSentences: [],
    brollCoverMoments: [],
    emotionalArc: [
      { section: 'build', start: 0, end: duration, musicMood: 'neutral', energy: 5 },
    ],
    pacingPlan: [
      { start: 0, end: duration, cutFrequency: 'medium', addZoom: false, addBRoll: false },
    ],
    cutTransitions: [],
    footageIssues: [],
    hookOptions: [],
    detailedEmotionalArc: [],
    protectedSilences: [],
  };
}
