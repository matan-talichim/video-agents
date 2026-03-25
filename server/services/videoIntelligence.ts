import fs from 'fs';
import { askClaude, askClaudeVision } from './claude.js';
import { runFFmpeg, getVideoDuration } from './ffmpeg.js';
import type { TranscriptResult, ExecutionPlan } from '../types.js';

export interface VideoIntelligence {
  // What is this video about?
  concept: {
    title: string;
    summary: string;
    category: 'talking-head' | 'interview' | 'product-demo' | 'tour' | 'testimonial' |
              'presentation' | 'event' | 'broll-only' | 'screen-recording' | 'mixed';
    industry: string;
    targetAudience: string;
    tone: string;
  };

  // Key points extracted from content
  keyPoints: Array<{
    point: string;
    timestamp: number;
    importance: number;
    type: 'main-message' | 'supporting-fact' | 'statistic' | 'quote' | 'benefit' | 'feature' | 'cta' | 'story';
    suggestedVisual: string;
  }>;

  // Story structure
  storyArc: {
    hasNaturalArc: boolean;
    suggestedStructure: Array<{
      section: 'hook' | 'problem' | 'solution' | 'proof' | 'benefits' | 'features' |
               'testimonial' | 'cta' | 'intro' | 'main' | 'conclusion';
      start: number;
      end: number;
      title: string;
      keyMessage: string;
    }>;
    missingElements: string[];
    suggestedAdditions: Array<{
      element: string;
      type: 'text-overlay' | 'broll' | 'voiceover' | 'music-change';
      suggestion: string;
    }>;
  };

  // Raw footage quality assessment
  footageAssessment: {
    overallQuality: number;
    videoQuality: {
      resolution: 'low' | 'medium' | 'high';
      lighting: 'poor' | 'acceptable' | 'good' | 'professional';
      stability: 'shaky' | 'mostly-stable' | 'stable' | 'tripod';
      framing: 'poor' | 'acceptable' | 'good';
      background: 'messy' | 'acceptable' | 'clean' | 'professional';
    };
    audioQuality: {
      clarity: 'poor' | 'acceptable' | 'good' | 'professional';
      backgroundNoise: 'heavy' | 'moderate' | 'light' | 'none';
      volume: 'too-quiet' | 'acceptable' | 'good' | 'too-loud';
      echo: boolean;
    };
    issues: string[];
    autoFixes: string[];
  };

  // Content density
  contentDensity: {
    totalFootageDuration: number;
    usableContentDuration: number;
    wastePercentage: number;
    contentPerMinute: number;
    recommendation: string;
  };

  // Footage type specific analysis
  typeSpecific: {
    speakerEnergy: 'low' | 'medium' | 'high';
    speakerConfidence: 'nervous' | 'moderate' | 'confident';
    eyeContactFrequency: 'rarely' | 'sometimes' | 'mostly' | 'always';
    questionQuality?: 'weak' | 'average' | 'strong';
    answerQuality?: 'weak' | 'average' | 'strong';
    productVisibility?: 'poor' | 'average' | 'clear';
    demoClarity?: 'confusing' | 'average' | 'clear';
    coverageCompleteness?: 'partial' | 'good' | 'comprehensive';
    movementSmooth?: boolean;
    highlightMoments?: Array<{ start: number; end: number; description: string }>;
    hasAudioNarration?: boolean;
    screenReadability?: 'poor' | 'average' | 'clear';
    suggestedNarration?: string;
    suggestedMusicMood?: string;
  };

  // Text overlays plan
  textOverlayPlan: Array<{
    text: string;
    timestamp: number;
    duration: number;
    type: 'title' | 'subtitle' | 'statistic' | 'quote' | 'bullet-point' | 'cta' | 'label';
    style: 'large-center' | 'lower-third' | 'side-text' | 'full-screen';
    animation: 'fade' | 'bounce' | 'typewriter' | 'slide';
  }>;

  // B-Roll suggestions based on content understanding
  smartBRollPlan: Array<{
    timestamp: number;
    duration: number;
    reason: string;
    prompt: string;
    priority: 'must-have' | 'nice-to-have' | 'optional';
    alternative: string;
  }>;

  // Edge case flags
  edgeCases: {
    isBRollOnly: boolean;
    isVeryShort: boolean;
    isBilingual: boolean;
    isRepetitive: boolean;
    isVeryLong: boolean;
    isMultipleClips: boolean;
    warnings: string[];
  };
}

