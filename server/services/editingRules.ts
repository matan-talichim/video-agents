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

// ============================================================
// CATEGORY 4: SMART ZOOM RULES
// ============================================================
export const ZOOM_RULES_PROMPT = `Every zoom must have a PURPOSE. Never zoom randomly.

ZOOM IN (slow 1-2s, to 115-130%):
- Speaker makes emotional statement → zoom to face (empathy)
- Speaker reveals key number/statistic → zoom to emphasize
- Speaker makes eye contact → zoom for intimacy
- Before CTA → zoom for urgency

ZOOM OUT (slow 1-2s, back to 100%):
- Speaker transitions to new topic → zoom out = "new chapter"
- After intense moment → zoom out = "breathing room"

FAKE CUT TECHNIQUE (critical for talking-head):
- Instead of visible jump cut, zoom in 15% at the cut point
- Viewer perceives it as camera angle change, not a cut
- Alternate: 115% for segment A, 100% for B, 115% for C
- Creates illusion of multi-camera shoot from single camera

KEN BURNS (for still images):
- Start at 110%, slowly pan to 100% over 4-5 seconds
- OR start at 100%, slowly zoom to 108% over 4-5 seconds
- Always move toward the subject of interest

ZOOM FREQUENCY:
- Talking head: zoom change every 5-8 seconds
- Interview: zoom on answer starts, zoom out on questions
- Product demo: zoom to product for features, out for overview
- Tour: NO artificial zooms — camera already moving

Return zooms: [{ "timestamp": 15.5, "zoomFrom": 1.0, "zoomTo": 1.15, "duration": 1.5, "easing": "ease-in-out", "reason": "key statistic — emphasize" }]`;

// ============================================================
// CATEGORY 5: COLOR STORY
// ============================================================
export const COLOR_RULES_PROMPT = `Color grading must tell a story and match between shots:

COLOR MATCHING:
- When cutting speaker → B-Roll → speaker, color temperature MUST match
- If speaker shot is warm, B-Roll must be graded to match
- Mark each segment's color temperature: warm/neutral/cool
- Plan color correction per segment, not one LUT for entire video

COLOR STORY (subtle arc):
- Opening: slightly desaturated or cool → "normal world"
- Build-up: gradually warming → "getting interesting"
- Peak/climax: full saturation, warm → "maximum impact"
- CTA/conclusion: bright, clean → "positive feeling"
- This should be SUBTLE — viewer shouldn't notice consciously

SKIN TONE PROTECTION:
- When applying any color grade, skin tones must remain natural
- If skin looks orange, green, or grey → the grade is wrong

MOOD-BASED GRADING:
- Luxury/real estate: teal shadows + warm highlights (orange & teal)
- Corporate/professional: neutral with slight warmth, clean whites
- Energetic/social: high contrast, vibrant saturation, punchy
- Testimonial/emotional: soft, warm, gentle contrast

Return colorPlan: [{
  "segment": { "start": 0, "end": 15 },
  "temperature": "warm",
  "saturation": "normal",
  "contrast": "medium",
  "lut": "cinematic|bright|moody|vintage|none",
  "skinToneProtection": true,
  "matchPrevious": true
}]`;

// Combined prompt for Part 3
export const EDITING_RULES_PART3 = `${ZOOM_RULES_PROMPT}\n\n${COLOR_RULES_PROMPT}`;

