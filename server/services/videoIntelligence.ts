import fs from 'fs';
import { askClaude, askClaudeVision } from './claude.js';
import { runFFmpeg, getVideoDuration } from './ffmpeg.js';
import type { TranscriptResult, ExecutionPlan } from '../types.js';
import { CTA_RULES_PROMPT, VIDEO_AD_TYPES_PROMPT, CONVERSION_RULES_PROMPT, SOCIAL_PROOF_PROMPT, INDUSTRY_RULES_PROMPT, MARKETING_FRAMEWORKS_PROMPT, VIDEO_COPYWRITING_PROMPT, COLOR_PSYCHOLOGY_PROMPT, SOUND_PSYCHOLOGY_PROMPT } from './marketingIntelligence.js';

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

  // Marketing intelligence (CTA + video ad type)
  marketingStrategy?: {
    videoAdType: string;
    videoAdTypeHebrew: string;
    suggestedStructure: string[];
    ctaPlan: {
      primaryCTA: { text: string; subtext: string; timestamp: string; style: string; position: string };
      midrollCTA?: { text: string; timestamp: string; style: string; subtle: boolean };
      ctaVariation?: { text: string; urgency: boolean };
    };
    textOverlaysByType: Array<{ timestamp: number; text: string; type: string }>;
  };

  // Conversion optimization (funnel + psychological triggers)
  conversionStrategy?: {
    funnelStage: 'top' | 'middle' | 'bottom';
    psychologicalTriggers: string[];
    triggerImplementation: Array<{
      trigger: string;
      text: string;
      timestamp: string | number;
      visual: string;
    }>;
  };

  // Industry-specific strategy
  industryStrategy?: {
    industry: string;
    industryRules: {
      leadWith: string;
      mustInclude: string[];
      colorGrading: string;
      musicMood: string;
      ctaStyle: string;
    };
  };

  // Social proof elements
  socialProofPlan?: Array<{
    type: 'numbers' | 'testimonial' | 'logos' | 'results';
    text: string;
    timestamp: number;
    visual: string;
  }>;

  // Marketing frameworks + copywriting + color/sound psychology
  marketingPlan?: {
    framework: {
      selectedFramework: string;
      frameworkReason: string;
      frameworkMapping: Array<{ stage: string; start: number; end: number; content: string }>;
    };
    copywriting: {
      textOverlays: Array<{
        type: string;
        text: string;
        timestamp: number;
        duration: number;
        fontSize: string;
        animation: string;
        position: string;
        color: string;
        originalPrice?: string;
        salePrice?: string;
      }>;
    };
    colorStrategy: {
      primaryCTAColor: string;
      primaryCTAReason: string;
      textHighlightColor: string;
      priceColor: string;
      urgencyColor: string;
      backgroundOverlay: string;
    };
    soundStrategy: {
      musicKey: string;
      bpmRange: string;
      genre: string;
      reason: string;
      sfxPlan: Array<{ type: string; usage: string }>;
    };
  };

  // Brain auto-selected optimal configuration
  recommendedConfig?: {
    model: string;
    modelReason: string;
    editStyle: 'cinematic' | 'energetic' | 'minimal' | 'trendy';
    editStyleReason: string;
    suggestedDuration: number;
    durationReason: string;
    subtitleStyle: string;
    subtitleStyleReason: string;
    enabledOptions: Record<string, boolean>;
    optionReasons: Record<string, string>;
    formats: string[];
    formatReason: string;
    estimatedCost: number;
    confidence: number;
  };
}

