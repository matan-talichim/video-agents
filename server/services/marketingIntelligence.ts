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
