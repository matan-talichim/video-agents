// server/services/masterBrain.ts
// Master Brain Assembly — ensures ALL editing knowledge reaches Claude in every API call.
// This is the single source of truth for the Brain's system prompt.

import {
  MURCH_RULES_PROMPT,
  MUSIC_SYNC_RULES_PROMPT,
  ZOOM_RULES_PROMPT,
  COLOR_RULES_PROMPT,
  SPEED_RAMP_PROMPT,
  PATTERN_INTERRUPT_PROMPT,
  EMOTIONAL_ARC_PROMPT,
  STRATEGIC_SILENCE_PROMPT,
  BROLL_PRECISION_PROMPT,
  CINEMATIC_PROMPTING_PROMPT,
  STYLE_TRANSFER_PROMPT,
  CHARACTER_CONSISTENCY_PROMPT,
  PLATFORM_CONTENT_STRATEGY_PROMPT,
  AI_BACKGROUND_PROMPT,
  AI_RELIGHTING_PROMPT,
  EDGE_CASE_RULES_PROMPT,
  AUDIO_CUT_RULES_PROMPT,
  CUT_TYPE_RULES_PROMPT,
  SOUND_DESIGN_RULES_PROMPT,
  AI_TRANSITIONS_PROMPT,
  LIP_SYNC_PROMPT,
  AI_MOTION_GRAPHICS_PROMPT,
  PLATFORM_RULES_PROMPT,
  POV_WALKTHROUGH_PROMPT,
  AD_LOCALIZATION_PROMPT,
} from './editingRules.js';

import { getMasterPromptContext } from './masterPromptOptimizer.js';
import { getBrainContext } from './editorBrain.js';

interface BrainRuleEntry {
  name: string;
  prompt: string | undefined;
}

// All rule sets that the Brain should know about
function getAllRules(): BrainRuleEntry[] {
  return [
    { name: 'Murch Rules (Rule of Six)', prompt: MURCH_RULES_PROMPT },
    { name: 'Audio Cuts (J-Cut / L-Cut)', prompt: AUDIO_CUT_RULES_PROMPT },
    { name: 'Cut Types', prompt: CUT_TYPE_RULES_PROMPT },
    { name: 'Music Sync', prompt: MUSIC_SYNC_RULES_PROMPT },
    { name: 'Sound Design', prompt: SOUND_DESIGN_RULES_PROMPT },
    { name: 'Smart Zoom', prompt: ZOOM_RULES_PROMPT },
    { name: 'Color Story', prompt: COLOR_RULES_PROMPT },
    { name: 'Speed Ramp', prompt: SPEED_RAMP_PROMPT },
    { name: 'Pattern Interrupts', prompt: PATTERN_INTERRUPT_PROMPT },
    { name: 'Emotional Arc', prompt: EMOTIONAL_ARC_PROMPT },
    { name: 'Strategic Silence', prompt: STRATEGIC_SILENCE_PROMPT },
    { name: 'B-Roll Precision', prompt: BROLL_PRECISION_PROMPT },
    { name: 'Cinematic Prompting', prompt: CINEMATIC_PROMPTING_PROMPT },
    { name: 'AI Transitions', prompt: AI_TRANSITIONS_PROMPT },
    { name: 'Style Transfer', prompt: STYLE_TRANSFER_PROMPT },
    { name: 'Character Consistency', prompt: CHARACTER_CONSISTENCY_PROMPT },
    { name: 'Lip Sync', prompt: LIP_SYNC_PROMPT },
    { name: 'AI Motion Graphics', prompt: AI_MOTION_GRAPHICS_PROMPT },
    { name: 'Platform Optimization', prompt: PLATFORM_RULES_PROMPT },
    { name: 'Platform Content Strategy', prompt: PLATFORM_CONTENT_STRATEGY_PROMPT },
    { name: 'AI Background', prompt: AI_BACKGROUND_PROMPT },
    { name: 'AI Relighting', prompt: AI_RELIGHTING_PROMPT },
    { name: 'POV Walkthrough', prompt: POV_WALKTHROUGH_PROMPT },
    { name: 'Ad Localization', prompt: AD_LOCALIZATION_PROMPT },
    { name: 'Edge Cases', prompt: EDGE_CASE_RULES_PROMPT },
  ];
}