// ============================================================
// CATEGORY 8: PLATFORM OPTIMIZATION
// ============================================================
export const PLATFORM_RULES_PROMPT = `Optimize the edit for the TARGET PLATFORM:

THE 3-SECOND RULE (all platforms):
- Viewer decides to watch or scroll in 3 SECONDS
- First 3 seconds MUST contain: movement, text hook, surprise, or bold statement
- NEVER start with a logo, "hi my name is", or silence
- If no good 3-second hook exists → CREATE one with text overlay

YOUTUBE (16:9):
- Hook in first 3 seconds, can build — viewers more patient
- Cut frequency: 4-8 seconds per shot
- Audio quality matters MORE than video quality
- Safe zone: text not in bottom 15% (YouTube UI)

INSTAGRAM REELS (9:16):
- Hook in first 1.5 seconds (faster than YouTube)
- Cut frequency: 2-4 seconds (fast!)
- Text centered vertically (top/bottom 20% hidden by UI)
- Captions MANDATORY (80% watch without sound)
- End with loop potential — last frame connects to first

TIKTOK (9:16):
- Hook in first 1 SECOND (fastest platform)
- Cut frequency: 1.5-3 seconds (very fast!)
- Text hooks on screen from frame 1
- Right side 15% covered by like/comment buttons
- Loop: last word connects to first visual

LINKEDIN (16:9 or 1:1):
- Professional tone, less flashy
- Slower pacing: 5-10 seconds per shot
- Caption-first (many watch at work without sound)

PACING INTELLIGENCE:
- Average shot length in 2025: 2.5 seconds
- NEVER stay on one shot >8 seconds without change (zoom, B-Roll, or cut)
- Vary shot length: 1s, 3s, 2s, 5s, 2s — NOT 3s, 3s, 3s (monotonous)
- Fast sections should ACCELERATE, not stay constant
- After fast section, give 1 slow moment to "breathe"

THE "INVISIBLE EDIT" PRINCIPLE:
- Best edit = one the viewer doesn't notice
- Every cut should feel natural and motivated
- Cuts on movement hide the edit (gestures, head turns)
- Cuts during blinks feel the most natural (Murch's blink theory)

Return platformOptimization:
{
  "platform": "instagram-reels",
  "hookStrategy": { "type": "text-hook", "text": "...", "duration": 1.5 },
  "safeZone": { "top": 15, "bottom": 15, "right": 15 },
  "idealCutFrequency": 3,
  "captionPosition": "center-vertical",
  "loopable": true,
  "endStrategy": "loop|cta|question"
}`;

// ============================================================
// CATEGORY 9: SPEED RAMPING
// ============================================================
export const SPEED_RAMP_PROMPT = `Plan speed ramps for dramatic effect:

WHEN TO SLOW DOWN (50-75% speed):
- Speaker says something emotional or important → slow down that 1-2 seconds
- Dramatic reveal moment → slow to emphasize
- A gesture or movement that deserves attention
- Right before a cut to B-Roll → slight slow-mo creates elegance
- Duration: 0.5-2 seconds of slow motion max

WHEN TO SPEED UP (150-300% speed):
- Dead space between sentences (instead of cutting, speed up)
- Walking/moving between locations → speed up transition
- Repetitive actions that need to be shown but are boring at normal speed
- Setup moments before the interesting part
- Duration: 1-5 seconds of fast motion

SPEED RAMP TRANSITIONS:
- Never jump instantly from 100% to 50% — use a 0.3s ramp (gradual curve)
- Pattern: normal → slight slow → normal → fast → normal (creates rhythm)
- Sync speed changes to music beats: slow on downbeat, speed up on upbeat

For each speed ramp, return:
{
  "speedRamps": [
    { "start": 15.0, "end": 16.5, "speed": 0.6, "reason": "key emotional statement — slow for impact" },
    { "start": 22.0, "end": 24.0, "speed": 2.0, "reason": "dead air between points — speed through" },
    { "start": 30.0, "end": 31.0, "speed": 0.5, "reason": "dramatic pause before reveal" }
  ]
}

MAX speed ramps per video: 3-5 for 30s video, 5-8 for 60s video. More = gimmicky.`;

