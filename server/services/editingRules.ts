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
// CATEGORY 11: EMOTIONAL ARC ROLLERCOASTER
// ============================================================
export const EMOTIONAL_ARC_PROMPT = `Design the video's emotional arc like a rollercoaster.

A flat emotional line = boring video. Viewers need CONTRAST between high and low energy.

THE IDEAL EMOTIONAL ARC:

Energy
10 |         ★PEAK
 9 |  ★HOOK
 8 |
 7 |                  ★CTA
 6 |★START    ★BUILD
 5 |
 4 |      ★DIP
 3 |            ★BREATHE
 1 |________________________________
   0s   3s   8s  20s  25s  35s  42s

PHASES:
1. START (0-1s): Energy 6 — establish context, medium pace
2. HOOK (1-3s): Energy 9 — grab attention, fast cuts, bold text
3. DIP (3-8s): Energy 4 — let them settle, single speaker shot, context
4. BUILD (8-20s): Energy 6→7 — gradually rising, facts/benefits, mix of speaker and B-Roll
5. BREATHE (20-25s): Energy 3 — brief valley, moment of calm before peak, emotional pause
6. PEAK (25-35s): Energy 10 — strongest point, social proof, wow moment, fast montage
7. RESOLVE (35-end): Energy 7 — confident CTA, clear action, not frantic

EDITING STYLE BY ENERGY LEVEL:
- Energy 1-3 (low): shots 4-6s long, soft music 15%, no SFX, gentle slow zooms
- Energy 4-5 (medium-low): shots 3-4s, music 20%, subtle SFX, normal zooms
- Energy 6-7 (medium-high): shots 2-3s, music 25%, occasional SFX, active zooms
- Energy 8-9 (high): shots 1.5-2.5s, music 30%, frequent SFX, zoom punches, B-Roll montage
- Energy 10 (maximum): shots 1-2s, music 35%, heavy SFX, rapid cuts, kinetic text burst

CRITICAL RULE: The energy must NEVER stay flat for more than 10 seconds. There must always be movement — either rising or falling. Flat = boring.

Return:
{
  "emotionalArc": [
    { "start": 0, "end": 1, "energy": 6, "phase": "start", "editStyle": "establishing — medium shot, gentle music fade-in" },
    { "start": 1, "end": 3, "energy": 9, "phase": "hook", "editStyle": "fast cuts, bold text overlay, SFX impact" },
    { "start": 3, "end": 8, "energy": 4, "phase": "dip", "editStyle": "single speaker shot, soft music, no SFX" },
    { "start": 8, "end": 20, "energy": 7, "phase": "build", "editStyle": "mix speaker and B-Roll, rising music, gradual zoom-ins" },
    { "start": 20, "end": 25, "energy": 3, "phase": "breathe", "editStyle": "slow shot, emotional pause, music drops" },
    { "start": 25, "end": 35, "energy": 10, "phase": "peak", "editStyle": "montage, rapid cuts, SFX hits, kinetic text burst, music climax" },
    { "start": 35, "end": 42, "energy": 7, "phase": "resolve", "editStyle": "confident single shot, CTA overlay, music resolves" }
  ]
}`;

// ============================================================
// CATEGORY 12: STRATEGIC SILENCE PROTECTION
// ============================================================
export const STRATEGIC_SILENCE_PROMPT = `Not all silence should be removed. Strategic pauses are powerful selling tools.

SILENCE TO REMOVE (always cut):
- "Umm", "ahh", "ehh" hesitation pauses → always remove
- Dead air at start/end of sentences → trim
- Long pauses from losing train of thought → cut
- Breathing pauses mid-sentence → trim to 0.2s max
- False starts → remove completely

SILENCE TO KEEP (mark as "protected"):

1. IMPACT PAUSE — after a powerful statement:
   "רק 5 דירות נותרו." [0.8s pause] "תתקשרו עכשיו."
   The pause lets the statement sink in.
   Duration: 0.5-1.0 seconds.

2. ANTICIPATION PAUSE — before a reveal:
   [0.5s pause] "המחיר? ₪1,890,000."
   The pause creates tension before the answer.
   Duration: 0.3-0.7 seconds.

3. RHETORICAL PAUSE — after a question:
   "מה הייתם עושים עם דירה כזו?" [1.0s pause]
   Lets the viewer mentally answer.
   Duration: 0.7-1.2 seconds.

4. EMOTIONAL PAUSE — speaker collects themselves:
   Speaker pauses from genuine emotion → shows authenticity.
   Duration: keep as-is (don't trim at all).

5. COMEDIC PAUSE — timing for humor:
   Setup... [pause]... punchline.
   The pause IS the comedy.
   Duration: 0.5-1.5 seconds depending on setup.

When scoring segments in content selection, detect and mark protected silences:
{
  "protectedSilences": [
    { "at": 25.3, "duration": 0.8, "type": "impact", "reason": "dramatic pause after key statement — creates impact" },
    { "at": 40.1, "duration": 0.5, "type": "anticipation", "reason": "pause before price reveal — builds tension" },
    { "at": 52.0, "duration": 1.0, "type": "rhetorical", "reason": "pause after question — lets viewer think" }
  ]
}`;