export async function analyzeVideoIntelligence(
  videoPath: string,
  transcript: TranscriptResult,
  presenterTranscript: TranscriptResult | null,
  targetDuration?: number
): Promise<VideoIntelligence> {
  console.log('[Intelligence] Starting deep video analysis...');

  const duration = await getVideoDuration(videoPath);
  const activeTranscript = presenterTranscript || transcript;

  // Detect edge cases
  const edgeCases = detectEdgeCases(activeTranscript, transcript, duration);

  // Extract frames for visual analysis
  const frameCount = Math.min(8, Math.ceil(duration / 15));
  const frames: Array<{ path: string; timestamp: number }> = [];
  const tempDir = `temp/intel_${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  for (let i = 0; i < frameCount; i++) {
    const timestamp = (duration / (frameCount + 1)) * (i + 1);
    const framePath = `${tempDir}/frame_${i}.jpg`;
    try {
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 -y "${framePath}"`);
      if (fs.existsSync(framePath)) {
        frames.push({ path: framePath, timestamp });
      }
    } catch {
      // Skip failed frame extractions
    }
  }

  // Build edge case context for the prompt
  const edgeCaseContext = buildEdgeCaseContext(edgeCases, duration, activeTranscript);

  // Send frames + transcript to Claude for deep analysis
  const frameImages = frames.slice(0, 5).map(f => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: fs.readFileSync(f.path).toString('base64'),
    },
  }));

  try {
    const response = await askClaudeVision(
      buildSystemPrompt(),
      [
        ...frameImages,
        {
          type: 'text',
          text: buildUserPrompt(activeTranscript, transcript, duration, targetDuration, edgeCaseContext),
        },
      ]
    );

    // Cleanup frames
    cleanupFrames(tempDir, frames);

    const jsonStr = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      ...parsed,
      edgeCases,
      // Ensure all arrays exist
      keyPoints: parsed.keyPoints || [],
      textOverlayPlan: parsed.textOverlayPlan || [],
      smartBRollPlan: parsed.smartBRollPlan || [],
      storyArc: {
        hasNaturalArc: parsed.storyArc?.hasNaturalArc ?? false,
        suggestedStructure: parsed.storyArc?.suggestedStructure || [],
        missingElements: parsed.storyArc?.missingElements || [],
        suggestedAdditions: parsed.storyArc?.suggestedAdditions || [],
      },
      footageAssessment: {
        overallQuality: parsed.footageAssessment?.overallQuality || 5,
        videoQuality: parsed.footageAssessment?.videoQuality || {
          resolution: 'medium', lighting: 'acceptable', stability: 'stable',
          framing: 'acceptable', background: 'acceptable',
        },
        audioQuality: parsed.footageAssessment?.audioQuality || {
          clarity: 'acceptable', backgroundNoise: 'light', volume: 'acceptable', echo: false,
        },
        issues: parsed.footageAssessment?.issues || [],
        autoFixes: parsed.footageAssessment?.autoFixes || [],
      },
      contentDensity: parsed.contentDensity || {
        totalFootageDuration: duration,
        usableContentDuration: duration * 0.6,
        wastePercentage: 40,
        contentPerMinute: (parsed.keyPoints?.length || 3) / (duration / 60),
        recommendation: `מספיק ל-${Math.round(duration * 0.6)} שניות`,
      },
      typeSpecific: parsed.typeSpecific || {
        speakerEnergy: 'medium',
        speakerConfidence: 'moderate',
        eyeContactFrequency: 'mostly',
      },
    };
  } catch (error: any) {
    console.error('[Intelligence] Analysis failed:', error.message);
    cleanupFrames(tempDir, frames);
    return getDefaultIntelligence(activeTranscript, duration, edgeCases);
  }
}

/**
 * Apply intelligence findings to the execution plan — auto-configure features
 * based on content understanding.
 */