// ============================================================
// CATEGORY 10: PATTERN INTERRUPTS
// ============================================================
export const PATTERN_INTERRUPT_PROMPT = `Plan pattern interrupts every 12-18 seconds to reset viewer attention.

A pattern interrupt is an UNEXPECTED visual or audio change that resets the viewer's attention clock. Without interrupts, viewers enter "autopilot" and stop paying attention.

PATTERN INTERRUPT TYPES (use variety — never repeat the same type twice in a row):

1. ZOOM PUNCH — sudden quick zoom to 120% for 0.5s then back (with whoosh SFX)
2. TEXT POP — bold kinetic text with key word appears and disappears (0.8s)
3. B-ROLL FLASH — 1.5-second B-Roll cutaway then back to speaker
4. COLOR FLASH — brief flash to white for 2 frames then back (like camera flash)
5. SHAKE — subtle camera shake effect for 0.5s (simulates emphasis)
6. SFX HIT — audio impact/ding without visual change (resets attention via audio)
7. SPEED CHANGE — brief 0.5s slow-mo then back to normal
8. GRAPHIC OVERLAY — emoji, arrow, or highlight circle appears briefly (1s)
9. MUSIC CHANGE — brief volume boost or instrument change in background
10. SCALE BOUNCE — element on screen briefly scales up 110% then back (like a heartbeat)

RULES:
- First interrupt at 8-12 seconds (after hook settles)
- Then every 12-18 seconds throughout the video
- Never same type twice in a row
- Intensity matches content energy (subtle for calm, bold for energetic)
- Each interrupt must be MOTIVATED — connected to what speaker is saying
- Max 2 strong interrupts in a row, then 1 subtle one (breathing room)
- Don't interrupt during B-Roll sections (they ARE the visual change)

For the plan, return:
{
  "patternInterrupts": [
    { "at": 10, "type": "text-pop", "text": "5 דקות", "duration": 0.8, "intensity": "medium", "reason": "speaker says key number" },
    { "at": 22, "type": "zoom-punch", "zoomLevel": 1.2, "duration": 0.5, "intensity": "strong", "reason": "emotional statement" },
    { "at": 35, "type": "sfx-hit", "sfxType": "ding", "duration": 0.3, "intensity": "subtle", "reason": "attention reset before CTA buildup" }
  ]
}`;

// ============================================================
// MASTER EDITING PROMPT (all rules combined)
// ============================================================
export const MASTER_EDITING_PROMPT = [
  EDITING_RULES_PART1,     // Murch + J-Cut/L-Cut + Cut Types
  EDITING_RULES_PART2,     // Music Sync + Sound Design
  EDITING_RULES_PART3,     // Zoom + Color
  PLATFORM_RULES_PROMPT,   // Platform optimization
  SPEED_RAMP_PROMPT,       // Speed ramping
  PATTERN_INTERRUPT_PROMPT // Pattern interrupts
].join('\n\n');

// ============================================================
// EDITING BLUEPRINT INTERFACE
// ============================================================
export interface EditingBlueprint {
  cuts: Array<{
    at: number;
    type: 'hard' | 'lcutBroll' | 'crossfade' | 'smashCut' | 'cutaway' | 'montage';
    murchScore: number;
    audioOverlapAfter?: number;
    fakeZoom?: boolean;
    duration?: number;
    reason: string;
  }>;
  zooms: Array<{
    timestamp: number;
    zoomFrom: number;
    zoomTo: number;
    duration: number;
    easing: string;
    reason: string;
  }>;
  brollInsertions: Array<{
    at: number;
    duration: number;
    audioOverlap: number;
    cutType: string;
    prompt: string;
  }>;
  musicSync: {
    ducking: Array<{ start: number; end: number; volume: number; reason: string }>;
    beatAlignedCuts: number[];
  };
  soundDesign: {
    sfx: Array<{ type: string; at: number; volume: number; reason: string; duration?: number }>;
    roomTone: { start: number; end: number };
    voiceProcessing: { highPass: number; compression: boolean; normalize: number };
  };
  colorPlan: Array<{
    segment: { start: number; end: number };
    temperature: string;
    lut: string;
    skinToneProtection: boolean;
  }>;
  platformOptimization: {
    platform: string;
    hookStrategy: { type: string; text: string; duration: number };
    safeZone: { top: number; bottom: number; right: number };
    idealCutFrequency: number;
    captionPosition: string;
    loopable: boolean;
    endStrategy: string;
  };
  speedRamps?: Array<{
    start: number;
    end: number;
    speed: number;    // 0.5 = half speed, 2.0 = double speed
    reason: string;
  }>;
  patternInterrupts?: Array<{
    at: number;
    type: 'zoom-punch' | 'text-pop' | 'broll-flash' | 'color-flash' | 'shake' | 'sfx-hit' | 'speed-change' | 'graphic-overlay' | 'music-change' | 'scale-bounce';
    duration: number;
    intensity: 'subtle' | 'medium' | 'strong';
    reason: string;
    text?: string;
    zoomLevel?: number;
    sfxType?: string;
  }>;
  murchAverageScore: number;
}
