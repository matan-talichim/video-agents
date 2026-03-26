// ============================================================
// MARKETING INTELLIGENCE — CTA + Video Ad Types
// Part 1/2: CTA Intelligence + Video Ad Type Detection
// ============================================================

// ============================================================
// CTA INTELLIGENCE
// Video CTAs increase conversions by 380% vs sidebar CTAs
// Personalized CTAs convert 202% better than generic
// The word "now" boosts conversions by 90%
// ============================================================

export const CTA_RULES_PROMPT = `You are a world-class marketing strategist creating video CTAs.

CTA PLACEMENT RULES:
- Mid-roll CTA (at 60-70% of video): gets MORE clicks than end-roll because not everyone watches to the end
- End-roll CTA (last 3-5 seconds): must be clear, single action, with visual button
- NEVER put CTA in the first 10 seconds — deliver value first, then ask
- Double CTA strategy: soft CTA at mid-roll ("want to learn more?") + hard CTA at end ("call now")
- In 9:16 format: CTA must be in the center-vertical safe zone (not bottom 20%)

CTA TEXT RULES (Hebrew):
- Use first person: "אני רוצה לדעת עוד" (not "לחצו כאן")
- Add urgency: "עכשיו", "היום", "מוגבל", "רק X נותרו"
- Be specific: "קבעו שיחת ייעוץ חינם" (not "צרו קשר")
- Max 5 words for the main CTA text
- Add "doubt remover" micro-text below: "ללא התחייבות", "שיחה של 5 דקות"

CTA TYPES BY VIDEO PURPOSE:
- Real estate: "קבעו סיור בדירה" / "השאירו פרטים" / "התקשרו עכשיו: 04-XXX"
- Product sale: "קנו עכשיו ב-X₪" / "הוסיפו לעגלה" / "מבצע מוגבל"
- Brand awareness: "עקבו לעוד תוכן" / "שתפו עם מישהו שצריך לראות"
- Lead generation: "הורידו מדריך חינם" / "הירשמו לוובינר"
- Testimonial: "גם אתם רוצים תוצאות כאלה?" / "דברו איתנו"
- App/SaaS: "התחילו ניסיון חינם" / "הורידו עכשיו"

CTA VISUAL DESIGN:
- Button style: rounded corners, brand accent color, pulse animation in last 3 seconds
- Text contrast: white text on colored button (WCAG 4.5:1 minimum)
- Size: large enough to be thumb-tappable on mobile (min 44x44px)
- Position: center-bottom in 16:9, center-vertical in 9:16
- Arrow or pointing gesture from speaker toward CTA (if applicable)

CTA A/B TESTING:
- Generate 2 CTA variations: one benefit-focused ("קבלו הצעה מיוחדת"), one urgency-focused ("רק 3 יחידות נותרו")
- The word "חינם" increases CTR by 42%
- Numbers increase specificity: "5 דקות", "₪1,890,000", "3 חדרים"

For each video, return:
{
  "primaryCTA": {
    "text": "קבעו סיור בדירה",
    "subtext": "שיחה של 5 דקות, ללא התחייבות",
    "timestamp": "last 4 seconds",
    "style": "pulse-button",
    "color": "brand accent",
    "position": "center-bottom"
  },
  "midrollCTA": {
    "text": "רוצים לראות את הדירה?",
    "timestamp": "60% of video",
    "style": "text-overlay",
    "subtle": true
  },
  "ctaVariation": {
    "text": "רק 5 דירות נותרו!",
    "urgency": true
  }
}`;


// ============================================================
// VIDEO AD TYPES — each type has different editing rules
// ============================================================

