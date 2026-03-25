import type { ExecutionPlan, FileInfo, UserOptions, BRollModel, BrandKit } from '../types.js';
import { askClaude } from '../services/claude.js';
import { BRAIN_SYSTEM_PROMPT } from './systemPrompt.js';
import { validatePlan } from './planValidator.js';

interface BrainContext {
  editStyle?: string;
  captionTemplate?: string;
  voiceoverStyle?: string;
  targetLanguage?: string;
  storyPageCount?: number;
  brandKit?: BrandKit;
}

export async function generatePlan(
  prompt: string,
  files: FileInfo[],
  options: UserOptions,
  model: BRollModel,
  context?: BrainContext
): Promise<{ plan: ExecutionPlan; enabledCount: number }> {
  const userMessage = buildUserMessage(prompt, files, options, model, context);

  try {
    console.log('[Brain] Sending prompt to Claude API...');
    const rawResponse = await askClaude(BRAIN_SYSTEM_PROMPT, userMessage);
    console.log('[Brain] Received response from Claude API');

    // Parse JSON from response — strip any accidental markdown/backticks
    const jsonStr = rawResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[Brain] Failed to parse Claude response as JSON:', parseErr);
      console.error('[Brain] Raw response (first 500 chars):', rawResponse.slice(0, 500));
      // Fall back to safe default
      const fallback = buildFallbackPlan(prompt, files, options, model, context);
      return { plan: fallback, enabledCount: countEnabledFeatures(fallback) };
    }

    // Validate and sanitize the plan
    const { valid, plan, errors } = validatePlan(parsed, model);
    if (!valid) {
      console.warn('[Brain] Plan validation had issues:', errors);
    }

    // Merge context overrides that the user selected in UI
    applyContextOverrides(plan, context, files);

    const enabledCount = countEnabledFeatures(plan);
    console.log(`[Brain] Plan generated — ${enabledCount} features enabled out of 95`);

    return { plan, enabledCount };
  } catch (error) {
    console.error('[Brain] Claude API call failed, using fallback plan:', error);
    const fallback = buildFallbackPlan(prompt, files, options, model, context);
    return { plan: fallback, enabledCount: countEnabledFeatures(fallback) };
  }
}

function buildUserMessage(
  prompt: string,
  files: FileInfo[],
  options: UserOptions,
  model: BRollModel,
  context?: BrainContext
): string {
  const filesSummary = files.length === 0
    ? 'No files uploaded (prompt-only mode).'
    : files.map((f, i) => `${i + 1}. ${f.name} — type: ${f.type} — size: ${(f.size / 1024 / 1024).toFixed(1)}MB`).join('\n');

  const hasDocFile = files.some((f) => /\.(pdf|docx?|txt|pptx?)$/i.test(f.name));
  const hasAudioFile = files.some((f) => f.type.startsWith('audio/'));
  const videoCount = files.filter((f) => f.type.startsWith('video/')).length;

  const parts: string[] = [
    `## User Prompt\n${prompt}`,
    `\n## Uploaded Files (${files.length} total)\n${filesSummary}`,
    `\n## File Analysis\n- Video files: ${videoCount}\n- Has document (PDF/Doc): ${hasDocFile}\n- Has audio file: ${hasAudioFile}`,
    `\n## Selected B-Roll Model\n${model}`,
    `\n## User-Selected Options\n${JSON.stringify(options, null, 2)}`,
  ];

  if (context) {
    const contextParts: string[] = [];
    if (context.editStyle) contextParts.push(`- Edit style: ${context.editStyle}`);
    if (context.captionTemplate) contextParts.push(`- Caption template: ${context.captionTemplate}`);
    if (context.voiceoverStyle) contextParts.push(`- Voiceover style: ${context.voiceoverStyle}`);
    if (context.targetLanguage) contextParts.push(`- Target language: ${context.targetLanguage}`);
    if (context.storyPageCount) contextParts.push(`- Story page count: ${context.storyPageCount}`);
    if (context.brandKit?.enabled) contextParts.push(`- Brand kit: enabled (${context.brandKit.primaryColor}, ${context.brandKit.secondaryColor}, ${context.brandKit.font})`);

    if (contextParts.length > 0) {
      parts.push(`\n## Additional Context\n${contextParts.join('\n')}`);
    }
  }

  return parts.join('\n');
}

