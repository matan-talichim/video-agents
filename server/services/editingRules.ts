// server/services/editingRules.ts
// Professional editing rules based on film theory and modern social media best practices.
// Imported by contentAnalyzer and edit agent.

// ============================================================
// CATEGORY 1: WALTER MURCH'S RULE OF SIX
// ============================================================
export const MURCH_RULES_PROMPT = `For every cut you plan, evaluate against Walter Murch's Rule of Six:
1. EMOTION (51%): Will this cut make the viewer FEEL something? Emotional impact is more important than technical perfection.
2. STORY (23%): Does this cut move the narrative forward? If not, the segment should be removed.
3. RHYTHM (10%): Does the pacing feel natural? Vary the rhythm like music: verse (calm), chorus (energetic), bridge (transition).
4. EYE TRACE (7%): Where is the viewer looking? If the speaker is on the right, B-Roll subject should be on the right too.
5. COMPOSITION (5%): Do the shots look good together? Similar brightness and framing between consecutive shots.
6. SPATIAL CONTINUITY (4%): Does the space make sense? Exit frame left = enter frame left.

Rate each planned cut 1-10 on emotional impact. Cuts rated below 5 should be reconsidered.`;

// ============================================================
// CATEGORY 2: J-CUT AND L-CUT RULES
// ============================================================
export const AUDIO_CUT_RULES_PROMPT = `Apply J-Cuts and L-Cuts for professional transitions:

L-CUT (use for EVERY B-Roll insertion):
When cutting to B-Roll, the speaker's AUDIO continues playing while the VIDEO switches to B-Roll.
- Speaker says "our building is 5 minutes from the beach"
- VIDEO cuts to beach footage at "5 minutes from the beach"
- Speaker's VOICE continues over the beach footage

J-CUT (use for scene transitions):
The AUDIO of the next scene starts 0.5-1 second BEFORE the video changes.
Creates anticipation and smooth flow.

NEVER do a "hard cut" where audio and video switch at the exact same frame when going to B-Roll. ALWAYS overlap by at least 0.5 seconds.

For each B-Roll insertion, specify:
- audioOverlapAfter: seconds the speaker audio continues after video switches (L-cut, usually 0.5-1.5s)`;

// ============================================================
// CATEGORY 6: CUT TYPES
// ============================================================
export const CUT_TYPE_RULES_PROMPT = `Use the RIGHT type of cut for each situation:

HARD CUT: Between sentences from same speaker (with fake zoom technique). For fast-paced energetic sections.
L-CUT TO B-ROLL: When speaker mentions something visual. To cover a jump cut. To add visual variety.
CROSSFADE (0.5-1s blend): Between major sections/topics. To show passage of time. For emotional moments.
SMASH CUT (instant from calm to intense): Hook moment. Surprise reveals. Comedy timing.
MATCH CUT (same shape/movement): Logo shape to similar B-Roll shape. Rare but powerful.
CUTAWAY (brief 1.5-3s shot): Speaker says "our view" -> cutaway to the view. Always with L-cut audio.
MONTAGE (rapid 1-2s clips): For summarizing features. Beat-synced. Great for "what we offer" sections.

For each cut, specify: { "at": X, "type": "hard|lcutBroll|crossfade|smashCut|cutaway|montage", "reason": "..." }`;

// Combined prompt for Part 1
export const EDITING_RULES_PART1 = `${MURCH_RULES_PROMPT}\n\n${AUDIO_CUT_RULES_PROMPT}\n\n${CUT_TYPE_RULES_PROMPT}`;