export const VIDEO_AD_TYPES_PROMPT = `You must identify and apply the correct marketing video format.

20 VIDEO AD TYPES AND THEIR EDITING RULES:

1. PRODUCT SHOWCASE (מוצר)
   Structure: Hook (problem) → Product reveal → Features → Benefits → Social proof → CTA
   Duration: 15-30s for social, 60s for website
   Key: Close-up shots of product, clean background, feature text overlays
   Music: Upbeat, modern
   CTA: "קנו עכשיו" / "הוסיפו לעגלה"

2. REAL ESTATE LISTING (נכס)
   Structure: Aerial exterior → Entrance → Living spaces → Kitchen → Bedrooms → Special features → Location highlights → CTA
   Duration: 30-90s
   Key: Smooth transitions, room labels ("סלון 45 מ״ר"), price overlay, location map
   Music: Calm, elegant, piano-based
   CTA: "קבעו סיור" / "השאירו פרטים"

3. TESTIMONIAL (עדות לקוח)
   Structure: Hook (result) → Problem before → Discovery → Experience → Result → Recommendation → CTA
   Duration: 30-60s
   Key: Authentic, unscripted feeling, lower third with name+role, emotional moments
   Music: Soft, inspirational, not distracting
   CTA: "גם אתם רוצים?" / "דברו איתנו"

4. BRAND VIDEO (תדמית)
   Structure: Cinematic hook → Company story → Values → Team → Achievements → Vision → CTA
   Duration: 60-120s
   Key: High production value, cinematic, consistent brand colors, logo placement
   Music: Cinematic, emotional, building
   CTA: "הצטרפו למשפחה" / "גלו עוד"

5. EXPLAINER (הסבר)
   Structure: Problem → Why it matters → Solution → How it works → Proof → CTA
   Duration: 60-90s
   Key: Simple language, visual demonstrations, step-by-step, text overlays for key points
   Music: Light, friendly, not distracting
   CTA: "התחילו עכשיו" / "נסו בחינם"

6. SOCIAL PROOF COMPILATION (אוסף הוכחות)
   Structure: Bold claim → Testimonial 1 → Testimonial 2 → Testimonial 3 → Stats → CTA
   Duration: 30-60s
   Key: Fast cuts between testimonials, name+photo cards, results numbers
   Music: Energetic, confident
   CTA: "הצטרפו ל-X לקוחות מרוצים"

7. BEFORE/AFTER (לפני/אחרי)
   Structure: "Before" state → Pain/problem → Transition → "After" reveal → How → CTA
   Duration: 15-30s
   Key: Split screen or dramatic reveal, side-by-side comparison, wow moment
   Music: Build-up to dramatic reveal
   CTA: "רוצים את השינוי?"

8. TUTORIAL/HOW-TO (מדריך)
   Structure: What you'll learn → Step 1 → Step 2 → Step 3 → Result → CTA
   Duration: 60-180s
   Key: Clear numbering, screen recording if digital, close-ups if physical, recap at end
   Music: Light background only
   CTA: "רוצים ללמוד עוד?" / "הירשמו לקורס"

9. EVENT RECAP (אירוע)
   Structure: Energy montage → Highlights → Speakers → Crowd → Key moments → Next event CTA
   Duration: 30-90s
   Key: Fast cuts synced to beat, crowd energy, speaker soundbites, atmosphere
   Music: Energetic, beat-driven, drives the edit
   CTA: "הזמינו מקום לאירוע הבא"

10. UGC-STYLE AD (תוכן משתמשים)
    Structure: "Hey guys" → Problem → Discovery → Demo → Reaction → Recommendation
    Duration: 15-30s
    Key: Phone-quality aesthetic (intentionally not polished), authentic delivery, native to platform
    Music: Trending sounds or no music
    CTA: Organic mention, not hard sell

11. LAUNCH/ANNOUNCEMENT (השקה)
    Structure: Teaser → Reveal → Features → Availability → Special offer → CTA
    Duration: 15-60s
    Key: Countdown, dramatic reveal, exclusive feeling, urgency
    Music: Building tension → release
    CTA: "הזמינו ראשונים" / "מוגבל ל-X ראשונים"

12. COMPARISON (השוואה)
    Structure: "X vs Y" → Feature 1 → Feature 2 → Feature 3 → Winner → CTA
    Duration: 30-60s
    Key: Side-by-side visual, checkmark/X graphics, clear winner
    Music: Neutral, informative
    CTA: "בחרו את המנצח"

13. FAQ VIDEO (שאלות נפוצות)
    Structure: Question 1 → Answer → Question 2 → Answer → ... → CTA
    Duration: 60-120s
    Key: Questions as text overlays, clear answers, chapter markers
    Music: Very light or none
    CTA: "יש עוד שאלות? דברו איתנו"

14. STORY/NARRATIVE (סיפור)
    Structure: Character intro → Challenge → Journey → Resolution → Message → CTA
    Duration: 60-180s
    Key: Emotional storytelling, character development, relatable struggles
    Music: Emotional, follows the narrative arc
    CTA: Subtle, integrated into the story

15. SEASONAL/HOLIDAY (עונתי)
    Structure: Holiday theme → Connection to brand → Special offer → CTA
    Duration: 15-30s
    Key: Holiday visuals, themed colors, limited-time feeling
    Music: Holiday-appropriate
    CTA: "מבצע חג מוגבל" / "הזמינו לפני X"

16. BEHIND-THE-SCENES (מאחורי הקלעים)
    Structure: "Want to see how we...?" → Process → Team → Fun moments → Result → CTA
    Duration: 30-60s
    Key: Raw, authentic, shows the human side, bloopers welcome
    Music: Casual, fun
    CTA: "רוצים לראות עוד?" / "עקבו"

17. LISTICLE ("5 סיבות ש...")
    Structure: Hook ("5 reasons...") → #1 → #2 → #3 → #4 → #5 → Conclusion → CTA
    Duration: 30-60s
    Key: Numbered text overlays, fast pacing, each point = 5-8 seconds
    Music: Upbeat, drives the pace
    CTA: Related to the list topic

18. CHALLENGE/TREND (אתגר)
    Structure: Trend intro → Participation → Result → Brand connection → CTA
    Duration: 15-30s
    Key: Platform-native, uses trending audio, hashtag-driven
    Music: Trending sound (mandatory)
    CTA: "נסו בעצמכם" / tag challenge

19. COUNTDOWN/URGENCY (ספירה לאחור)
    Structure: "Only X days left" → What you'll miss → Social proof → Last chance → CTA
    Duration: 15-30s
    Key: Countdown timer visual, urgency text, scarcity ("3 נותרו"), red/orange colors
    Music: Tense, urgent
    CTA: "הזמינו עכשיו לפני שנגמר"

20. MINI-DOCUMENTARY (מיני דוקו)
    Structure: Opening question → Investigation → Interviews → Discovery → Conclusion
    Duration: 120-300s
    Key: Journalistic style, multiple perspectives, data/facts, compelling narrative
    Music: Documentary-style, subtle
    CTA: "שתפו את הסיפור" / "הצטרפו למהפכה"

For each video, the Brain must:
1. Identify which type best fits the content and purpose
2. Apply the correct structure, pacing, and music mood
3. Plan CTA placement and style per type
4. Plan text overlays per type (product labels, room names, statistics, step numbers)
5. Set the right duration for the platform`;