function applyContextOverrides(plan: ExecutionPlan, context?: BrainContext, files?: FileInfo[]): void {
  // Ensure the model from context is respected
  if (context?.editStyle) {
    plan.edit.editStyle = context.editStyle as ExecutionPlan['edit']['editStyle'];
  }
  if (context?.captionTemplate) {
    plan.edit.subtitles = true;
    plan.edit.captionTemplate = context.captionTemplate;
  }
  if (context?.voiceoverStyle) {
    plan.generate.voiceoverStyle = context.voiceoverStyle as NonNullable<ExecutionPlan['generate']['voiceoverStyle']>;
  }
  if (context?.targetLanguage && plan.generate.aiDubbing) {
    plan.generate.aiDubbingTargetLanguage = context.targetLanguage;
  }
  if (context?.storyPageCount) {
    plan.templates.multiPageStories = true;
  }
  if (context?.brandKit?.enabled) {
    plan.templates.brandKit = true;
    plan.export.customTheme = true;
  }

  // Preserve document file path if present
  if (files) {
    const docFile = files.find((f) => /\.(pdf|docx?|txt|pptx?)$/i.test(f.name));
    if (docFile && plan.templates.sourceDocumentImport) {
      (plan.templates as Record<string, unknown>).sourceDocumentFile = docFile.path;
    }
  }
}