// ============================================================
// CATEGORY 13: B-ROLL TIMING PRECISION
// ============================================================
export const BROLL_PRECISION_PROMPT = `B-Roll must appear at the EXACT trigger word, not approximately.

BAD TIMING:
Speaker: "Our project is located 5 minutes from the beautiful beach of Haifa"
B-Roll of beach appears 2 seconds AFTER the word "beach" → feels disconnected

GOOD TIMING:
Speaker: "Our project is located 5 minutes from the beautiful beach of Haifa"
B-Roll of beach starts 0.3 seconds BEFORE the word "beach" → feels intentional and professional

TRIGGER WORD DETECTION RULES:

1. VISUAL NOUNS — words that can be shown:
   "beach", "building", "view", "kitchen", "garden", "street", "park", "sunset", "pool"
   → B-Roll shows what the word describes

2. NUMBERS that need emphasis:
   "5 minutes", "3 bedrooms", "₪1.89M", "120 sqm"
   → B-Roll of the related visual + number as kinetic text overlay

3. EMOTIONAL WORDS that benefit from visual support:
   "dream home", "perfect location", "stunning view", "unique opportunity"
   → B-Roll amplifies the emotion (aerial shots, golden hour, cinematic)

4. COMPARISON WORDS:
   "before/after", "old/new", "with/without"
   → Split screen or sequential comparison B-Roll

TIMING RULES:
- VIDEO starts: 0.3 seconds BEFORE the trigger word (anticipation — brain processes visual first)
- VIDEO continues: 2-4 seconds after trigger word
- AUDIO: speaker's voice continues throughout (L-cut — NEVER cut the audio)
- If speaker says 2 visual words in one sentence → B-Roll for the MOST visual word only (not both)
- Minimum gap between B-Roll insertions: 4 seconds (don't show B-Roll back-to-back)

For each B-Roll insertion, use word-level timestamps from the transcript:
{
  "brollInsertions": [
    {
      "triggerWord": "חוף",
      "triggerWordTimestamp": 15.3,
      "videoStartTime": 15.0,
      "videoEndTime": 18.0,
      "speakerAudioContinues": true,
      "cutType": "lcut",
      "audioOverlapAfter": 1.0,
      "brollPrompt": "aerial view of Haifa beach, cinematic, golden hour, 4K",
      "reason": "speaker mentions beach — show it at the exact moment"
    },
    {
      "triggerWord": "3 חדרים",
      "triggerWordTimestamp": 22.7,
      "videoStartTime": 22.4,
      "videoEndTime": 25.0,
      "speakerAudioContinues": true,
      "cutType": "lcut",
      "audioOverlapAfter": 0.8,
      "brollPrompt": "modern bedroom interior, bright, spacious, Israeli style apartment",
      "kineticTextOverlay": "3 חדרי שינה",
      "reason": "speaker says number of bedrooms — show bedroom + number overlay"
    }
  ]
}`;

// ============================================================
// CATEGORY 14: CINEMATIC B-ROLL PROMPTING
// ============================================================
export const CINEMATIC_PROMPTING_PROMPT = `You write B-Roll prompts like a Hollywood cinematographer, not like a Google search.

IMAGE-TO-VIDEO WORKFLOW (preferred over text-to-video):
Professional AI filmmakers prefer image-to-video because it gives:
- Stronger character/scene consistency
- More control over composition and framing
- Better results overall
When generating B-Roll, FIRST describe an ideal still frame (for image generation), THEN describe the motion (for video generation).

CINEMATIC PROMPT STRUCTURE (use for EVERY B-Roll prompt):

1. CAMERA MOVEMENT (how the camera moves):
   - "Slow dolly forward" / "Smooth tracking shot" / "Steady push-in"
   - "Aerial drone descending" / "Crane shot rising"
   - "Handheld following subject" / "Static locked-off tripod"
   - "Slow pan left to right" / "Gentle tilt up revealing"
   - "FPV drone flying through" / "Orbiting around subject"

2. SHOT TYPE (how close):
   - "Wide establishing shot" / "Medium shot" / "Close-up detail"
   - "Extreme close-up on texture" / "Bird's eye view"
   - "Over-the-shoulder" / "Low angle looking up"

3. LIGHTING (mood through light):
   - "Golden hour warm sunlight" / "Soft overcast diffused light"
   - "Dramatic side lighting with deep shadows"
   - "Clean bright studio lighting" / "Moody blue hour twilight"
   - "Backlit silhouette" / "Neon city lights at night"

4. DEPTH OF FIELD:
   - "Shallow depth of field, background bokeh" (for focus on subject)
   - "Deep focus, everything sharp" (for landscapes/architecture)
   - "Rack focus from foreground to background" (for reveals)

5. STYLE/MOOD:
   - "Cinematic, film-like, 24fps look"
   - "Documentary style, natural, authentic"
   - "Commercial polish, clean, bright"
   - "Moody, atmospheric, dramatic"
   - "Luxury, elegant, premium feel"

6. NEGATIVE PROMPTS (always include):
   - "no text, no watermark, no blurry, no distortion, no shaky camera"
   - "no artificial looking, no CGI feel, no low quality"

PROMPT TEMPLATES BY CATEGORY:

REAL ESTATE — EXTERIOR:
"Slow aerial drone shot descending toward [building], golden hour warm sunlight, cinematic 4K, shallow depth of field on the building with city bokeh in background, luxury real estate commercial style, smooth camera movement. No text, no watermark."

REAL ESTATE — INTERIOR:
"Smooth dolly forward through [room type], bright natural window light, wide angle lens, clean modern interior, real estate showcase style, warm color temperature, deep focus showing full room. No blurry, no distortion."

REAL ESTATE — LOCATION/LIFESTYLE:
"Cinematic tracking shot of [location feature], golden hour, people enjoying the area naturally, shallow depth of field, documentary style with commercial polish, warm tones. No staged feeling."

PRODUCT — CLOSE-UP:
"Slow orbit around [product] on clean surface, studio lighting with soft shadows, extreme shallow depth of field, macro detail visible, luxury commercial style, smooth 360 rotation. No background clutter."

TESTIMONIAL — B-ROLL:
"Medium shot of [activity described by speaker], natural lighting, documentary style, authentic feeling, handheld with slight movement for realism, warm color grading. No overly polished."

NATURE/LANDSCAPE:
"Wide establishing shot of [landscape], drone ascending slowly, golden hour or blue hour, cinematic color grading, deep focus, epic scale, atmospheric haze in distance. No text overlay."

URBAN/CITY:
"Tracking shot through [street/area], dynamic movement, night city lights or golden hour, shallow depth of field with bokeh lights, cinematic mood, smooth steadicam movement. No shaky."

For each B-Roll the Brain generates, transform the basic concept into a cinematic prompt:

BEFORE (bad): "beach in Haifa"
AFTER (good): "Slow aerial drone shot descending toward Haifa coastline, golden hour warm sunlight casting long shadows on the sand, turquoise Mediterranean water, cinematic 4K quality, shallow depth of field with city skyline soft in background, luxury real estate commercial style. No text, no watermark, no blurry."

BEFORE (bad): "modern kitchen"
AFTER (good): "Smooth dolly forward into spacious modern kitchen, bright natural light from large windows, marble countertops with soft reflections, wide angle showing full space, clean lines, real estate showcase quality, warm neutral tones. No distortion, no artificial lighting."

Return each B-Roll prompt as:
{
  "basicConcept": "beach in Haifa",
  "imagePrompt": "Haifa coastline at golden hour, turquoise Mediterranean, sandy beach, city skyline in distance, cinematic photography, 4K, warm tones",
  "videoPrompt": "Slow aerial drone shot descending toward coastline, golden hour sunlight, shallow depth of field, cinematic movement, luxury commercial style. No text, no watermark.",
  "cameraMovement": "aerial-descending",
  "shotType": "wide-establishing",
  "lighting": "golden-hour",
  "style": "cinematic-luxury",
  "negativePrompt": "no text, no watermark, no blurry, no distortion, no shaky"
}`;