export function applyIntelligenceToPlan(plan: ExecutionPlan, intel: VideoIntelligence): void {
  // Auto-fix footage issues
  for (const fix of intel.footageAssessment.autoFixes) {
    const f = fix.toLowerCase();
    if (f.includes('blur') || f.includes('רקע')) plan.edit.backgroundBlur = true;
    if (f.includes('noise') || f.includes('רעש')) plan.edit.noiseReduction = true;
    if (f.includes('speech') || f.includes('דיבור')) plan.edit.enhanceSpeech = true;
    if (f.includes('stabilize') || f.includes('ייצוב')) plan.clean.removeShakyBRoll = true;
    if (f.includes('color') || f.includes('צבע')) plan.edit.colorGrading = true;
    if (f.includes('light') || f.includes('תאורה')) plan.edit.lightingEnhancement = true;
  }

  // Set content-appropriate defaults based on category
  switch (intel.concept.category) {
    case 'tour':
      plan.edit.pacing = 'calm';
      plan.generate.musicMood = 'calm';
      plan.edit.smartZooms = false;
      break;
    case 'event':
      plan.edit.pacing = 'fast';
      plan.edit.beatSyncCuts = true;
      plan.edit.musicSync = true;
      break;
    case 'testimonial':
      plan.edit.pacing = 'calm';
      plan.edit.backgroundBlur = true;
      plan.edit.lowerThirds = true;
      break;
    case 'product-demo':
      plan.edit.smartZooms = true;
      plan.edit.kineticTypography = true;
      break;
    case 'screen-recording':
      plan.edit.smartZooms = true;
      if (!intel.typeSpecific.hasAudioNarration) {
        plan.generate.aiVoiceover = true;
      }
      break;
    case 'broll-only':
      plan.generate.aiVoiceover = true;
      plan.edit.kineticTypography = true;
      break;
    case 'interview':
      plan.edit.lowerThirds = true;
      break;
    case 'presentation':
      plan.edit.smartZooms = true;
      plan.edit.kineticTypography = true;
      break;
  }

  // Use smart B-Roll plan
  if (intel.smartBRollPlan && intel.smartBRollPlan.length > 0) {
    plan.generate.broll = true;
    plan.generate.brollFromTranscript = true;
  }

  // Set optimal duration based on content density
  if (plan.export.targetDuration === 'auto' && intel.contentDensity.usableContentDuration > 0) {
    plan.export.targetDuration = Math.round(intel.contentDensity.usableContentDuration);
  }

  // Enable text overlays if the intelligence planned them
  if (intel.textOverlayPlan && intel.textOverlayPlan.length > 0) {
    plan.edit.subtitles = true;
    plan.edit.kineticTypography = true;
  }

  // Handle edge cases
  if (intel.edgeCases.isBRollOnly) {
    plan.generate.aiVoiceover = true;
    plan.edit.music = true;
  }

  if (intel.edgeCases.isRepetitive) {
    plan.clean.selectBestTake = true;
  }
}

function detectEdgeCases(
  activeTranscript: TranscriptResult,
  fullTranscript: TranscriptResult,
  duration: number
): VideoIntelligence['edgeCases'] {
  const warnings: string[] = [];

  // B-Roll only (no meaningful speech)
  const isBRollOnly = activeTranscript.fullText.trim().length < 10;
  if (isBRollOnly) {
    warnings.push('אין דיבור בסרטון — יתווסף קריינות AI וטקסטים');
  }

  // Very short speech
  const isVeryShort = activeTranscript.words.length < 20 && activeTranscript.words.length > 0;
  if (isVeryShort) {
    warnings.push('תוכן דיבור קצר מאוד — הסרטון יתמקד בסטוריטלינג ויזואלי');
  }

  // Bilingual
  const hasEnglish = /[a-zA-Z]{3,}/.test(activeTranscript.fullText);
  const hasHebrew = /[\u0590-\u05FF]{2,}/.test(activeTranscript.fullText);
  const isBilingual = hasEnglish && hasHebrew;
  if (isBilingual) {
    warnings.push('זוהה תוכן דו-לשוני (עברית + אנגלית) — כתוביות בשתי שפות');
  }

  // Repetitive content (multiple takes)
  const sentences = activeTranscript.fullText.split(/[.!?]/).filter(s => s.trim().length > 10);
  const uniquePrefixes = new Set(sentences.map(s => s.trim().slice(0, 20)));
  const isRepetitive = sentences.length > 4 && uniquePrefixes.size < sentences.length * 0.6;
  if (isRepetitive) {
    warnings.push('זוהו טייקים חוזרים — המערכת תבחר את הטייק הטוב ביותר לכל משפט');
  }

  // Very long footage
  const isVeryLong = duration > 300;
  if (isVeryLong) {
    warnings.push('יש הרבה חומר — המערכת תבחר את הקטעים הטובים ביותר ותחתוך בצורה אגרסיבית');
  }

  // Multiple clips detection (based on gap detection in transcript)
  const isMultipleClips = false; // Would need file count from job context

  return {
    isBRollOnly,
    isVeryShort,
    isBilingual,
    isRepetitive,
    isVeryLong,
    isMultipleClips,
    warnings,
  };
}