function buildFallbackPlan(
  prompt: string,
  files: FileInfo[],
  options: UserOptions,
  model: BRollModel,
  context?: BrainContext
): ExecutionPlan {
  // Rule-based fallback (same logic as Phase 1 but expanded)
  const hasFiles = files.length > 0;
  const isMultiCam = files.filter((f) => f.type.startsWith('video/')).length > 1;
  const isPromptOnly = !hasFiles;
  const hasDocFile = files.some((f) => /\.(pdf|docx?|txt|pptx?)$/i.test(f.name));

  const hasSubtitles = prompt.includes('כתוביות') || options.hebrewSubtitles;
  const isCinematic = prompt.includes('סינמטי') || prompt.includes('קולנועי') || options.cinematic;
  const isTikTok = prompt.includes('טיקטוק') || prompt.includes('ריל') || options.trendy;
  const isBrand = prompt.includes('תדמית') || prompt.includes('מותג');
  const isAd = prompt.includes('פרסומת') || prompt.includes('מודעה');
  const hasDubbing = prompt.includes('דיבוב') || prompt.includes('תרגום');
  const hasAvatar = prompt.includes('אווטאר') || prompt.includes('דובר דיגיטלי');
  const hasPDF = prompt.includes('PDF') || prompt.includes('מסמך') || hasDocFile;
  const hasStory = prompt.includes('סטורי') || prompt.includes('stories');
  const hasVoiceClone = prompt.includes('שכפול קול') || prompt.includes('הקול שלי');
  const hasVFX = prompt.includes('VFX') || prompt.includes('אפקטים') || prompt.includes('אש');
  const hasSoundEffects = prompt.includes('אפקטי סאונד') || prompt.includes('סאונד') || options.aiSoundEffects;
  const isEcommerce = prompt.includes('מכירה') || prompt.includes('מוצר') || prompt.includes('מחיר');
  const isEnergetic = prompt.includes('אנרגטי') || prompt.includes('מהיר') || prompt.includes('דינמי');
  const isCalm = prompt.includes('רגוע') || prompt.includes('שקט');
  const isProfessional = prompt.includes('מקצועי');
  const has4K = prompt.includes('4K') || prompt.includes('upscale') || prompt.includes('שדרוג');
  const hasKinetic = prompt.includes('טקסט מונפש') || prompt.includes('kinetic') || options.kineticTypography;
  const hasFaceSwap = prompt.includes('face swap') || prompt.includes('החלפת פנים');
  const hasLipsync = prompt.includes('lipsync') || prompt.includes('סנכרון שפתיים');
  const hasMusic = prompt.includes('מוזיקה');

  const plan: ExecutionPlan = {
    mode: isPromptOnly ? 'prompt-only' : 'raw',
    ingest: {
      transcribe: hasFiles,
      multiCamSync: isMultiCam,
      lipSyncVerify: isMultiCam,
      footageClassification: hasFiles,
      shotSelection: hasFiles,
      smartVariety: isMultiCam,
      speakerClassification: isMultiCam,
    },
    clean: {
      removeSilences: hasFiles,
      silenceThreshold: 0.5,
      removeFillerWords: hasFiles,
      fillerWordsList: ['אממ', 'אההה', 'כאילו', 'בעצם'],
      selectBestTake: hasFiles,
      removeShakyBRoll: hasFiles,
    },
    analyze: {
      hookDetection: isAd || isTikTok || true,
      hookCount: 3,
      quoteDetection: true,
      scenePlanning: isPromptOnly,
      brandVoice: isBrand,
      mediaIntelligence: hasFiles,
      viralityScore: options.viralityScore || isTikTok || isAd,
      aiScriptGenerator: isPromptOnly,
    },
    generate: {
      broll: true,
      brollModel: model,
      brollFromTranscript: hasFiles,
      videoToVideo: false,
      generativeExtend: false,
      aiBackground: options.aiBackground,
      aiVoiceover: isPromptOnly,
      voiceoverStyle: isPromptOnly ? 'narrator' : undefined,
      voiceClone: hasVoiceClone,
      talkingPhoto: false,
      thumbnail: true,
      stockFootageSearch: true,
      animateReplace: false,
      motionTransfer: false,
      faceSwap: hasFaceSwap,
      lipsync: hasLipsync,
      motionControl: false,
      cameraControls: false,
      multiShotSequences: false,
      firstLastFrame: false,
      musicGeneration: options.energeticMusic || options.calmMusic,
      musicMood: options.energeticMusic ? 'energetic' : options.calmMusic ? 'calm' : hasMusic ? 'energetic' : undefined,
      musicStemSeparation: options.musicSync,
      textToVFX: hasVFX,
      aiObjectAddReplace: false,
      visualDNA: false,
      multiModelComparison: false,
      automatedModelSelection: false,
      aiTwin: hasAvatar,
      aiDubbing: hasDubbing,
      aiDubbingTargetLanguage: hasDubbing ? 'en' : undefined,
      aiScriptGenerator: isPromptOnly,
      aiSoundEffects: hasSoundEffects,
    },
    edit: {
      autoAngleSwitching: isMultiCam,
      angleSwitchInterval: 4,
      shotSelection: hasFiles,
      smartVariety: isMultiCam,
      beatSyncCuts: isTikTok || isEnergetic || options.energyBoost,
      beatMode: isTikTok ? 'combined' : undefined,
      pacing: isTikTok || isEnergetic || isAd ? 'fast' : isCinematic || isBrand || isCalm ? 'calm' : 'normal',
      musicSync: options.musicSync || isTikTok || isEnergetic,
      vfxAuto: hasVFX,
      colorGrading: true,
      colorGradingStyle: isCinematic ? 'cinematic' : 'clean',
      colorMatchCameras: isMultiCam,
      skinToneCorrection: false,
      lightingEnhancement: true,
      subtitles: hasSubtitles,
      subtitleStyle: hasSubtitles ? 'animated' : undefined,
      subtitlePosition: 'smart',
      subtitleHighlightKeywords: hasSubtitles,
      lowerThirds: options.lowerThirds || isBrand || isProfessional,
      smartZooms: true,
      zoomStyle: isCinematic ? 'ken-burns' : isCalm ? 'subtle' : 'subtle',
      eyeContactCorrection: options.eyeContact,
      music: true,
      musicSource: 'library',
      autoDucking: true,
      enhanceSpeech: hasFiles || isProfessional,
      noiseReduction: hasFiles || isProfessional,
      presenterSeparation: false,
      backgroundBlur: options.backgroundBlur,
      objectMasking: false,
      upscaling: has4K,
      logoWatermark: false,
      cta: isAd || isEcommerce,
      effectsLibrary: false,
      chatBasedEditor: true,
      editStyle: isCinematic ? 'cinematic' : isTikTok ? 'trendy' : isEnergetic ? 'energetic' : undefined,
      kineticTypography: hasKinetic,
      photoMotion: false,
    },
    export: {
      formats: isTikTok ? ['9:16'] : prompt.includes('אינסטגרם') ? ['9:16', '1:1'] : ['16:9'],
      aiReframe: isTikTok || prompt.includes('אינסטגרם'),
      targetDuration: 'auto',
      generateThumbnail: true,
      highBitrate4K: has4K,
      customTheme: isBrand,
    },
    templates: {
      brandKit: isBrand,
      ecommerceTemplate: isEcommerce,
      digitalSocialTemplate: isTikTok,
      multiPageStories: hasStory,
      sourceDocumentImport: hasPDF,
      trendingSounds: options.trendingSounds || isTikTok,
    },
  };

  applyContextOverrides(plan, context, files);

  return plan;
}