// ============================================================
// CONVERSION OPTIMIZATION RULES
// ============================================================

export const CONVERSION_RULES_PROMPT = `You maximize video conversion rates using proven marketing psychology.

MARKETING FUNNEL — edit differently for each stage:

TOP OF FUNNEL (Awareness — "מי אתם?"):
- Goal: stop the scroll, get attention, make them remember
- Duration: 15-30 seconds maximum
- Hook: bold claim, surprising stat, or emotional moment
- NO hard sell — just intrigue and brand impression
- CTA: "עקבו לעוד" / "שתפו" (soft CTA)
- Edit style: fast cuts, energetic, visually stunning
- Music: trending, attention-grabbing

MIDDLE OF FUNNEL (Consideration — "למה אתם?"):
- Goal: educate, differentiate, build trust
- Duration: 30-60 seconds
- Show: features, benefits, comparisons, social proof
- CTA: "גלו עוד" / "הורידו מדריך" / "צפו בסיפור"
- Edit style: balanced, professional, clear information delivery
- Music: moderate, professional

BOTTOM OF FUNNEL (Decision — "מוכן לקנות"):
- Goal: overcome objections, create urgency, close the deal
- Duration: 15-30 seconds
- Show: price, offer, testimonials, guarantees, scarcity
- CTA: "קנו עכשיו" / "הזמינו" / "התקשרו" (hard CTA)
- Edit style: direct, confident, urgent
- Music: building to action

PSYCHOLOGICAL TRIGGERS TO USE:

1. SCARCITY (מחסור):
   "רק 3 דירות נותרו" / "מוגבל ל-50 ראשונים"
   Add countdown timer in last 5 seconds
   Use red/orange accent colors for urgency

2. SOCIAL PROOF (הוכחה חברתית):
   "1,200 משפחות כבר גרות כאן" / "4.9 כוכבים מ-500 ביקורות"
   Show real numbers, real faces, real results
   Counter animations: numbers counting up

3. AUTHORITY (סמכות):
   Awards, certifications, media mentions, years of experience
   "מנצחי פרס X" / "כפי שפורסם ב-Y" / "20 שנות ניסיון"

4. RECIPROCITY (הדדיות):
   Give value first → then ask for action
   "הנה 3 טיפים חינם..." → "רוצים עוד? הירשמו"
   Educational content → lead magnet CTA

5. LOSS AVERSION (פחד מהפסד):
   "אל תפספסו" / "ההזדמנות נגמרת ב-X"
   People fear losing more than they desire gaining
   Show what they'll MISS, not just what they'll GET

6. ANCHORING (עיגון):
   Show original price crossed out, then sale price
   "שווה ₪5,000 → שלכם ב-₪1,990"
   Always show the higher number first

7. BANDWAGON (עדר):
   "הצטרפו ל-10,000+ שכבר עשו את הצעד"
   Show trend: growing numbers, busy offices, full events

For each video, determine:
- Which funnel stage is this video for?
- Which 2-3 psychological triggers to use?
- How to integrate them naturally (not pushy)

Return:
{
  "funnelStage": "bottom",
  "psychologicalTriggers": ["scarcity", "social-proof", "anchoring"],
  "triggerImplementation": [
    { "trigger": "scarcity", "text": "רק 5 דירות נותרו", "timestamp": "last 5s", "visual": "countdown-timer" },
    { "trigger": "anchoring", "text": "₪2,500,000 → ₪1,890,000", "timestamp": "at price reveal", "visual": "strikethrough-animation" }
  ]
}`;