// ============================================================
// CATEGORY 15: AI TRANSITIONS (FIRST & LAST FRAME)
// ============================================================
export const AI_TRANSITIONS_PROMPT = `Use AI-powered transitions between clips for cinematic flow.

FIRST & LAST FRAME TECHNIQUE (Kling 2.5+):
Instead of hard cuts or crossfades between B-Roll clips, generate a smooth AI transition:
1. Take the LAST frame of clip A
2. Take the FIRST frame of clip B
3. Send both to AI video generation: "Smooth cinematic transition from scene A to scene B"
4. The AI generates a 2-3 second seamless morph between the two scenes

WHEN TO USE AI TRANSITIONS:
- Between two B-Roll clips that show different locations → AI creates smooth spatial transition
- Between speaker and B-Roll → AI creates elegant reveal
- Between "before" and "after" shots → AI creates transformation effect
- Between different rooms in a property tour → AI creates walking-through feel

WHEN NOT TO USE (stick to hard cuts or L-cuts):
- Between consecutive speaker segments → too flashy, use fake zoom instead
- More than 2 AI transitions per 30 seconds → overuse looks gimmicky
- When pacing is fast (energy 8-10) → hard cuts are better for speed

For each transition that would benefit from AI generation:
{
  "aiTransitions": [
    {
      "fromClipEnd": 15.0,
      "toClipStart": 15.5,
      "type": "spatial-morph",
      "prompt": "Smooth cinematic transition from beach sunset scene to modern apartment interior, camera pushing forward through golden light into clean white space",
      "duration": 2.0,
      "reason": "location change — beach to apartment needs smooth bridge"
    }
  ]
}

MAX: 2-3 AI transitions per 60-second video. Each one should feel special.`;

// ============================================================
// CATEGORY 16: STYLE TRANSFER FOR BRAND CONSISTENCY
// ============================================================
export const STYLE_TRANSFER_PROMPT = `Apply visual style transfer to make all B-Roll match the brand aesthetic.

THE PROBLEM:
AI-generated B-Roll clips look different from each other — different color temperatures, contrast levels, and visual styles. This makes the final video look inconsistent.

THE SOLUTION — STYLE TRANSFER:
Define a "visual DNA" for the brand/video, then apply it to all AI-generated clips.

VISUAL DNA DEFINITION:
{
  "visualDNA": {
    "colorPalette": "warm-luxury",
    "contrast": "medium-high",
    "saturation": "slightly-boosted",
    "filmGrain": "subtle",
    "lightingStyle": "golden-hour-warm",
    "overallFeel": "cinematic-premium",
    "referenceStyle": "luxury real estate commercial",
    "lutSuggestion": "orange-teal-cinematic"
  }
}

APPLY VISUAL DNA TO B-ROLL PROMPTS:
When generating B-Roll, append style instructions to every prompt:
"...Style: warm luxury color palette, medium-high contrast, slightly boosted saturation, subtle film grain, golden hour warmth, cinematic premium feel. Match the visual language of luxury real estate commercials."

APPLY VISUAL DNA TO COLOR GRADING:
After B-Roll is generated, apply consistent color grading via FFmpeg:
- Same LUT applied to ALL B-Roll clips
- Color temperature matched to speaker footage
- Contrast and saturation normalized across clips

DETERMINE VISUAL DNA FROM:
1. Brand kit colors → map to warm/cool/neutral palette
2. Video category → real estate=warm-luxury, tech=cool-clean, food=warm-vibrant
3. User preference → if specified in prompt
4. First clip analysis → extract color profile from uploaded footage and match B-Roll to it

For each video, define the visual DNA once, then reference it in every B-Roll prompt and color grade step.`;

