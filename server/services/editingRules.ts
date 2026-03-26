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

// ============================================================
// CATEGORY 3: ADVANCED MUSIC SYNC
// ============================================================
export const MUSIC_SYNC_RULES_PROMPT = `Music must be PART of the edit, not just background noise:

BEAT-ALIGNED CUTS:
- Every major cut (scene change, B-Roll switch) should land on a music beat
- Minor cuts (zooms, text) can fall on off-beats for variety

ENERGY MATCHING:
- Music build-up → gradually increase cut frequency
- Music drops/choruses → fastest cuts, most dynamic B-Roll
- Music quiet sections → longer shots, emotional moments
- Music outros → slow dissolves, final CTA

AUDIO DUCKING RULES:
- Speaker talks: music at 12-15% volume
- Speaker pauses (>1.5s): music rises to 35-40%
- Between sections: music at 50-60%
- Intro (before speaker): music at 70-80%
- Outro (after speaker stops): music at 80-100%
- All volume changes: 0.3-second fades (never instant)

Return musicSync plan:
{
  "ducking": [
    { "start": 0, "end": 3, "volume": -6, "reason": "intro — music prominent" },
    { "start": 3, "end": 45, "volume": -20, "reason": "speaking — music low" },
    { "start": 45, "end": 50, "volume": -6, "reason": "outro — music prominent" }
  ],
  "beatAlignedCuts": [3.2, 6.4, 9.6, 12.8]
}`;

// ============================================================
// CATEGORY 7: SOUND DESIGN
// ============================================================
export const SOUND_DESIGN_RULES_PROMPT = `Professional sound design makes amateur footage feel Hollywood:

ROOM TONE:
- NEVER leave absolute silence (0 audio) in the video
- Extract 2-3 seconds of "silence" from the recording = room tone
- Layer room tone under all audio cuts to prevent jarring silence gaps

AUDIO CROSSFADES:
- Every audio cut must have a crossfade
- Minimum: 50ms (prevents clicks/pops)
- Standard: 100-200ms for speech
- Long: 500ms-1s for music transitions
- NEVER hard-cut audio — it creates clicks

VOICE PROCESSING:
- High-pass filter at 80Hz (removes rumble, AC noise)
- Gentle compression (3:1 ratio) to even out loud/quiet
- Normalize to -14 LUFS (social media standard)

SFX PLACEMENT:
- "whoosh" (0.2-0.4s): on cuts to B-Roll, on text sliding in
- "ding" (0.1-0.3s): when keyword highlights appear in subtitles
- "rise" (1-3s): building to the most important point
- "impact" (0.2-0.5s): on hook moment, price reveals, dramatic statements
- "click" (0.05-0.1s): on lower third appearances, CTA buttons
- MAX density: 1 SFX per 4-5 seconds. More = annoying.

SFX VOLUMES:
- whoosh: -15dB
- ding: -18dB
- rise: -12dB
- impact: -10dB
- click: -20dB

Return soundDesign plan:
{
  "roomToneSource": { "start": 5.2, "end": 7.5 },
  "voiceProcessing": { "highPass": 80, "compression": true, "normalize": -14 },
  "sfx": [
    { "type": "whoosh", "at": 15.5, "volume": -15, "reason": "cut to B-Roll" },
    { "type": "rise", "at": 28.0, "duration": 2.0, "volume": -12, "reason": "building to key point" },
    { "type": "impact", "at": 30.0, "volume": -10, "reason": "main benefit reveal" }
  ]
}`;

// Combined prompt for Part 2
export const EDITING_RULES_PART2 = `${MUSIC_SYNC_RULES_PROMPT}\n\n${SOUND_DESIGN_RULES_PROMPT}`;