// ============================================================
// SOCIAL PROOF INTEGRATION
// ============================================================

export const SOCIAL_PROOF_PROMPT = `Integrate social proof elements naturally into the video.

SOCIAL PROOF TYPES:

1. NUMBERS (most powerful):
   Counter animation: "1,247 → 1,248 לקוחות מרוצים" (number counting up)
   Statistics: "98% שביעות רצון" with animated bar
   Growth: "x3 צמיחה בשנה האחרונה"
   Show as kinetic text with bold animation at strategic moments

2. TESTIMONIAL CLIPS:
   If video has testimonial segments, place them at the "proof" moment in the structure
   Lower third: name + role + result ("דני כהן, רוכש דירה, חסך ₪200K")
   Keep individual testimonials to 8-15 seconds each

3. LOGOS AND BADGES:
   Client logos bar (if B2B): show 4-6 logos
   "כפי שנראה ב-" media mentions
   Certification badges
   Place at 30-40% of video (after establishing credibility)

4. USER-GENERATED FEEL:
   Even scripted content can feel authentic:
   - Slightly imperfect framing = more trustworthy
   - Eye contact with camera = personal connection
   - Natural pauses = not over-rehearsed
   - Real location (not studio) = relatable

5. RESULTS-FOCUSED:
   "לפני: X → אחרי: Y"
   Specific numbers: "חסכנו 45% בעלויות" (not "חסכנו הרבה")
   Timeframe: "תוך 30 יום" (adds believability)

When planning text overlays and B-Roll, integrate social proof at these moments:
- After making a claim → immediately show proof
- Before CTA → boost confidence with social proof
- At the "why us" section → differentiate with results`;


// ============================================================
// INDUSTRY-SPECIFIC MARKETING RULES
// ============================================================