// ============================================================
// CATEGORY 17: CHARACTER CONSISTENCY ACROSS SHOTS
// ============================================================
export const CHARACTER_CONSISTENCY_PROMPT = `Maintain character consistency when generating multiple AI video clips with people.

THE PROBLEM:
When generating multiple B-Roll clips with people, each clip shows DIFFERENT people. This is jarring and confusing.

THE SOLUTION — REFERENCE IMAGES:
1. If the video has a presenter/speaker → extract a clear face frame as reference
2. When generating B-Roll that includes the same person → include the reference image
3. Use Kling "Elements" or equivalent feature to lock character appearance

REFERENCE IMAGE EXTRACTION:
- Extract the clearest, best-lit frame of the speaker's face
- Use this as the reference for any B-Roll that should show the same person
- Store as: temp/{jobId}/character_reference.jpg

WHEN TO USE CHARACTER CONSISTENCY:
- "Speaker walks through apartment" → must be the SAME speaker
- "Customer receives product" → should look like a consistent character
- Multiple lifestyle B-Roll clips → same "model" across all clips
- Testimonial + B-Roll of the customer → same person

WHEN NOT NEEDED:
- Generic B-Roll (landscapes, buildings, food) → no character needed
- Stock-style footage → different people are fine
- Crowds/groups → consistency not expected

Add to B-Roll generation:
{
  "characterReference": {
    "hasReference": true,
    "referenceImagePath": "temp/{jobId}/character_reference.jpg",
    "description": "Male, 40s, dark hair, blue shirt, Israeli appearance",
    "useInClips": [0, 2, 4]
  }
}

When calling KIE.ai or other video generation APIs, include the reference image if the API supports it (Kling Elements, Runway Character Lock, etc.).`;

// ============================================================
// CATEGORY 18: AI LIP SYNC INTELLIGENCE
// ============================================================
export const LIP_SYNC_PROMPT = `Use AI lip sync for dubbing, translation, and avatar-based content.

AI LIP SYNC USE CASES:

1. TRANSLATION DUBBING:
   Take the original Hebrew video → translate audio to English/Arabic/Russian → AI lip syncs the speaker's mouth to the new language. Same face, same video, different language. Perfect for international marketing.

   Workflow:
   a. Extract audio from original video
   b. Translate text (DeepL/Claude)
   c. Generate new voice in target language (ElevenLabs with voice cloning)
   d. Apply lip sync to original video with new audio (HeyGen API)

2. VOICE REPLACEMENT:
   Replace a bad audio recording with a professional AI voice while keeping the original video. The AI adjusts lip movements to match the new audio.

   Workflow:
   a. Extract transcript from original
   b. Clean/improve the script text
   c. Generate professional voiceover (ElevenLabs)
   d. Apply lip sync to match new audio to original video

3. AI AVATAR FROM PHOTO:
   Generate a talking-head video from a single photo + audio. No filming needed. Perfect for the "Prompt-Only" mode.

   Workflow:
   a. User uploads a photo of the spokesperson
   b. Generate script with Claude
   c. Generate voice with ElevenLabs
   d. Create talking video from photo + voice (HeyGen/Hedra API)

4. PRESENTER CLONE:
   After filming one video, clone the presenter's voice and face. Future videos can be generated without re-filming.

   Workflow:
   a. Extract 30-second voice sample → clone voice (ElevenLabs)
   b. Extract clear face reference → store for future lip sync
   c. Future videos: new script → cloned voice → lip sync on reference

For each video, determine if lip sync would add value:
{
  "lipSyncPlan": {
    "needed": false,
    "useCase": "none",
    "reason": "original audio and video are good quality, no translation needed"
  }
}

OR for translation:
{
  "lipSyncPlan": {
    "needed": true,
    "useCase": "translation-dubbing",
    "targetLanguages": ["en", "ar", "ru"],
    "reason": "real estate ad targeting international buyers — need English and Arabic versions",
    "estimatedCost": "$0.30 per language (ElevenLabs + HeyGen)"
  }
}`;