function buildEdgeCaseContext(
  edgeCases: VideoIntelligence['edgeCases'],
  duration: number,
  transcript: TranscriptResult
): string {
  const parts: string[] = [];

  if (edgeCases.isBRollOnly) {
    parts.push('EDGE CASE: This is B-Roll only footage with no speech. Suggest a narration script and plan text overlays to tell the story. Use music-driven editing.');
  }
  if (edgeCases.isVeryShort) {
    parts.push('EDGE CASE: Very short speech content. Focus on visual storytelling with text overlays.');
  }
  if (edgeCases.isBilingual) {
    parts.push('EDGE CASE: Bilingual content (Hebrew + English). Note this in analysis and suggest subtitles in both languages.');
  }
  if (edgeCases.isRepetitive) {
    parts.push('EDGE CASE: Content appears to have multiple takes/repetitions. Enable sentence reconstruction — pick the best fragments from different takes.');
  }
  if (edgeCases.isVeryLong) {
    parts.push(`EDGE CASE: Very long footage (${Math.round(duration)}s). Be RUTHLESS — cut 80-90%+. Keep ONLY the hook, top 3 key points, and CTA. Every second must earn its place.`);
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n') : '';
}

function buildSystemPrompt(): string {
  return `You are an expert video editor and content strategist. You analyze raw footage to create the best possible video.

Your analysis must be EXTREMELY thorough. You need to understand:
1. WHAT is this video about? What's the main message?
2. WHO is the target audience?
3. WHAT are the key points and messages?
4. WHERE is the content strong and where is it weak?
5. HOW should this be edited for maximum impact?

Think like a $100M production company editor. You've seen thousands of videos. You know what works on social media. You know what makes people stop scrolling. You know how to turn mediocre footage into a viral video.

HANDLE EVERY TYPE OF FOOTAGE:

TYPE: TALKING HEAD — Extract ALL key messages, rank by importance, find energy peaks, plan zooms.
TYPE: INTERVIEW — Keep best answers, use questions as text overlays, cut interviewer audio if off-camera.
TYPE: MULTIPLE TAKES — Find best fragments from each take, allow sentence reconstruction.
TYPE: PRODUCT DEMO — Show product clearly. Structure: problem → solution → features → benefits → CTA. Add text labels.
TYPE: REAL ESTATE / TOUR — Smooth flow room to room. Add labels. Stabilize. Ambient music.
TYPE: TESTIMONIAL — Find most emotional moment. Start with strongest statement. Keep SHORT (30-45s).
TYPE: EVENT — Fast cuts, beat-sync, B-Roll of crowd/venue. Music-driven.
TYPE: SCREEN RECORDING — Zoom into UI elements. Add narration if missing. Speed up boring parts.
TYPE: B-ROLL ONLY — Needs narration or text overlays. Suggest script. Music-driven.
TYPE: MIXED — Separate talking, B-Roll, transitions. Build intelligent timeline.
TYPE: POOR QUALITY — Detect issues and suggest fixes (stabilize, brighten, noise reduction, blur background, etc.)
TYPE: VERY LONG (>5min → 60s) — Be RUTHLESS. Cut 90%+. Keep ONLY hook + top 3 points + CTA.

All user-facing text MUST be in Hebrew. Technical field values stay in English.
Return ONLY valid JSON, no markdown code blocks.`;
}

function buildUserPrompt(
  activeTranscript: TranscriptResult,
  fullTranscript: TranscriptResult,
  duration: number,
  targetDuration: number | undefined,
  edgeCaseContext: string
): string {
  return `Analyze this video:

TRANSCRIPT (presenter only): "${activeTranscript.fullText}"

FULL TRANSCRIPT (all speakers): "${fullTranscript.fullText}"

VIDEO DURATION: ${Math.round(duration)} seconds
NUMBER OF SPEAKERS: ${new Set(fullTranscript.words.map(w => w.speaker)).size}
${targetDuration ? `TARGET DURATION: ${targetDuration} seconds` : 'TARGET: suggest optimal duration'}
${edgeCaseContext}

Return a complete VideoIntelligence JSON with ALL fields:
{
  "concept": {
    "title": "Hebrew title",
    "summary": "2-3 sentence Hebrew summary",
    "category": "talking-head|interview|product-demo|tour|testimonial|presentation|event|broll-only|screen-recording|mixed",
    "industry": "string",
    "targetAudience": "Hebrew description",
    "tone": "professional|casual|energetic|emotional|educational"
  },
  "keyPoints": [
    {
      "point": "Hebrew text of the key message",
      "timestamp": 12.5,
      "importance": 9,
      "type": "main-message|supporting-fact|statistic|quote|benefit|feature|cta|story",
      "suggestedVisual": "what to show during this point"
    }
  ],
  "storyArc": {
    "hasNaturalArc": true/false,
    "suggestedStructure": [
      { "section": "hook|problem|solution|proof|benefits|features|testimonial|cta|intro|main|conclusion", "start": 0, "end": 5, "title": "Hebrew title", "keyMessage": "Hebrew message" }
    ],
    "missingElements": ["Hebrew descriptions of what's missing"],
    "suggestedAdditions": [
      { "element": "Hebrew description", "type": "text-overlay|broll|voiceover|music-change", "suggestion": "Hebrew suggestion" }
    ]
  },
  "footageAssessment": {
    "overallQuality": 7,
    "videoQuality": { "resolution": "high", "lighting": "good", "stability": "stable", "framing": "good", "background": "clean" },
    "audioQuality": { "clarity": "good", "backgroundNoise": "light", "volume": "good", "echo": false },
    "issues": ["Hebrew issue descriptions"],
    "autoFixes": ["keyword fixes: noise-reduction, speech-enhancement, background-blur, stabilize, color-correction, lighting-enhancement"]
  },
  "contentDensity": {
    "totalFootageDuration": ${Math.round(duration)},
    "usableContentDuration": number,
    "wastePercentage": number,
    "contentPerMinute": number,
    "recommendation": "Hebrew recommendation"
  },
  "typeSpecific": {
    "speakerEnergy": "low|medium|high",
    "speakerConfidence": "nervous|moderate|confident",
    "eyeContactFrequency": "rarely|sometimes|mostly|always",
    ...any other relevant type-specific fields
  },
  "textOverlayPlan": [
    { "text": "Hebrew text", "timestamp": 0, "duration": 3, "type": "title|subtitle|statistic|quote|bullet-point|cta|label", "style": "large-center|lower-third|side-text|full-screen", "animation": "fade|bounce|typewriter|slide" }
  ],
  "smartBRollPlan": [
    { "timestamp": 15, "duration": 4, "reason": "Hebrew reason", "prompt": "detailed generation prompt in English", "priority": "must-have|nice-to-have|optional", "alternative": "search keyword if generation fails" }
  ]
}

Be thorough. This analysis determines the quality of the final video.
Rate key points honestly: importance 1-3 = skip, 4-6 = optional, 7-10 = must include.
For the story structure, suggest the OPTIMAL order even if it differs from the original recording order.`;
}

function cleanupFrames(tempDir: string, frames: Array<{ path: string; timestamp: number }>): void {
  for (const f of frames) {
    try { fs.unlinkSync(f.path); } catch {}
  }
  try { fs.rmdirSync(tempDir); } catch {}
}

function getDefaultIntelligence(
  transcript: TranscriptResult,
  duration: number,
  edgeCases: VideoIntelligence['edgeCases']
): VideoIntelligence {
  return {
    concept: {
      title: 'סרטון',
      summary: 'ניתוח אוטומטי לא הצליח — נעשה שימוש בהגדרות ברירת מחדל',
      category: transcript.fullText.trim().length < 10 ? 'broll-only' : 'talking-head',
      industry: 'general',
      targetAudience: 'קהל כללי',
      tone: 'professional',
    },
    keyPoints: [],
    storyArc: {
      hasNaturalArc: false,
      suggestedStructure: [
        { section: 'intro', start: 0, end: Math.min(10, duration), title: 'פתיחה', keyMessage: '' },
        { section: 'main', start: 10, end: Math.max(10, duration - 10), title: 'תוכן עיקרי', keyMessage: '' },
        { section: 'conclusion', start: Math.max(10, duration - 10), end: duration, title: 'סיום', keyMessage: '' },
      ],
      missingElements: [],
      suggestedAdditions: [],
    },
    footageAssessment: {
      overallQuality: 5,
      videoQuality: { resolution: 'medium', lighting: 'acceptable', stability: 'stable', framing: 'acceptable', background: 'acceptable' },
      audioQuality: { clarity: 'acceptable', backgroundNoise: 'light', volume: 'acceptable', echo: false },
      issues: [],
      autoFixes: [],
    },
    contentDensity: {
      totalFootageDuration: duration,
      usableContentDuration: duration * 0.6,
      wastePercentage: 40,
      contentPerMinute: 3,
      recommendation: `מספיק ל-${Math.round(duration * 0.6)} שניות`,
    },
    typeSpecific: {
      speakerEnergy: 'medium',
      speakerConfidence: 'moderate',
      eyeContactFrequency: 'mostly',
    },
    textOverlayPlan: [],
    smartBRollPlan: [],
    edgeCases,
  };
}