export const INDUSTRY_RULES_PROMPT = `Apply industry-specific marketing rules:

REAL ESTATE (נדל"ן):
- Lead with lifestyle, not specifications
- Show the FEELING of living there, not just rooms
- Aerial shots = luxury signal
- Golden hour lighting = premium feel
- Always include: location benefits, price (if competitive), unique features
- Text overlays: room sizes, floor number, direction (south-facing)
- CTA: phone number, WhatsApp link, "schedule tour"
- B-Roll: neighborhood, beach, parks, restaurants, schools nearby
- Emotional arc: "imagine your life here" → features → proof → "make it yours"

FOOD & RESTAURANT (מזון):
- Close-up shots of food (ASMR-style if possible)
- Steam, melting, pouring, cutting = engagement boosters
- Fast cuts during preparation, slow for final reveal
- Warm color grading (makes food look appetizing)
- Text: prices, special ingredients, dietary info
- CTA: "הזמינו עכשיו" / "מצאו סניף"

FASHION & BEAUTY (אופנה):
- Model/lifestyle shots, not flat lays
- Show the product in use/worn
- Trendy transitions, speed ramps
- Music: current, trendy, beat-driven
- Text: price, material, sizes available
- CTA: "קנו עם X% הנחה"

TECH / SAAS (טכנולוגיה):
- Screen recordings with zoom-ins on features
- Problem → Solution structure always
- Clean, minimal design, lots of whitespace
- Animated text for feature names
- Music: modern, electronic, clean
- CTA: "התחילו ניסיון חינם" / "צפו בהדגמה"

HEALTH & FITNESS (בריאות):
- Before/after transformations
- Action shots, energy, movement
- Motivational tone
- Warm, vibrant colors
- Text: results, timeframes, testimonials
- CTA: "התחילו היום" / "הצטרפו"

EDUCATION (חינוך):
- Value-first: teach something in the video itself
- Screen + face split (talking head + visuals)
- Numbered steps, clear progression
- Professional but approachable
- CTA: "הירשמו לקורס" / "הורידו מדריך חינם"

EVENTS (אירועים):
- Fast montage of highlights
- Beat-synced cuts mandatory
- Crowd energy, atmosphere, emotion
- Speaker soundbites (best 5-second moments)
- CTA: "הזמינו כרטיסים" / date+location

AUTOMOTIVE (רכב):
- Cinematic driving shots
- Detail close-ups (wheels, interior, dashboard)
- Speed ramps (slow → fast → slow)
- Deep, cinematic color grading
- Engine sound design
- CTA: "קבעו נסיעת מבחן"

E-COMMERCE (חנות אונליין):
- Product from multiple angles
- Lifestyle context (product in real use)
- Price + discount prominent
- Fast pacing, multiple products in one video
- "Swipe to shop" / "Link in bio" for social
- CTA: "קנו עכשיו" with direct link

SERVICE BUSINESS (שירותים):
- Process explanation: "how we work"
- Team introduction: faces build trust
- Results/portfolio showcase
- Client testimonial integration
- CTA: "קבעו שיחת ייעוץ חינם"

For each video, identify the industry and apply the correct rules automatically.

Return:
{
  "industry": "real-estate",
  "industryRules": {
    "leadWith": "lifestyle",
    "mustInclude": ["aerial", "golden-hour", "location-benefits", "price"],
    "colorGrading": "warm-luxury",
    "musicMood": "calm-elegant",
    "ctaStyle": "phone-number-prominent"
  }
}`;


// ============================================================
// MARKETING FRAMEWORKS — AIDA, PAS, BAB, HOOK-VALUE-CTA, STAR-STORY-SOLUTION
// ============================================================