// ============================================================
// CATEGORY 19: AI MOTION GRAPHICS (NO AFTER EFFECTS)
// ============================================================
export const AI_MOTION_GRAPHICS_PROMPT = `Generate motion graphics with AI instead of complex After Effects work.

AI MOTION GRAPHICS USE CASES:

1. ANIMATED LOGO INTRO (2-3 seconds):
   Instead of a static logo, generate an animated version:
   Prompt: "3D logo animation, [brand name] text appearing with particles, dark background, luxury gold accent, smooth camera orbit, 2 seconds"
   Use: Video intro/outro
   Tool: Luma AI or Kling with logo image as reference

2. ANIMATED LOWER THIRDS:
   Instead of static name bars, generate animated ones:
   Prompt: "Modern lower third animation, name plate sliding in from left, clean white with [brand color] accent, professional business style"
   Use: Speaker identification, titles
   Note: Can be done with Remotion instead of AI generation (cheaper + more consistent)

3. ANIMATED TEXT REVEALS:
   Key statistics or quotes appearing with cinematic animation:
   Prompt: "Kinetic typography, number '₪1,890,000' scaling up with golden particles, dark background, luxury feel, 3 seconds"
   Use: Price reveals, statistics, key quotes

4. TRANSITION GRAPHICS:
   Custom branded transitions between sections:
   Prompt: "Smooth geometric transition wipe, [brand colors], modern clean design, 1 second"
   Use: Section changes, topic transitions

5. ANIMATED ICONS/INFOGRAPHICS:
   Data visualization or feature icons with motion:
   Prompt: "Animated icon of [concept], flat design, [brand color], bouncing entrance animation, white background, 2 seconds"
   Use: Feature lists, benefit highlights

COST-BENEFIT DECISION:
- Simple text animations → use Remotion (free, consistent, fast)
- Logo animations → use AI generation (more creative, premium feel)
- Lower thirds → use Remotion (need to be consistent across videos)
- Kinetic text → use Remotion with templates (cheaper at scale)
- Transitions → AI generation for premium, Remotion for standard
- Infographics → Remotion (need data accuracy, AI might hallucinate)

For each video, decide which motion graphics are needed:
{
  "motionGraphicsPlan": {
    "logoAnimation": { "needed": true, "method": "remotion", "style": "slide-in-with-bounce" },
    "lowerThirds": { "needed": true, "method": "remotion", "style": "modern-minimal" },
    "priceReveal": { "needed": true, "method": "remotion", "style": "scale-up-golden" },
    "sectionTransitions": { "needed": true, "method": "remotion", "style": "geometric-wipe" },
    "animatedIcons": { "needed": false }
  }
}`;

// ============================================================
// CATEGORY 20: PLATFORM-SPECIFIC CONTENT STRATEGY
// ============================================================
export const PLATFORM_CONTENT_STRATEGY_PROMPT = `Apply platform-specific content psychology (not just format/size).

Based on Rourke Heath's insights and social media research:

TIKTOK PSYCHOLOGY:
- "TikTok is inherently an angry platform" — confrontational hooks work best
- Hook style: challenge, controversy, "they don't want you to know"
- Tone: raw, unfiltered, authentic, fast
- Don't polish too much — over-produced feels fake on TikTok
- Trending sounds MANDATORY — algorithm heavily favors them
- Engagement bait in the CTA: "comment if you agree" / "tag someone who needs this"
- Loop is CRITICAL — design the ending to seamlessly restart
- Hashtags: 3-5 niche hashtags, not generic ones
- Best duration: 15-21 seconds for maximum completion rate

INSTAGRAM REELS PSYCHOLOGY:
- "Instagram feels more welcoming" — inspirational/aspirational hooks work best
- Hook style: visual beauty, surprising reveal, relatable moment
- Tone: polished but authentic, warm, inviting
- Brand consistency matters more here — aesthetic feeds win
- Music: either trending OR premium/cinematic (both work differently)
- CTA: "save for later" / "share with a friend who needs this" (save = algorithm gold)
- Captions are more important than TikTok (professional audience watches muted)
- Best duration: 15-30 seconds for Reels, 7-15 for Stories

YOUTUBE SHORTS PSYCHOLOGY:
- "YouTube is where people come to learn" — educational hooks work best
- Hook style: "How to...", "The secret to...", teach something in the hook itself
- Tone: authoritative, educational, valuable
- More patience for longer content (up to 60 seconds still works)
- Thumbnails matter even for Shorts (they appear in feeds)
- CTA: "subscribe for more tips" / "watch the full tutorial" (link to long-form)
- Completion rate is THE metric — 90-100% completion = algorithm boost
- Best duration: 30-45 seconds for learning content

LINKEDIN VIDEO:
- Professional, thought-leadership tone
- No trending sounds, no flashy effects
- Captions MANDATORY (everyone watches at work, muted)
- Hook: data, insight, professional opinion
- CTA: "thoughts?" / "share your experience" / "link in comments"
- Tone: authoritative but approachable
- Best duration: 30-60 seconds

For each video export, adjust:
{
  "platformStrategy": {
    "tiktok": {
      "hookTone": "confrontational",
      "hookExample": "יזמי הנדל״ן לא רוצים שתראו את זה",
      "ctaStyle": "engagement-bait",
      "ctaText": "תגיעו מי שצריך לראות את זה 👇",
      "polishLevel": "raw-authentic",
      "soundStrategy": "trending-sound",
      "hashtagStrategy": "3-5 niche"
    },
    "instagram": {
      "hookTone": "aspirational",
      "hookExample": "הדירה שתשנה לכם את החיים ✨",
      "ctaStyle": "save-share",
      "ctaText": "שמרו לאחר כך 🔖",
      "polishLevel": "polished-warm",
      "soundStrategy": "cinematic-or-trending",
      "hashtagStrategy": "mix niche + broad"
    },
    "youtube": {
      "hookTone": "educational",
      "hookExample": "3 דברים שאתם חייבים לבדוק לפני שקונים דירה",
      "ctaStyle": "subscribe",
      "ctaText": "הירשמו לעוד טיפים 🔔",
      "polishLevel": "professional",
      "soundStrategy": "original-background",
      "hashtagStrategy": "SEO-focused"
    }
  }
}

This means the SAME video gets DIFFERENT:
- Hook text (confrontational vs aspirational vs educational)
- CTA text and style
- Polish level
- Sound/music choice
- Hashtag strategy
All from the same base footage — only the wrapper changes per platform.`;