export function countEnabledFeatures(plan: ExecutionPlan): number {
  let count = 0;
  const countBooleans = (obj: Record<string, unknown>) => {
    for (const value of Object.values(obj)) {
      if (value === true) count++;
    }
  };
  countBooleans(plan.ingest);
  countBooleans(plan.clean);
  countBooleans(plan.analyze);
  countBooleans(plan.generate);
  countBooleans(plan.edit);
  countBooleans(plan.export);
  countBooleans(plan.templates);
  return count;
}

/** Estimate cost based on enabled paid features */
export function estimateCost(plan: ExecutionPlan): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  // Claude API (Brain) — always used
  breakdown['Claude API (Brain)'] = 0.02;

  // Paid features cost estimates (in USD)
  if (plan.generate.voiceClone) breakdown['Voice Clone (ElevenLabs)'] = 0.30;
  if (plan.generate.aiVoiceover) breakdown['AI Voiceover (ElevenLabs)'] = 0.15;
  if (plan.generate.musicGeneration) breakdown['Music Generation (Suno)'] = 0.10;
  if (plan.generate.aiDubbing) breakdown['AI Dubbing (ElevenLabs)'] = 0.50;
  if (plan.generate.broll) breakdown['B-Roll Generation'] = plan.generate.stockFootageSearch ? 0.00 : 0.25;
  if (plan.generate.faceSwap) breakdown['Face Swap (KIE.ai)'] = 0.40;
  if (plan.generate.lipsync) breakdown['Lipsync (KIE.ai)'] = 0.35;
  if (plan.generate.motionTransfer) breakdown['Motion Transfer (KIE.ai)'] = 0.30;
  if (plan.generate.aiTwin) breakdown['AI Twin (KIE.ai)'] = 0.50;
  if (plan.generate.textToVFX) breakdown['Text to VFX (KIE.ai)'] = 0.20;
  if (plan.edit.upscaling) breakdown['4K Upscaling (KIE.ai)'] = 0.15;
  if (plan.generate.aiSoundEffects) breakdown['AI Sound Effects'] = 0.05;
  if (plan.generate.videoToVideo) breakdown['Video to Video (KIE.ai)'] = 0.25;

  // Free features
  if (plan.generate.stockFootageSearch) breakdown['Stock Footage (Pexels)'] = 0.00;
  if (plan.ingest.transcribe) breakdown['Transcription (Deepgram)'] = 0.01;

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { total: Math.round(total * 100) / 100, breakdown };
}