export const MARKETING_FRAMEWORKS_PROMPT = `You apply proven marketing frameworks to video structure. Choose the RIGHT framework for each video type.

FRAMEWORK 1 — AIDA (Attention → Interest → Desire → Action)
Best for: Paid ads, product launches, brand awareness
Video structure:
- 0-3s: ATTENTION — hook that stops the scroll (bold claim, question, surprising visual)
- 3-15s: INTEREST — why should they care? Show the problem or opportunity
- 15-40s: DESIRE — make them WANT it. Benefits, social proof, emotional connection
- Last 5s: ACTION — clear CTA, one single action

Example for real estate:
- ATTENTION: "הדירה הזו נמכרה תוך 48 שעות" (text on aerial B-Roll)
- INTEREST: "בגלל 3 דברים שהופכים אותה למיוחדת" (speaker explains)
- DESIRE: "5 דקות מהים, נוף פתוח, מחיר השקה" (B-Roll of beach, view, price overlay)
- ACTION: "רק 5 דירות נותרו — התקשרו עכשיו" (CTA with phone number)

FRAMEWORK 2 — PAS (Problem → Agitate → Solution)
Best for: Product sales, service marketing, problem-solving content
Video structure:
- 0-5s: PROBLEM — state the pain point the viewer has ("עייפים מלחפש דירה?")
- 5-20s: AGITATE — make the problem feel URGENT ("כל יום שעובר המחירים עולים")
- 20-end: SOLUTION — your product/service IS the answer ("אנחנו מוצאים לכם את הדירה המושלמת")

Example for service business:
- PROBLEM: "90% מהעסקים לא יודעים כמה כסף הם מפסידים על שיווק לא ממוקד"
- AGITATE: "כל חודש אלפי שקלים הולכים לפרסום שלא מביא תוצאות"
- SOLUTION: "אנחנו בנינו מערכת שמייצרת לידים ב-50% פחות עלות"

FRAMEWORK 3 — BAB (Before → After → Bridge)
Best for: Testimonials, case studies, transformation stories
Video structure:
- 0-10s: BEFORE — show the "before" state (problem, struggle, frustration)
- 10-25s: AFTER — show the "after" state (success, happiness, results)
- 25-end: BRIDGE — your product/service is the bridge between before and after

Example for testimonial:
- BEFORE: "לפני שנה חיפשנו דירה 6 חודשים בלי הצלחה" (customer speaks)
- AFTER: "היום אנחנו גרים בדירת חלומות עם נוף לים" (B-Roll of their home)
- BRIDGE: "חברת X עשו את כל העבודה בשבילנו" (CTA: "גם אתם רוצים?")

FRAMEWORK 4 — HOOK-VALUE-CTA (for short-form social)
Best for: TikTok, Reels, Shorts (under 30 seconds)
Video structure:
- 0-1.5s: HOOK — one powerful sentence or visual
- 1.5-25s: VALUE — deliver on the hook promise (tips, info, demo)
- Last 3-5s: CTA — soft or hard call to action

FRAMEWORK 5 — STAR-STORY-SOLUTION (for narrative content)
Best for: Brand videos, documentaries, emotional content
Video structure:
- STAR: introduce the main character (the customer, the founder, the product)
- STORY: tell their journey (challenge, struggle, discovery)
- SOLUTION: resolution + how the brand/product made it possible

For each video, the Brain must:
1. Analyze the content and purpose
2. Select the best framework (AIDA/PAS/BAB/HOOK-VALUE-CTA/STAR-STORY-SOLUTION)
3. Map each segment of the video to a framework stage
4. Ensure the video FOLLOWS the framework structure
5. If the original footage doesn't follow the framework → REARRANGE segments to match

Return:
{
  "selectedFramework": "AIDA",
  "frameworkReason": "פרסומת ממומנת — AIDA מתאים ביותר להמרות",
  "frameworkMapping": [
    { "stage": "attention", "start": 0, "end": 3, "content": "hook text overlay + aerial B-Roll" },
    { "stage": "interest", "start": 3, "end": 15, "content": "speaker explains the opportunity" },
    { "stage": "desire", "start": 15, "end": 40, "content": "benefits + social proof + B-Roll" },
    { "stage": "action", "start": 40, "end": 45, "content": "CTA button + phone number" }
  ]
}`;


// ============================================================
// VIDEO COPYWRITING — texts that SELL
// ============================================================