// ============================================================
// CATEGORY 21: AI BACKGROUND REPLACEMENT
// ============================================================
export const AI_BACKGROUND_PROMPT = `Detect when video background should be replaced or enhanced with AI.

WHEN TO SUGGEST BACKGROUND REPLACEMENT:
- Speaker filmed in a messy/ugly room → replace with clean office or branded background
- Speaker filmed on green screen → replace with contextual background
- Real estate: filmed from outside → composite speaker INTO the property interior
- Product demo: cluttered desk → clean studio background

WORKFLOW (for the Brain to plan, not execute automatically):
1. Detect if background quality is low (Claude Vision during ingest)
2. If low: suggest background replacement in the editing blueprint
3. Options: a) Blur existing background (FFmpeg, free) b) Replace with brand-colored gradient (FFmpeg, free) c) AI-generate new background matching content context (KIE.ai, $0.10-0.40)

BACKGROUND QUALITY DETECTION (during ingest Vision analysis):
- Score background 1-10
- Below 5: suggest blur or replacement
- 5-7: suggest subtle blur
- 8+: keep as-is

For talking-head videos with bad backgrounds:
{
  "backgroundPlan": {
    "quality": 4,
    "issue": "messy room with distracting objects visible behind speaker",
    "recommendation": "blur",
    "blurIntensity": 15,
    "alternativeRecommendation": "replace with modern office background",
    "estimatedCost": "$0 for blur, $0.15 for AI replacement"
  }
}`;

// ============================================================
// CATEGORY 22: AI RELIGHTING
// ============================================================
export const AI_RELIGHTING_PROMPT = `Detect and plan lighting fixes for footage.

BAD LIGHTING SIGNS (detect during ingest):
- Underexposed (too dark) — faces hard to see
- Overexposed (too bright) — blown out highlights
- Flat lighting — no depth, looks amateur
- Mixed color temperature — warm and cool light sources competing
- Harsh shadows — direct overhead or side light without diffusion
- Backlit — subject is silhouette against bright window

LIGHTING FIX OPTIONS (cheapest to most expensive):

1. FFmpeg exposure/brightness correction (FREE):
   - Underexposed: "eq=brightness=0.1:contrast=1.1"
   - Overexposed: "eq=brightness=-0.05:contrast=0.95"
   - Flat: "curves=preset=increase_contrast"

2. FFmpeg color temperature fix (FREE):
   - Too cool (blue): "colortemperature=6500" or "colorbalance=rs=0.1:gs=0.05"
   - Too warm (orange): "colortemperature=4500" or "colorbalance=bs=0.1"

3. AI Relighting via API ($0.10-0.30 per clip):
   - Send frame to relighting API (Clipdrop/Higgsfield)
   - Get back properly lit version
   - Apply lighting style across all frames
   - Best for: golden hour simulation, studio lighting, dramatic mood

LIGHTING QUALITY SCORE (during ingest):
- Score lighting 1-10 based on Vision analysis
- Below 4: auto-apply FFmpeg correction
- 4-6: suggest correction in preview
- 7+: no correction needed

For each video:
{
  "lightingPlan": {
    "quality": 5,
    "issues": ["slightly underexposed", "mixed color temperature"],
    "autoFix": {
      "brightness": 0.08,
      "contrast": 1.05,
      "colorTemp": "warm-shift"
    },
    "aiRelightOption": {
      "available": true,
      "style": "golden-hour",
      "estimatedCost": "$0.15",
      "reason": "real estate content benefits from warm golden lighting"
    }
  }
}`;

// ============================================================
// CATEGORY 23: AI POV WALKTHROUGH
// ============================================================
export const POV_WALKTHROUGH_PROMPT = `Generate POV (first-person) walkthrough videos from still photos.

USE CASE:
Real estate agent has photos of an apartment but no video. The Brain can generate a virtual walkthrough that looks like someone walking through the property.

WORKFLOW:
1. User uploads still photos of rooms (living room, kitchen, bedroom, etc.)
2. Brain orders them in logical walkthrough sequence
3. For each photo: generate 3-5 second video clip with camera slowly pushing forward
4. Between rooms: generate AI transition (doorway, hallway)
5. Concat all clips into a smooth walkthrough

POV CAMERA MOVEMENT PROMPTS:
- Living room: "Slow steady walk-forward POV through spacious living room, natural light from windows, smooth camera movement at eye level, residential interior"
- Kitchen: "POV walking into modern kitchen, camera pans slightly to reveal island and appliances, bright clean lighting"
- Bedroom: "POV entering bedroom through doorway, camera slowly reveals bed and window view, warm morning light"
- Bathroom: "POV peek into clean bathroom, camera slowly tilts to show fixtures, bright white lighting"
- Transition: "POV walking through hallway, passing doorframe, transitioning from one room to next, residential interior"

When user uploads photos instead of video (Prompt-Only mode with images):
{
  "povWalkthrough": {
    "enabled": true,
    "photos": ["living.jpg", "kitchen.jpg", "bedroom.jpg", "bathroom.jpg", "view.jpg"],
    "sequence": ["entrance", "living", "kitchen", "bedroom", "bathroom", "balcony-view"],
    "transitionStyle": "doorway-walk",
    "cameraPace": "slow-elegant",
    "totalDuration": 30,
    "perRoomDuration": 4
  }
}

This is the MOST valuable feature for real estate agents who only have photos.`;