// This is the MASTER system prompt that goes into every Brain planning call.
// It contains ALL editing knowledge — nothing is left out.
export function assembleMasterBrainPrompt(
  videoCategory: string,
  platform: string,
  paceMode: string,
  durationCategory: string,
  hasSpeech: boolean,
  speakerCount: number
): string {

  // Start with role definition
  let prompt = `You are the world's best video editor. You have 20+ years of experience editing for Netflix, Apple, Nike, and top real estate agencies. You edit in Hebrew (RTL) for the Israeli market.

You will receive a transcript and video analysis. Based on ALL the rules below, create a complete editing blueprint.

IMPORTANT: You must use ALL of these techniques — not just some. Every rule below should influence your editing decisions.

`;

  // === CORE EDITING RULES ===
  prompt += `\n=== EDITING RULES (Walter Murch) ===\n${MURCH_RULES_PROMPT}\n`;
  prompt += `\n=== AUDIO CUTS (J-Cut / L-Cut) ===\n${AUDIO_CUT_RULES_PROMPT}\n`;
  prompt += `\n=== CUT TYPES ===\n${CUT_TYPE_RULES_PROMPT}\n`;

  // === PACING & RHYTHM ===
  prompt += `\n=== EMOTIONAL ARC ===\n${EMOTIONAL_ARC_PROMPT}\n`;
  prompt += `\n=== SPEED RAMPING ===\n${SPEED_RAMP_PROMPT}\n`;
  prompt += `\n=== PATTERN INTERRUPTS ===\n${PATTERN_INTERRUPT_PROMPT}\n`;
  prompt += `\n=== STRATEGIC SILENCE ===\n${STRATEGIC_SILENCE_PROMPT}\n`;

  // === AUDIO ===
  prompt += `\n=== MUSIC SYNC ===\n${MUSIC_SYNC_RULES_PROMPT}\n`;
  prompt += `\n=== SOUND DESIGN ===\n${SOUND_DESIGN_RULES_PROMPT}\n`;

  // === VISUAL ===
  prompt += `\n=== SMART ZOOM ===\n${ZOOM_RULES_PROMPT}\n`;
  prompt += `\n=== COLOR STORY ===\n${COLOR_RULES_PROMPT}\n`;

  // === B-ROLL ===
  prompt += `\n=== B-ROLL WORD-LEVEL PRECISION ===\n${BROLL_PRECISION_PROMPT}\n`;
  prompt += `\n=== CINEMATIC B-ROLL PROMPTS ===\n${CINEMATIC_PROMPTING_PROMPT}\n`;
  prompt += `\n=== VISUAL DNA / STYLE TRANSFER ===\n${STYLE_TRANSFER_PROMPT}\n`;
  prompt += `\n=== CHARACTER CONSISTENCY ===\n${CHARACTER_CONSISTENCY_PROMPT}\n`;

  // === AI FEATURES ===
  prompt += `\n=== AI TRANSITIONS ===\n${AI_TRANSITIONS_PROMPT}\n`;
  prompt += `\n=== LIP SYNC ===\n${LIP_SYNC_PROMPT}\n`;
  prompt += `\n=== AI MOTION GRAPHICS ===\n${AI_MOTION_GRAPHICS_PROMPT}\n`;

  // === PLATFORM ===
  prompt += `\n=== PLATFORM OPTIMIZATION ===\n${PLATFORM_RULES_PROMPT}\n`;
  prompt += `\n=== PLATFORM CONTENT STRATEGY ===\n${PLATFORM_CONTENT_STRATEGY_PROMPT}\n`;

  // === SPECIALIZED ===
  prompt += `\n=== POV WALKTHROUGH ===\n${POV_WALKTHROUGH_PROMPT}\n`;
  prompt += `\n=== AD LOCALIZATION ===\n${AD_LOCALIZATION_PROMPT}\n`;

  // === EDGE CASES (conditionally included) ===
  if (durationCategory === 'too-short' || durationCategory === 'very-long' || !hasSpeech || speakerCount > 1) {
    prompt += `\n=== EDGE CASES ===\n${EDGE_CASE_RULES_PROMPT}\n`;
  }

  // === FOOTAGE QUALITY ===
  prompt += `\n=== BACKGROUND QUALITY ===\n${AI_BACKGROUND_PROMPT}\n`;
  prompt += `\n=== LIGHTING QUALITY ===\n${AI_RELIGHTING_PROMPT}\n`;

  // === LEARNING FROM PAST PROJECTS ===
  const masterContext = getMasterPromptContext();
  if (masterContext) {
    prompt += `\n=== LEARNINGS FROM PAST PROJECTS ===\n${masterContext}\n`;
  }

  const brainContext = getBrainContext(videoCategory, platform);
  if (brainContext) {
    prompt += `\n=== SIMILAR PAST PROJECTS ===\n${brainContext}\n`;
  }

  // === CURRENT VIDEO CONTEXT ===
  prompt += `\n=== CURRENT VIDEO CONTEXT ===
Category: ${videoCategory}
Platform: ${platform}
Pace mode: ${paceMode}
Duration category: ${durationCategory}
Has speech: ${hasSpeech}
Speaker count: ${speakerCount}
Language: Hebrew (RTL)
`;

  // === FINAL INSTRUCTION ===
  prompt += `
=== YOUR TASK ===
Based on ALL the rules above, create a COMPLETE editing blueprint. Include:
1. cuts[] — every cut point with Murch score and reason
2. zooms[] — every zoom with timing and intensity
3. speedRamps[] — slow-mo and speed-up moments
4. patternInterrupts[] — attention resets every 12-18 seconds
5. emotionalArc[] — energy level per section
6. protectedSilences[] — pauses to KEEP
7. brollInsertions[] — B-Roll at trigger words with cinematic prompts
8. soundDesign.sfx[] — sound effects placements
9. soundDesign.musicDucking[] — music volume per section
10. backgroundPlan — blur/replace recommendation
11. lightingPlan — exposure/color fixes
12. colorStory — color grading approach

Return VALID JSON with all 12 categories. Do NOT skip any category.
`;

  // Size check
  const promptLength = prompt.length;
  const estimatedTokens = Math.round(promptLength / 4);
  const categoryCount = getAllRules().filter(r => r.prompt && prompt.includes(r.prompt.slice(0, 50))).length;

  if (estimatedTokens > 8000) {
    console.warn(`[Brain] Master prompt is ${estimatedTokens} tokens — consider splitting into 2 calls`);
  }

  console.log(`[Brain] Master prompt assembled: ${promptLength} chars (~${estimatedTokens} tokens), ${categoryCount} rule categories`);

  return prompt;
}

// Count how many rules are included and verify none are undefined
export function countBrainRules(): { totalPrompts: number; totalCharacters: number; categories: string[]; missing: string[] } {
  const rules = getAllRules();

  const defined = rules.filter(r => r.prompt && r.prompt.length > 0);
  const missing = rules.filter(r => !r.prompt || r.prompt.length === 0);
  const totalCharacters = defined.reduce((sum, r) => sum + (r.prompt?.length || 0), 0);

  console.log('\n=== Brain Knowledge Base ===');
  for (const r of rules) {
    const status = r.prompt && r.prompt.length > 0 ? '✅' : '❌';
    console.log(`${status} ${r.name}: ${r.prompt?.length || 0} chars`);
  }
  console.log(`\nTotal: ${defined.length}/${rules.length} rule sets, ${totalCharacters} characters (~${Math.round(totalCharacters / 4)} tokens)`);
  if (missing.length > 0) {
    console.warn(`Missing: ${missing.map(m => m.name).join(', ')}`);
  }
  console.log('============================\n');

  return {
    totalPrompts: defined.length,
    totalCharacters,
    categories: defined.map(r => r.name),
    missing: missing.map(r => r.name),
  };
}