export const VIDEO_COPYWRITING_PROMPT = `You write marketing copy for video text overlays. Every text on screen must SELL, not just inform.

TEXT OVERLAY TYPES AND RULES:

HEADLINE (כותרת ראשית):
- Max 6 words in Hebrew
- Must create curiosity or state a benefit
- Font: largest on screen (48-64px)
- Examples: "הסוד של משקיעי נדל״ן מצליחים" / "3 טעויות שעולות לכם כסף"
- Position: center of screen
- Duration: 2-3 seconds
- Animation: scale-up or bounce

SUB-HEADLINE (כותרת משנה):
- Supports the headline with a specific detail
- Font: medium (32-40px)
- Example: under "מחירי השקה" → "החל מ-₪1,890,000"
- Duration: 2-3 seconds after headline
- Animation: fade-in or slide-up

BULLET POINTS (נקודות):
- Appear one by one with animation
- Max 4-5 words per bullet
- Use checkmarks ✓ or numbers
- Example: "✓ 5 דקות מהים" → "✓ חניה כפולה" → "✓ מרפסת שמש"
- Duration: 1.5 seconds per bullet
- Animation: slide-in from right (RTL)

PRICE DISPLAY (מחיר):
- Always use anchoring: show original price crossed out, then sale price
- Format: "₪2,500,000" crossed → "₪1,890,000" in large bold
- Use red for original, green or brand color for sale price
- Add "מבצע לזמן מוגבל" below
- Animation: strikethrough on original, then scale-up on sale price

STATISTIC (סטטיסטיקה):
- Large number with context
- Example: "1,200+" with subtitle "משפחות כבר גרות כאן"
- Counter animation: number counts up from 0
- Duration: 3 seconds
- Font: extra large for the number (72px+), smaller for context

URGENCY TEXT (דחיפות):
- Red or orange color, pulsing animation
- "רק X נותרו!" / "מסתיים ב-X" / "ההזדמנות האחרונה"
- Position: top or bottom bar
- Optional: countdown timer
- Duration: last 5-8 seconds of video

DOUBT REMOVER (מסיר חששות):
- Small text below CTA
- "ללא התחייבות" / "ביטול בכל עת" / "שיחה של 5 דקות"
- Reduces friction between desire and action
- Font: small (20-24px), muted color
- Duration: appears with CTA

LABEL/TAG (תווית):
- Identifies items in the video
- Real estate: "סלון 45 מ״ר" / "קומה 12 מתוך 20" / "כיוון דרום-מערב"
- Product: "עמיד למים" / "סוללה 48 שעות"
- Position: near the relevant item in frame
- Animation: pop-in with subtle bounce

QUOTE CARD (כרטיס ציטוט):
- Customer testimonial as text
- "הדירה הכי טובה שראינו" — דני ושרה כהן
- Background: semi-transparent dark overlay
- Font: italic or with quotation marks
- Duration: 3-4 seconds

SOCIAL PROOF COUNTER (מונה הוכחה חברתית):
- "⭐ 4.9 מתוך 5" / "🏆 מקום ראשון ב-X" / "📊 98% שביעות רצון"
- Counter animation for numbers
- Position: corner or lower third

For each video, plan ALL text overlays with:
{
  "textOverlays": [
    {
      "type": "headline",
      "text": "הדירה שתשנה לכם את החיים",
      "timestamp": 0,
      "duration": 3,
      "fontSize": "xl",
      "animation": "scale-up",
      "position": "center",
      "color": "white"
    },
    {
      "type": "price",
      "originalPrice": "₪2,500,000",
      "salePrice": "₪1,890,000",
      "timestamp": 25,
      "duration": 4,
      "animation": "strikethrough-then-scale"
    },
    {
      "type": "urgency",
      "text": "רק 5 דירות נותרו!",
      "timestamp": 40,
      "duration": 5,
      "color": "red",
      "animation": "pulse"
    }
  ]
}`;


// ============================================================
// COLOR PSYCHOLOGY IN MARKETING
// ============================================================