// ============================================================
// CATEGORY 24: AD LOCALIZATION AT SCALE
// ============================================================
export const AD_LOCALIZATION_PROMPT = `Generate localized ad variations from one master video.

CONCEPT (from Rourke Heath's Kling O1 workflow):
From ONE master video, automatically generate variations for different:
- Languages (Hebrew → English, Arabic, Russian)
- Audiences (young couples, investors, families, immigrants)
- Platforms (different text/CTA per platform)

LOCALIZATION TYPES:

1. LANGUAGE LOCALIZATION:
   - Translate subtitles/text overlays to target language
   - Generate new voiceover in target language (ElevenLabs)
   - Apply lip sync if speaker is visible (HeyGen)
   - Change CTA text and phone number per region

2. AUDIENCE LOCALIZATION:
   - Same video, different hook text per audience:
     Young couples: "הדירה הראשונה שלכם"
     Investors: "תשואה של 6% מובטחת"
     Families: "3 דקות מבית ספר"
     Olim: "Your new home in Israel"
   - Different CTA per audience segment

3. PLATFORM LOCALIZATION:
   Already covered in multi-platform cuts — different edit per platform

When the user requests localization:
{
  "localizationPlan": {
    "languages": [
      { "code": "en", "voiceover": true, "lipSync": true, "subtitles": true, "cta": "Schedule a tour: +972-4-XXX" },
      { "code": "ru", "voiceover": true, "lipSync": true, "subtitles": true, "cta": "Запланировать тур" },
      { "code": "ar", "voiceover": true, "lipSync": false, "subtitles": true, "cta": "حدد موعد جولة" }
    ],
    "audienceVariations": [
      { "audience": "investors", "hookText": "תשואה של 6% מובטחת", "ctaText": "קבלו תוכנית עסקית" },
      { "audience": "young-couples", "hookText": "הדירה הראשונה שלכם מחכה", "ctaText": "בדקו זכאות למשכנתא" }
    ],
    "estimatedCost": "$0.45 per language (translate + voice + lip sync)",
    "totalVariations": 5
  }
}

This means from ONE 45-second video → the system outputs 5+ versions targeting different markets. Each version: same B-Roll, different voiceover/subtitles/CTA.`;

// ============================================================
// MASTER EDITING PROMPT (all rules combined)
// ============================================================
export const MASTER_EDITING_PROMPT = [
  EDITING_RULES_PART1,     // Murch + J-Cut/L-Cut + Cut Types
  EDITING_RULES_PART2,     // Music Sync + Sound Design
  EDITING_RULES_PART3,     // Zoom + Color
  PLATFORM_RULES_PROMPT,   // Platform optimization
  SPEED_RAMP_PROMPT,       // Speed ramping
  PATTERN_INTERRUPT_PROMPT, // Pattern interrupts
  EMOTIONAL_ARC_PROMPT,    // Emotional arc rollercoaster
  STRATEGIC_SILENCE_PROMPT, // Strategic silence protection
  BROLL_PRECISION_PROMPT,  // B-Roll word-level precision
  CINEMATIC_PROMPTING_PROMPT, // Cinematic B-Roll prompting
  AI_TRANSITIONS_PROMPT,   // AI-powered transitions
  STYLE_TRANSFER_PROMPT,   // Visual style transfer
  CHARACTER_CONSISTENCY_PROMPT, // Character consistency
  LIP_SYNC_PROMPT,         // AI lip sync intelligence
  AI_MOTION_GRAPHICS_PROMPT, // AI motion graphics
  PLATFORM_CONTENT_STRATEGY_PROMPT, // Platform content strategy
  AI_BACKGROUND_PROMPT,    // AI background replacement
  AI_RELIGHTING_PROMPT,    // AI relighting
  POV_WALKTHROUGH_PROMPT,  // POV walkthrough from photos
  AD_LOCALIZATION_PROMPT   // Ad localization at scale
].join('\n\n');

// ============================================================
// EDITING PACE MODES
// ============================================================

export type PaceMode = 'fast' | 'normal' | 'calm';

export interface PaceModeConfig {
  cutFrequency: { min: number; max: number };   // seconds between cuts
  zoomIntensity: number;                          // 1.0 = none, 1.3 = aggressive
  sfxDensity: 'heavy' | 'moderate' | 'minimal';
  musicVolume: number;                            // percentage 0-100
  patternInterruptFrequency: number;              // seconds between interrupts
  brollRatio: number;                             // percentage of video that is B-Roll
  transitionStyle: 'hard-cut' | 'crossfade' | 'mix';
}

export const PACE_MODES: Record<PaceMode, PaceModeConfig> = {
  'fast': {
    cutFrequency: { min: 1.0, max: 2.5 },
    zoomIntensity: 1.25,
    sfxDensity: 'heavy',
    musicVolume: 35,
    patternInterruptFrequency: 8,
    brollRatio: 40,
    transitionStyle: 'hard-cut',
  },
  'normal': {
    cutFrequency: { min: 2.5, max: 4.5 },
    zoomIntensity: 1.15,
    sfxDensity: 'moderate',
    musicVolume: 25,
    patternInterruptFrequency: 15,
    brollRatio: 25,
    transitionStyle: 'mix',
  },
  'calm': {
    cutFrequency: { min: 4.0, max: 8.0 },
    zoomIntensity: 1.08,
    sfxDensity: 'minimal',
    musicVolume: 15,
    patternInterruptFrequency: 25,
    brollRatio: 15,
    transitionStyle: 'crossfade',
  },
};