export async function analyzeVideoIntelligence(
  videoPath: string,
  transcript: TranscriptResult,
  presenterTranscript: TranscriptResult | null,
  targetDuration?: number,
  videoType?: string
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
          text: buildUserPrompt(activeTranscript, transcript, duration, targetDuration, edgeCaseContext, videoType),
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
      // Ensure recommendedConfig exists
      recommendedConfig: parsed.recommendedConfig || undefined,
      // Ensure marketing fields exist
      marketingStrategy: parsed.marketingStrategy || undefined,
      conversionStrategy: parsed.conversionStrategy || undefined,
      industryStrategy: parsed.industryStrategy || undefined,
      socialProofPlan: parsed.socialProofPlan || undefined,
      marketingPlan: parsed.marketingPlan || undefined,
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

${CTA_RULES_PROMPT}

${VIDEO_AD_TYPES_PROMPT}

${CONVERSION_RULES_PROMPT}

${SOCIAL_PROOF_PROMPT}

${INDUSTRY_RULES_PROMPT}

${MARKETING_FRAMEWORKS_PROMPT}

${VIDEO_COPYWRITING_PROMPT}

${COLOR_PSYCHOLOGY_PROMPT}

${SOUND_PSYCHOLOGY_PROMPT}

Based on the content analysis, determine:
1. Which of the 20 video ad types best fits this content
2. The optimal CTA strategy (primary + midroll + variation)
3. Text overlay plan specific to the video type
4. The right structure for this type
5. Funnel stage and psychological triggers for conversion
6. Social proof elements to integrate
7. Industry-specific rules to apply
8. Best marketing framework (AIDA/PAS/BAB/HOOK-VALUE-CTA/STAR-STORY-SOLUTION) and map video segments to framework stages
9. Marketing copywriting plan — all text overlays with type, animation, position, color
10. Color psychology strategy — CTA colors, highlight colors, price colors based on industry and purpose
11. Sound psychology strategy — music key, BPM, genre, and sound effects plan

Add to the response these marketing fields:
{
  "marketingStrategy": {
    "videoAdType": "real-estate-listing",
    "videoAdTypeHebrew": "נכס למכירה",
    "suggestedStructure": ["aerial-exterior", "entrance", "living", "kitchen", "features", "location", "cta"],
    "ctaPlan": {
      "primaryCTA": { "text": "קבעו סיור בדירה", "subtext": "שיחה של 5 דקות, ללא התחייבות", "timestamp": "last 4 seconds", "style": "pulse-button", "position": "center-bottom" },
      "midrollCTA": { "text": "רוצים לראות את הדירה?", "timestamp": "60% of video", "style": "text-overlay", "subtle": true },
      "ctaVariation": { "text": "רק 5 דירות נותרו!", "urgency": true }
    },
    "textOverlaysByType": [
      { "timestamp": 5, "text": "סלון 45 מ״ר", "type": "room-label" },
      { "timestamp": 15, "text": "₪1,890,000", "type": "price" }
    ]
  },
  "conversionStrategy": {
    "funnelStage": "top|middle|bottom",
    "psychologicalTriggers": ["scarcity", "social-proof", "authority", "reciprocity", "loss-aversion", "anchoring", "bandwagon"],
    "triggerImplementation": [
      { "trigger": "scarcity", "text": "רק 5 דירות נותרו", "timestamp": "last 5s", "visual": "countdown-timer" },
      { "trigger": "anchoring", "text": "₪2,500,000 → ₪1,890,000", "timestamp": "at price reveal", "visual": "strikethrough-animation" }
    ]
  },
  "industryStrategy": {
    "industry": "real-estate|food|fashion|tech|health|education|events|automotive|ecommerce|services",
    "industryRules": {
      "leadWith": "lifestyle|product|problem|value|energy",
      "mustInclude": ["array of must-include elements"],
      "colorGrading": "warm-luxury|warm-appetizing|trendy-vibrant|clean-minimal|cinematic-deep",
      "musicMood": "calm-elegant|upbeat-modern|energetic-beat|professional-moderate",
      "ctaStyle": "phone-number-prominent|buy-now-button|free-trial|soft-follow"
    }
  },
  "socialProofPlan": [
    { "type": "numbers|testimonial|logos|results", "text": "Hebrew social proof text", "timestamp": 15, "visual": "counter-animation|lower-third|logo-bar|before-after" }
  ],
  "marketingPlan": {
    "framework": {
      "selectedFramework": "AIDA|PAS|BAB|HOOK-VALUE-CTA|STAR-STORY-SOLUTION",
      "frameworkReason": "Hebrew reason for choosing this framework",
      "frameworkMapping": [
        { "stage": "framework stage name", "start": 0, "end": 3, "content": "what happens in this stage" }
      ]
    },
    "copywriting": {
      "textOverlays": [
        { "type": "headline|sub-headline|bullet-points|price|statistic|urgency|doubt-remover|label|quote-card|social-proof-counter", "text": "Hebrew text", "timestamp": 0, "duration": 3, "fontSize": "xl|lg|md|sm", "animation": "scale-up|bounce|fade-in|slide-up|slide-right|pulse|typewriter|strikethrough-then-scale|pop-in|counter", "position": "center|top|bottom|lower-third|corner|near-item", "color": "white|red|green|brand", "originalPrice": "optional for price type", "salePrice": "optional for price type" }
      ]
    },
    "colorStrategy": {
      "primaryCTAColor": "#hex color",
      "primaryCTAReason": "Hebrew reason for CTA color",
      "textHighlightColor": "#hex color",
      "priceColor": "#hex color",
      "urgencyColor": "#hex color",
      "backgroundOverlay": "rgba(0,0,0,0.6)"
    },
    "soundStrategy": {
      "musicKey": "major|minor|suspended",
      "bpmRange": "60-80|80-100|100-120|120-140|140+",
      "genre": "piano-acoustic|electronic-synth|orchestral-cinematic|lofi-chill|corporate-minimal|hiphop-trap",
      "reason": "Hebrew reason for sound choices",
      "sfxPlan": [
        { "type": "whoosh|ding|cash-register|heartbeat|crowd-cheering|click|rise", "usage": "when to use this effect" }
      ]
    }
  }
}

IMPORTANT: You must also output a "recommendedConfig" field with the OPTIMAL configuration for this video.
You must choose the BEST option for each setting — not the cheapest, but the one that will produce the best video.

MODEL SELECTION:
- Real estate / architecture / nature → "veo-3.1-fast" (best cinematic B-Roll)
- Quick social media / TikTok → "kling-v2.5-turbo" (fast + cheap for multiple clips)
- High-end brand / luxury → "sora-2" (highest quality)
- Products / e-commerce → "seedance-1.5-pro" (best for products)
- Artistic / creative → "wan-2.5" (most artistic style)

EDIT STYLE:
- Professional / corporate / real estate → "cinematic"
- Social media / TikTok / energetic speaker → "energetic"
- Clean / elegant / testimonial → "minimal"
- Young audience / trendy content → "trendy"

OPTIONS — enable based on content needs:
- removeSilences: ALWAYS true (no reason to keep dead air)
- hebrewSubtitles: true if speaker talks in Hebrew
- englishSubtitles: true if speaker talks in English
- addBRoll: true if talking-head (needs visual variety)
- backgroundMusic: true UNLESS content is music-related
- energeticMusic: true if pacing is fast or content is energetic
- calmMusic: true if pacing is calm or content is professional
- aiSoundEffects: true if content has topic changes or emphasis moments
- colorCorrection: true if footage quality < 8
- autoZoom: true if talking-head (adds movement to static shot)
- transitions: true if multiple segments exist
- intro: true if no natural hook exists (system will create one)
- outro: true (always add CTA)
- logoWatermark: true if logo was uploaded
- thumbnailGeneration: true (always generate)
- viralityScore: true if destination is social media
- kineticTypography: true if there are key statistics or strong quotes
- backgroundBlur: true if background quality is "messy" or "acceptable"
- eyeContact: true if speaker doesn't always look at camera
- lowerThirds: true if content is professional/corporate
- musicSync: true if edit style is energetic or trendy
- trendingSounds: true if destination is TikTok/Instagram

SUBTITLE STYLE:
- Professional/corporate → "bold" or "box"
- TikTok/social → "karaoke" or "neon"
- Minimal/elegant → "minimal" or "classic"
- Energetic → "gradient" or "bounce"

DURATION:
- Calculate from usable content
- If 30s of good content exists → suggest 30s
- If 90s of good content → suggest 60s (leave room for B-Roll)
- Social media max: 60s for Reels, 30s for TikTok
- Never suggest longer than the usable content allows

FORMAT:
- If social media preset → ["9:16", "1:1"]
- If brand/corporate → ["16:9"]
- If real estate → ["16:9", "9:16"] (both platforms)
- If TikTok specifically → ["9:16"]

Return "optionReasons" explaining WHY each option is on/off in Hebrew.
Set "confidence" between 0 and 1 based on how certain you are about the recommendations.

Return ONLY valid JSON, no markdown code blocks.`;
}

function buildUserPrompt(
  activeTranscript: TranscriptResult,
  fullTranscript: TranscriptResult,
  duration: number,
  targetDuration: number | undefined,
  edgeCaseContext: string,
  videoType?: string
): string {
  // Build CTA rules based on video type
  const ctaRules = videoType ? `
VIDEO TYPE: ${videoType}

IMPORTANT CTA RULES:
- If videoType is 'paid-ad': CTA must be conversion-focused.
  Examples: "צרו קשר עכשיו", "קבעו שיחת ייעוץ", "קבלו הצעת מחיר"
  NEVER use "עקבו אחרינו" or "תגיבו" — those are for organic content.
- If videoType is 'organic': CTA can be engagement-focused.
  Examples: "עקבו לעוד תוכן", "שתפו עם חבר", "תגיבו מה אתם חושבים"
- If videoType is 'explainer': CTA should be educational.
  Examples: "למדו עוד", "קראו את המדריך המלא", "הירשמו לקורס"
- If videoType is 'testimonial': CTA should be social-proof driven.
  Examples: "הצטרפו גם אתם", "קראו עוד המלצות"
- If videoType is 'product-demo': CTA should be trial/download focused.
  Examples: "נסו בחינם", "הורידו עכשיו", "הירשמו לניסיון חינם"
- If videoType is 'real-estate-tour': CTA must be appointment-focused.
  Examples: "קבעו סיור עכשיו", "התקשרו: 05X-XXXXXXX", "השאירו פרטים"
` : '';

  return `Analyze this video:

TRANSCRIPT (presenter only): "${activeTranscript.fullText}"

FULL TRANSCRIPT (all speakers): "${fullTranscript.fullText}"

VIDEO DURATION: ${Math.round(duration)} seconds
NUMBER OF SPEAKERS: ${new Set(fullTranscript.words.map(w => w.speaker)).size}
${targetDuration ? `TARGET DURATION: ${targetDuration} seconds` : 'TARGET: suggest optimal duration'}
${edgeCaseContext}${ctaRules}

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
  ],
  "marketingStrategy": {
    "videoAdType": "one of the 20 types (kebab-case)",
    "videoAdTypeHebrew": "Hebrew name of the type",
    "suggestedStructure": ["array of structure steps for this type"],
    "ctaPlan": {
      "primaryCTA": { "text": "Hebrew CTA", "subtext": "Hebrew micro-text", "timestamp": "last N seconds", "style": "pulse-button|text-overlay|subtle-text", "position": "center-bottom|center-vertical" },
      "midrollCTA": { "text": "Hebrew soft CTA", "timestamp": "60% of video", "style": "text-overlay", "subtle": true },
      "ctaVariation": { "text": "Hebrew urgency CTA", "urgency": true }
    },
    "textOverlaysByType": [
      { "timestamp": 5, "text": "Hebrew overlay text", "type": "room-label|price|feature|step-number|statistic|name-title|comparison" }
    ]
  },
  "conversionStrategy": {
    "funnelStage": "top|middle|bottom",
    "psychologicalTriggers": ["2-3 triggers from: scarcity, social-proof, authority, reciprocity, loss-aversion, anchoring, bandwagon"],
    "triggerImplementation": [
      { "trigger": "trigger-name", "text": "Hebrew trigger text", "timestamp": "when to show", "visual": "countdown-timer|strikethrough-animation|counter-animation|badge-display" }
    ]
  },
  "industryStrategy": {
    "industry": "detected industry (kebab-case)",
    "industryRules": {
      "leadWith": "what to lead the video with",
      "mustInclude": ["required elements for this industry"],
      "colorGrading": "recommended color grading style",
      "musicMood": "recommended music mood",
      "ctaStyle": "recommended CTA style"
    }
  },
  "socialProofPlan": [
    { "type": "numbers|testimonial|logos|results", "text": "Hebrew text", "timestamp": 15, "visual": "counter-animation|lower-third|logo-bar|before-after" }
  ],
  "recommendedConfig": {
    "model": "veo-3.1-fast|sora-2|kling-v2.5-turbo|wan-2.5|seedance-1.5-pro",
    "modelReason": "Hebrew reason for model choice",
    "editStyle": "cinematic|energetic|minimal|trendy",
    "editStyleReason": "Hebrew reason for edit style",
    "suggestedDuration": 45,
    "durationReason": "Hebrew reason for duration",
    "subtitleStyle": "classic|bold|neon|gradient|outline|shadow|box|typewriter|karaoke|minimal",
    "subtitleStyleReason": "Hebrew reason for subtitle style",
    "enabledOptions": {
      "removeSilences": true,
      "addBRoll": true,
      "hebrewSubtitles": true,
      "englishSubtitles": false,
      "backgroundMusic": true,
      "energeticMusic": false,
      "calmMusic": true,
      "soundEffects": false,
      "colorCorrection": true,
      "autoZoom": true,
      "transitions": true,
      "intro": true,
      "outro": true,
      "logoWatermark": false,
      "thumbnailGeneration": true,
      "viralityScore": false,
      "aiTwin": false,
      "aiBackground": false,
      "backgroundBlur": false,
      "cinematic": false,
      "eyeContact": false,
      "calmProfessional": false,
      "trendy": false,
      "lowerThirds": false,
      "aiSoundEffects": false,
      "kineticTypography": false,
      "musicSync": false,
      "trendingSounds": false
    },
    "optionReasons": {
      "removeSilences": "תמיד — אין סיבה לשמור שתיקות",
      "addBRoll": "Hebrew reason"
    },
    "formats": ["16:9"],
    "formatReason": "Hebrew reason for format choice",
    "estimatedCost": 1.50,
    "confidence": 0.85
  }
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