export const COLOR_PSYCHOLOGY_PROMPT = `Apply color psychology to all visual elements (CTA, text, overlays).

COLOR → EMOTION → USE CASE:

RED (#EF4444):
- Triggers: urgency, excitement, passion, danger
- Use for: sale prices, countdown timers, "last chance" text, food content
- CTA: "קנו עכשיו" / "מבצע מוגבל"
- Never use for: luxury, calm, trust

BLUE (#3B82F6):
- Triggers: trust, professionalism, security, calm
- Use for: corporate content, finance, tech, "learn more" CTAs
- CTA: "גלו עוד" / "צרו קשר"
- Best for: B2B, professional services, banking

GREEN (#22C55E):
- Triggers: health, nature, growth, money, go/approve
- Use for: health products, eco content, financial gains, "success" indicators
- CTA: "התחילו עכשיו" / "הצטרפו"
- Price displays: sale prices in green = "you're saving"

ORANGE (#F97316):
- Triggers: energy, enthusiasm, warmth, affordable
- Use for: CTAs that need attention without urgency, youth content
- CTA: "נסו בחינם" / "הירשמו"
- Good for: e-commerce, subscriptions

PURPLE (#7C3AED):
- Triggers: luxury, creativity, premium, wisdom
- Use for: premium products, creative services, beauty, luxury real estate
- CTA: "חוו את היוקרה" / "גלו את הקולקציה"

GOLD (#D4AF37):
- Triggers: luxury, exclusivity, premium, prestige
- Use for: luxury products, VIP offers, awards, premium features
- CTA: "הצטרפו למועדון" / "חברי VIP"
- Combine with black for maximum luxury feel

BLACK (#000000):
- Triggers: sophistication, power, elegance, mystery
- Use for: luxury brands, tech products, dramatic reveals
- CTA on black: use white or gold text

WHITE (#FFFFFF):
- Triggers: cleanliness, simplicity, purity, minimalism
- Use for: clean designs, medical, simplicity, breathing room
- White space around CTA = more attention to it

YELLOW (#EAB308):
- Triggers: happiness, optimism, attention, warning
- Use for: highlight text, sale badges, attention-grabbing elements
- Don't use as background (hard to read text on)

For each video, choose colors based on:
1. Industry (real estate = blue+gold, food = red+orange, tech = blue+white)
2. Purpose (urgency = red, trust = blue, premium = purple+gold)
3. CTA type (action = red/orange, learn = blue, start = green)
4. Target audience (youth = bright, corporate = muted, luxury = dark+gold)

Return:
{
  "colorStrategy": {
    "primaryCTAColor": "#EF4444",
    "primaryCTAReason": "מבצע עם דחיפות — אדום מעורר פעולה מיידית",
    "textHighlightColor": "#F97316",
    "priceColor": "#22C55E",
    "urgencyColor": "#EF4444",
    "backgroundOverlay": "rgba(0,0,0,0.6)"
  }
}`;


// ============================================================
// SOUND PSYCHOLOGY IN MARKETING
// ============================================================

export const SOUND_PSYCHOLOGY_PROMPT = `Choose music and sound based on marketing psychology, not just "mood".

MUSIC KEY → EMOTION:
- Major key = happiness, optimism, confidence → brand videos, product launches, celebrations
- Minor key = drama, emotion, sadness, tension → testimonials, problem-focused, storytelling
- Suspended chords = mystery, curiosity → teasers, reveals, coming-soon

BPM → ENERGY LEVEL:
- 60-80 BPM = calm, trust, luxury → corporate, real estate, premium brands
- 80-100 BPM = moderate, professional → explainers, tutorials, B2B
- 100-120 BPM = energetic, confident → product launches, lifestyle, fitness
- 120-140 BPM = high energy, excitement → sales, events, social media ads
- 140+ BPM = urgent, intense → flash sales, countdowns, limited time

GENRE → BRAND FEELING:
- Piano/acoustic = authentic, personal, warm → testimonials, family, boutique
- Electronic/synth = modern, innovative, tech → SaaS, apps, startups
- Orchestral/cinematic = epic, premium, aspirational → luxury, real estate, automotive
- Lo-fi/chill = relaxed, trendy, Gen-Z → lifestyle, fashion, social media
- Corporate/minimal = clean, professional, reliable → B2B, finance, consulting
- Hip-hop/trap beats = bold, youthful, urban → fashion, food, entertainment

SOUND EFFECTS → PSYCHOLOGICAL TRIGGERS:
- "Whoosh" = transition, speed, progress → use on cuts and reveals
- "Ding/chime" = notification, attention, achievement → use on highlights and stats
- "Cash register/coin" = money, savings, deal → use on price reveals
- "Heartbeat" = tension, emotion, urgency → use before reveals
- "Crowd cheering" = social proof, success → use on achievement stats
- "Click/tap" = digital, interaction, confirmation → use on CTA appearance
- "Rise/swell" = anticipation, building excitement → use before main point

For each video, choose:
{
  "soundStrategy": {
    "musicKey": "major",
    "bpmRange": "80-100",
    "genre": "cinematic-piano",
    "reason": "נדל״ן יוקרתי — פסנתר סינמטי משדר יוקרה ואמינות",
    "sfxPlan": [
      { "type": "whoosh", "usage": "on every B-Roll transition" },
      { "type": "ding", "usage": "on key statistics" },
      { "type": "rise", "usage": "before price reveal" },
      { "type": "cash-register", "usage": "on price display" }
    ]
  }
}`;