export function selectPaceMode(platform: string, videoCategory: string, userOverride?: PaceMode): PaceMode {
  if (userOverride) return userOverride;

  // Auto-select by platform + category
  if (platform === 'tiktok') return 'fast';
  if (platform === 'linkedin') return 'calm';
  if (videoCategory === 'luxury-real-estate') return 'calm';
  if (videoCategory === 'product-launch') return 'fast';
  if (videoCategory === 'testimonial') return 'normal';
  if (videoCategory === 'corporate') return 'calm';

  return 'normal';
}

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
    triggerWord?: string;
    triggerWordTimestamp?: number;
    videoStartTime?: number;
    videoEndTime?: number;
    speakerAudioContinues?: boolean;
    kineticTextOverlay?: string;
    imagePrompt?: string;
    videoPrompt?: string;
    negativePrompt?: string;
    cameraMovement?: string;
    shotType?: string;
    lighting?: string;
    style?: string;
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
  emotionalArc?: Array<{
    start: number;
    end: number;
    energy: number;         // 1-10
    phase: string;
    editStyle: string;
  }>;
  aiTransitions?: Array<{
    fromClipEnd: number;
    toClipStart: number;
    type: string;
    prompt: string;
    duration: number;
    reason: string;
  }>;
  backgroundPlan?: {
    quality: number;
    issue: string;
    recommendation: 'keep' | 'blur' | 'replace';
    blurIntensity?: number;
    alternativeRecommendation?: string;
  };
  lightingPlan?: {
    quality: number;
    issues: string[];
    autoFix?: {
      brightness?: number;
      contrast?: number;
      colorTemp?: string;
    };
  };
  murchAverageScore: number;
}

// ============================================================
// EDGE CASE RULES — Handles 10 common scenarios
// ============================================================
export const EDGE_CASE_RULES_PROMPT = `Handle these edge cases intelligently:

VERY SHORT FOOTAGE (< 15 seconds):
- Cannot achieve standard 30-60s video length from content alone
- Strategy: use zooms (alternate 100%/115%) to create visual variety within same footage
- Add speed ramps: slow-mo on key moments extends time
- Generate more B-Roll than usual (fill 40-50% of final video with B-Roll)
- Consider loop: repeat the best 5 seconds with different zoom/color
- Set target duration to 15-20s instead of forcing longer
- Text overlays carry more of the message

VERY LONG FOOTAGE (> 5 minutes):
- Must be aggressive with cutting — keep only top 15-20% of footage
- Raise content selection threshold: keep only scores >= 70 (not 60)
- Identify 3-5 absolute best moments and build the video around them
- Cut ruthlessly: "if removing this doesn't hurt the video, remove it"
- Suggest multiple outputs: full version (60s) + highlight reel (15-30s)
- More B-Roll needed to cover jump cuts from heavy cutting

MULTI-SPEAKER (2+ speakers):
- Assign unique lower third to each speaker (name + role, different color accent)
- Cut to the ACTIVE speaker when they start talking (not when they finish)
- Include 1-2 second reaction shots of the listener after important statements
- If speakers overlap: keep the primary speaker's audio, show B-Roll
- Each speaker gets their own zoom level: speaker A at 100%, speaker B at 110%
- Speaker detection in transcript → different subtitle colors per speaker

NO SPEECH (product/music/montage):
- Switch to "visual mode" — the EDIT tells the story, not words
- Beat-sync is MANDATORY — every cut must land on a music beat
- Text overlays carry 100% of the messaging (titles, features, prices, CTAs)
- No subtitles needed
- Music volume at 60-80% (much louder than speech videos)
- Faster cut frequency: 1.5-3 seconds per shot
- Color grading can be bolder (no skin tone protection needed for product shots)
- Kinetic text is more prominent and creative

POOR AUDIO QUALITY:
- If background noise > 30% of audio → suggest AI voiceover replacement
- If echo detected → apply FFmpeg de-reverb filter
- If audio clipping → apply limiter and normalize
- If multiple audio issues → flag for user: "אודיו באיכות נמוכה — מומלץ להחליף בקריינות AI"

VERTICAL VIDEO UPLOADED FOR HORIZONTAL OUTPUT (or vice versa):
- If 9:16 uploaded but 16:9 needed → add blurred/branded side panels
- If 16:9 uploaded but 9:16 needed → smart crop following the speaker's face
- NEVER stretch or distort the video to fit

Return edge case handling:
{
  "edgeCases": {
    "detected": ["very-short", "poor-audio"],
    "strategies": [
      { "case": "very-short", "strategy": "extend with B-Roll and speed ramps", "targetDuration": 20 },
      { "case": "poor-audio", "strategy": "suggest AI voiceover replacement", "severity": "warning" }
    ]
  }
}`;

// ============================================================
// B-ROLL COUNT CALCULATOR — Dynamic by duration + pace + speech
// ============================================================
// Reference table:
// Duration    | Fast    | Normal  | Calm    | No-Speech
// 10-15s      | 2       | 1       | 1       | 3-4
// 15-30s      | 3       | 2       | 1-2     | 5-7
// 30-45s      | 4-5     | 3       | 2       | 8-10
// 45-60s      | 5-6     | 4       | 3       | 10+
// 60-90s      | 6-8     | 5-6     | 4       | (split into clips)

export function calculateBRollCount(
  duration: number,
  paceMode: string,
  hasSpeech: boolean,
): { min: number; max: number; recommended: number } {
  // Base: 1 B-Roll clip per 14 seconds of video
  let baseCount = Math.ceil(duration / 14);

  // Adjust by pace mode
  if (paceMode === 'fast') baseCount = Math.ceil(baseCount * 1.5);
  if (paceMode === 'calm') baseCount = Math.ceil(baseCount * 0.7);

  // No-speech videos need more B-Roll (they ARE the video)
  if (!hasSpeech) baseCount = Math.ceil(duration / 4);

  // Limits
  const min = Math.max(1, baseCount - 1);
  const max = Math.min(10, baseCount + 2);
  const recommended = Math.min(8, baseCount);

  return { min, max, recommended };
}
