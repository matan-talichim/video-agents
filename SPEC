# Video Agents — Ultimate SPEC v3.0
# מערכת עריכת וידאו AI — 95 פיצ'רים + מוח חכם
# מבוסס על מחקר 15 פלטפורמות

---

## 1. Overview

מערכת full-stack שמקבלת חומרי גלם (סרטונים, אודיו, מסמכים) או פרומפט בלבד, ומייצרת סרטון ערוך מקצועי באופן אוטומטי. המערכת כוללת 95 פיצ'רים, אבל לא מפעילה את כולם בכל ג'וב — "מוח" חכם (Claude API) מחליט אילו פיצ'רים נדרשים לפי הפרומפט של המשתמש.

**שני מצבים:**
- **Raw Mode** — משתמש מעלה קבצי וידאו/אודיו + כותב פרומפט
- **Prompt-Only Mode** — משתמש כותב פרומפט בלבד (אופציונלי: מעלה PDF/מסמך/תמונת סלפי)

**עיקרון ליבה:** כל ג'וב עובר קודם דרך "The Brain" — Claude API שמנתח את הפרומפט, מבין את ההקשר, ומחזיר ExecutionPlan (JSON) שמגדיר בדיוק אילו פיצ'רים להפעיל ועם אילו פרמטרים. ה-Orchestrator מריץ רק את מה שנבחר.

---

## 2. Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React + TypeScript + Vite + Tailwind | UI (Hebrew RTL, dark theme) |
| Backend | Express.js (TypeScript) | API + Orchestrator |
| State | Zustand | Frontend state management |
| Brain | Claude API (Anthropic) | Decision making, analysis, planning, revisions |
| Transcription | Deepgram Nova-3 (language=he) | Speech-to-text with word-level timestamps |
| Video Generation | KIE.ai API | B-Roll, lipsync, face swap, motion transfer, VFX, upscale |
| Video Processing | FFmpeg | Cut, join, effects, color, subtitles, export |
| Render Engine | Remotion | Animated subtitles, kinetic typography, templates |
| Voice | ElevenLabs API | TTS, voice cloning, voice styles |
| Music | Suno API | AI music generation |
| Beat Detection | aubio | Beat/onset detection for music sync |
| Stock Media | Pexels API | Free stock footage and images |
| Sound Effects | Local library + freesound.org | SFX for AI sound effects |
| Storage | Local filesystem (dev) → R2 (prod) | File storage |

---

## 3. The Brain — Claude API Decision Engine

### How it works:

1. User submits: prompt + files (optional) + selected options + edit style + brand kit
2. Backend sends to Claude API:
   - User's prompt
   - File metadata (names, sizes, count, types — including PDF/Doc if uploaded)
   - User's selected options from UI (model, duration, edit style, caption template, voice style)
   - Available features catalog (95 features with descriptions)
   - Brand kit (if saved)
3. Claude returns: ExecutionPlan (JSON)
4. Orchestrator executes only the selected features

### ExecutionPlan JSON Structure:

```typescript
interface ExecutionPlan {
  mode: 'raw' | 'prompt-only';
  
  ingest: {
    transcribe: boolean;
    multiCamSync: boolean;
    lipSyncVerify: boolean;
    footageClassification: boolean;
    shotSelection: boolean;
    smartVariety: boolean;
    speakerClassification: boolean;
  };
  
  clean: {
    removeSilences: boolean;
    silenceThreshold: number;
    removeFillerWords: boolean;
    fillerWordsList: string[];
    selectBestTake: boolean;
    removeShakyBRoll: boolean;
  };
  
  analyze: {
    hookDetection: boolean;
    hookCount: number;
    quoteDetection: boolean;
    scenePlanning: boolean;
    brandVoice: boolean;
    mediaIntelligence: boolean;
    viralityScore: boolean;
    aiScriptGenerator: boolean;
  };
  
  generate: {
    broll: boolean;
    brollModel: 'veo-3.1-fast' | 'sora-2' | 'kling-v2.5-turbo' | 'wan-2.5' | 'seedance-1.5-pro';
    brollFromTranscript: boolean;
    videoToVideo: boolean;
    generativeExtend: boolean;
    aiBackground: boolean;
    aiVoiceover: boolean;
    voiceoverStyle?: 'narrator' | 'educator' | 'persuader' | 'coach' | 'motivator';
    voiceClone: boolean;
    voiceCloneSourceFile?: string;
    talkingPhoto: boolean;
    thumbnail: boolean;
    stockFootageSearch: boolean;
    animateReplace: boolean;
    motionTransfer: boolean;
    faceSwap: boolean;
    lipsync: boolean;
    motionControl: boolean;
    cameraControls: boolean;
    multiShotSequences: boolean;
    firstLastFrame: boolean;
    musicGeneration: boolean;
    musicMood?: 'energetic' | 'calm' | 'dramatic' | 'business' | 'trendy';
    musicStemSeparation: boolean;
    textToVFX: boolean;
    textToVFXPrompts?: string[];
    aiObjectAddReplace: boolean;
    visualDNA: boolean;
    multiModelComparison: boolean;
    automatedModelSelection: boolean;
    aiTwin: boolean;
    aiTwinSourceImage?: string;
    aiDubbing: boolean;
    aiDubbingTargetLanguage?: string;
    aiSoundEffects: boolean;
  };
  
  edit: {
    autoAngleSwitching: boolean;
    angleSwitchInterval: number;
    shotSelection: boolean;
    smartVariety: boolean;
    beatSyncCuts: boolean;
    beatMode?: 'kicks' | 'drums' | 'combined';
    pacing: 'fast' | 'normal' | 'calm';
    musicSync: boolean;
    vfxAuto: boolean;
    vfxTypes?: ('camera-shake' | 'transition' | 'overlay' | 'crt' | 'film-burn' | 'glitch')[];
    colorGrading: boolean;
    colorGradingStyle?: 'cinematic' | 'bright' | 'moody' | 'vintage' | 'clean';
    colorMatchCameras: boolean;
    skinToneCorrection: boolean;
    lightingEnhancement: boolean;
    subtitles: boolean;
    subtitleStyle?: 'animated' | 'simple' | 'karaoke';
    subtitlePosition?: 'bottom' | 'center' | 'smart';
    subtitleHighlightKeywords: boolean;
    captionTemplate?: string;
    lowerThirds: boolean;
    lowerThirdsName?: string;
    lowerThirdsTitle?: string;
    smartZooms: boolean;
    zoomStyle?: 'subtle' | 'punch' | 'ken-burns';
    eyeContactCorrection: boolean;
    music: boolean;
    musicSource?: 'library' | 'ai-generated';
    autoDucking: boolean;
    enhanceSpeech: boolean;
    noiseReduction: boolean;
    presenterSeparation: boolean;
    backgroundBlur: boolean;
    objectMasking: boolean;
    upscaling: boolean;
    logoWatermark: boolean;
    logoFile?: string;
    cta: boolean;
    ctaText?: string;
    ctaPosition?: 'end' | 'middle' | 'both';
    effectsLibrary: boolean;
    effectsPreset?: string;
    chatBasedEditor: boolean;
    editStyle?: 'cinematic' | 'energetic' | 'minimal' | 'trendy';
    kineticTypography: boolean;
    photoMotion: boolean;
    photoMotionStyle?: 'ken-burns' | 'zoom' | 'pan';
  };
  
  export: {
    formats: ('16:9' | '9:16' | '1:1')[];
    aiReframe: boolean;
    targetDuration: number | 'auto';
    generateThumbnail: boolean;
    highBitrate4K: boolean;
    customTheme: boolean;
    themeColors?: { primary: string; secondary: string };
    themeFont?: string;
  };
  
  templates: {
    brandKit: boolean;
    brandKitId?: string;
    ecommerceTemplate: boolean;
    digitalSocialTemplate: boolean;
    multiPageStories: boolean;
    storyPageCount?: number;
    sourceDocumentImport: boolean;
    sourceDocumentFile?: string;
    trendingSounds: boolean;
  };
}
```

---

## 4. All 95 Features — Organized by Pipeline Stage

### Stage 1 — Ingest, Sync & Classify (13 features)
| # | Feature | API/Tool |
|---|---------|----------|
| 1 | Transcription (Hebrew) | Deepgram Nova-3 |
| 2 | Text-based editing | Claude + FFmpeg |
| 3 | Silence removal | FFmpeg silencedetect |
| 4 | Filler word removal (Hebrew) | Claude + FFmpeg |
| 5 | Best take selection | Claude API |
| 6 | Shaky B-Roll removal | FFmpeg vidstabdetect |
| 7 | Multi-cam sync (waveform) | FFmpeg |
| 8 | Speaker classification | Deepgram diarization |
| 9 | Lip-sync verification | Claude Vision |
| 10 | Auto angle switching | Claude + FFmpeg |
| 11 | Footage classification | Claude Vision |
| 12 | AI Shot selection | Claude Vision |
| 13 | Smart variety engine | Claude API |

### Stage 2 — Analyze & Plan (8 features)
| # | Feature | API/Tool |
|---|---------|----------|
| 14 | Hook detection | Claude API |
| 15 | Quote finder | Claude API |
| 16 | Genre-aware pacing | Claude API |
| 17 | Scene planning (prompt-only) | Claude API |
| 18 | Brand voice | Claude API |
| 19 | Media intelligence | Claude Vision |
| 20 | Virality score | Claude API |
| 21 | AI Script generator | Claude API |

### Stage 3 — AI Content Generation (24 features)
| # | Feature | API/Tool |
|---|---------|----------|
| 22 | B-Roll generation | KIE.ai |
| 23 | B-Roll prompts from transcript | Claude API |
| 24 | B-Roll smart timing | Claude API |
| 25 | Video-to-Video style transfer | KIE.ai |
| 26 | Generative Extend | KIE.ai |
| 27 | AI background image | KIE.ai |
| 28 | AI Voiceover / Narration | ElevenLabs |
| 29 | Talking Photo / Avatar | KIE.ai |
| 30 | Thumbnail generation | Claude Vision + KIE.ai |
| 31 | Stock footage search | Pexels API |
| 32 | Animate Replace (character swap) | KIE.ai |
| 33 | Motion Transfer | KIE.ai |
| 34 | Face Swap | KIE.ai |
| 35 | Lipsync | KIE.ai |
| 36 | Motion Control / Paint Motion | KIE.ai |
| 37 | Camera Controls in AI video | KIE.ai |
| 38 | Multi-shot sequences | KIE.ai |
| 39 | First-Last Frame | KIE.ai |
| 40 | Voice Cloning | ElevenLabs |
| 41 | AI Twin / AI Actor | KIE.ai + ElevenLabs |
| 42 | AI Dubbing (translate+voice+lipsync) | Claude + ElevenLabs + KIE.ai |
| 43 | AI Music Generation | Suno API |
| 44 | Music Stem Separation | Demucs / Audio API |
| 45 | AI Sound Effects | Claude + SFX library |

### Stage 4 — Edit & Assemble (28 features)
| # | Feature | API/Tool |
|---|---------|----------|
| 46 | Beat-synced cuts | aubio + FFmpeg |
| 47 | Kick vs drum cut modes | aubio |
| 48 | 3 pacing modes (fast/normal/calm) | Claude + FFmpeg |
| 49 | Auto VFX (shakes, transitions, overlays) | FFmpeg |
| 50 | Text-to-VFX ("add fire", "add rain") | KIE.ai |
| 51 | AI Object Add/Replace | KIE.ai |
| 52 | Effects library with preview | Local assets |
| 53 | Color grading (LUT) | FFmpeg |
| 54 | Color match cameras | FFmpeg |
| 55 | Skin tone correction | FFmpeg |
| 56 | Lighting enhancement | FFmpeg |
| 57 | Hebrew animated subtitles (RTL) | Remotion / FFmpeg |
| 58 | Smart subtitle positioning | Claude Vision + FFmpeg |
| 59 | Lower thirds (name + title) | Remotion / FFmpeg |
| 60 | Smart zooms (content-based) | Claude + FFmpeg |
| 61 | Eye contact correction | KIE.ai |
| 62 | Music + auto-ducking | FFmpeg |
| 63 | Enhance speech | FFmpeg |
| 64 | Noise reduction | FFmpeg |
| 65 | Presenter-background separation | KIE.ai / FFmpeg |
| 66 | Background blur | FFmpeg |
| 67 | Object masking | KIE.ai |
| 68 | Upscaling HD→4K | KIE.ai |
| 69 | Logo watermark | FFmpeg |
| 70 | CTA animation | Remotion / FFmpeg |
| 71 | Chat-based editor | Claude API |
| 72 | One-tap edit styles (4 presets) | JSON presets |
| 73 | Caption templates library (100+) | Remotion components |
| 74 | AI Music Sync (all elements to beat) | aubio + FFmpeg |
| 75 | Kinetic typography | Remotion |
| 76 | Photo motion effects | FFmpeg zoompan |
| 77 | Voiceover voice styles (5 styles) | ElevenLabs |
| 78 | Custom video themes | JSON themes |

### Stage 5 — Export & Deliver (6 features)
| # | Feature | API/Tool |
|---|---------|----------|
| 79 | Multi-format export (16:9, 9:16, 1:1) | FFmpeg |
| 80 | AI Reframe (face-centered crop) | FFmpeg + face detection |
| 81 | Duration control | Claude + FFmpeg |
| 82 | Thumbnail export | Claude Vision |
| 83 | High-bitrate 4K/60fps export | FFmpeg |
| 84 | Direct social publish | Platform APIs |

### Stage 6 — Revisions & History (4 features)
| # | Feature | API/Tool |
|---|---------|----------|
| 85 | Version history | Server |
| 86 | Timecode revisions | Claude + FFmpeg |
| 87 | Prompt revisions | Claude + FFmpeg |
| 88 | Duration change | Claude + FFmpeg |

### Stage 7 — Templates & Workflow (7 features)
| # | Feature | API/Tool |
|---|---------|----------|
| 89 | Preset templates (10 types) | JSON configs |
| 90 | Brand kit (colors, fonts, logo) | localStorage + server |
| 91 | E-commerce templates | Remotion |
| 92 | Digital/Social templates | Remotion |
| 93 | Multi-page stories | Remotion |
| 94 | Source document import (PDF→video) | Claude + pipeline |
| 95 | Trending sounds integration | Audio API / curated |

---

## 5. Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (React)                    │
│  Upload → Prompt → Presets → Edit Style → Options    │
│  Model Select → Duration → Logo → Brand Kit          │
│  Caption Template → Voice Style → Document Upload    │
│  Video Player → Chat Editor → Revisions → History    │
│  Virality Score → Timeline → Multi-format Export     │
└─────────────────────┬────────────────────────────────┘
                      │ REST API
┌─────────────────────▼────────────────────────────────┐
│                  Express Backend                      │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              THE BRAIN (Claude API)              │ │
│  │  Receives: prompt + files + options + brand kit  │ │
│  │  Returns: ExecutionPlan JSON (which of 95 to run)│ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                 │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │           ORCHESTRATOR (orchestrator.ts)          │ │
│  │  Reads ExecutionPlan → runs only selected steps  │ │
│  │  Handles errors per step (retry 3x, skip, report)│ │
│  │  Reports progress to frontend via polling        │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                 │
│  ┌─────┬─────┬──────┬──────┬──────┬──────┬────────┐ │
│  │Ingest│Clean│Analyze│Generate│Edit │Export│Revise │ │
│  │Agent │Agent│Agent  │Agent   │Agent│Agent│Agent  │ │
│  └─────┴─────┴──────┴──────┴──────┴──────┴────────┘ │
│                                                       │
│  Services: deepgram.ts, claude.ts, kie.ts,           │
│  ffmpeg.ts, elevenlabs.ts, suno.ts, stockMedia.ts,   │
│  soundEffects.ts, stems.ts                            │
└──────────────────────────────────────────────────────┘
```

---

## 6. API Endpoints

```
POST   /api/jobs                    — Create job (multipart: files + prompt + options)
GET    /api/jobs/:id                — Get job status + progress + virality score
GET    /api/jobs/:id/video          — Download result video
GET    /api/jobs/:id/versions       — List all versions
GET    /api/jobs/:id/versions/:vid  — Download specific version
POST   /api/jobs/:id/revisions      — Submit revision (prompt, timecode, duration)
POST   /api/jobs/:id/chat           — Chat-based editing (send edit command)
GET    /api/jobs                    — List all jobs
GET    /api/models                  — Available AI models
GET    /api/effects                 — Available effects presets
GET    /api/music                   — Available music library
GET    /api/caption-templates       — Caption template previews
GET    /api/edit-styles             — Edit style presets
POST   /api/brand-kit              — Save brand kit
GET    /api/brand-kit              — Get saved brand kit
```

---

## 7. File Structure

```
video-agents-app/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── CLAUDE.md
├── SPEC.md
│
├── server/
│   ├── index.ts
│   ├── types.ts                     # All TypeScript types (95 features)
│   │
│   ├── brain/
│   │   ├── brain.ts
│   │   ├── systemPrompt.ts          # 35 keyword rules
│   │   └── planValidator.ts
│   │
│   ├── orchestrator/
│   │   ├── orchestrator.ts
│   │   ├── stepRunner.ts
│   │   └── progressTracker.ts
│   │
│   ├── agents/
│   │   ├── ingest.ts
│   │   ├── clean.ts
│   │   ├── analyze.ts
│   │   ├── generate.ts
│   │   ├── edit.ts
│   │   ├── export.ts
│   │   └── revise.ts
│   │
│   ├── services/
│   │   ├── deepgram.ts
│   │   ├── claude.ts
│   │   ├── kie.ts                   # 16+ endpoints
│   │   ├── ffmpeg.ts                # 20+ functions
│   │   ├── elevenlabs.ts
│   │   ├── suno.ts
│   │   ├── stockMedia.ts
│   │   ├── soundEffects.ts
│   │   └── stems.ts
│   │
│   ├── store/
│   │   ├── jobStore.ts
│   │   └── versionStore.ts
│   │
│   ├── routes/
│   │   ├── jobs.ts
│   │   ├── models.ts
│   │   ├── effects.ts
│   │   └── brandKit.ts
│   │
│   └── assets/
│       ├── luts/                    # 5 LUT files
│       ├── music/                   # 10 tracks by mood
│       ├── effects/                 # VFX presets
│       ├── sfx/                     # 20-30 sound effects
│       └── fonts/                   # Hebrew fonts
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── EditorPage.tsx
│   │   ├── ProcessingPage.tsx
│   │   └── ResultPage.tsx
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   ├── PromptInput.tsx
│   │   ├── PresetSelector.tsx       # 10 presets
│   │   ├── ModelSelector.tsx
│   │   ├── ProOptions.tsx           # 17 options
│   │   ├── DurationPicker.tsx
│   │   ├── LogoUpload.tsx
│   │   ├── EditStyleSelector.tsx    # 4 styles
│   │   ├── CaptionTemplatePicker.tsx # 8-10 templates
│   │   ├── VoiceoverStyleSelector.tsx # 5 styles
│   │   ├── SourceDocumentUpload.tsx
│   │   ├── AITwinPhotoUpload.tsx
│   │   ├── BrandKitEditor.tsx
│   │   ├── LanguageSelector.tsx
│   │   ├── StoryPageCount.tsx
│   │   ├── ProgressTimeline.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── RevisionPanel.tsx        # 4 tabs (general, timecode, duration, chat)
│   │   ├── ChatEditor.tsx
│   │   ├── VersionHistory.tsx
│   │   ├── TimelinePreview.tsx
│   │   └── ViralityScore.tsx
│   └── store/
│       └── useJobStore.ts
│
├── uploads/
├── output/
└── temp/
```

---

## 8. Frontend Pages Detail

### HomePage
- 2 cards: "העלה קובץ" / "צור מפרומפט" (dark theme, purple/blue gradients)

### EditorPage
- **File upload** — drag & drop, multiple files (raw mode only)
- **Source document upload** — PDF/Word (prompt-only mode only)
- **AI Twin photo upload** — selfie for avatar (prompt-only mode only)
- **Prompt input** with **10 presets**: פרסומת אינסטגרם, סרטון תדמית, מכירת מוצר, טיקטוק, נדל"ן, עדויות, חופשי, סטורי מרובה דפים, סרטון ממסמך, דיבוב ותרגום
- **Model selector** — 5 AI models with speed/quality/cost
- **Edit style selector** — 4 cards: סינמטי / אנרגטי / מינימלי / טרנדי (optional, Brain auto-picks if none)
- **Pro options** — 17 toggles in grid: תמונת רקע AI, טשטוש רקע, סינמטי, הגברת אנרגיה, שמירה על קשר עין, הסרת שתיקות, כתוביות בעברית, רגוע ומקצועי, מוזיקת רקע אנרגטית, מוזיקת רקע רגועה, טרנדי, שם ותפקיד, אפקטי סאונד AI, ציון ויראליות, טקסט מונפש, סנכרון מוזיקה מלא, סאונדים טרנדיים
- **Caption template picker** — 8-10 styles (only if subtitles enabled)
- **Voiceover style selector** — 5 styles (prompt-only mode only)
- **Language selector** — target language for dubbing (only if dubbing preset)
- **Story page count** — 3/4/5 pages (only if stories preset)
- **Duration picker** — 15s, 30s, 60s, 90s, AI בוחר
- **Logo upload**
- **Brand kit** — collapsible section: colors, font, save/load
- **Project name**
- **Submit button**

### ProcessingPage
- Overall progress bar
- Step timeline with status per step
- "הפיצ'רים שנבחרו (X מתוך 95)" collapsible section
- Auto-redirect to result when done

### ResultPage
- **Virality score** — 0-100 with sub-scores and improvement tips (if enabled)
- **Video player** with version badge
- **Timeline preview** — color-coded segments
- **Revision panel** — 4 tabs: תיקון כללי / שניות מסוימות / שינוי משך / עריכה בצ'אט
- **Chat editor** — type edit commands in Hebrew
- **Version history** — all versions with preview/download/revert
- **Export format selector** — 16:9, 9:16, 1:1
- **Download button**

---

## 9. Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=...
KIE_API_KEY=...
ELEVENLABS_API_KEY=...
SUNO_API_KEY=...
PEXELS_API_KEY=...
PORT=3001
UPLOAD_DIR=./uploads
OUTPUT_DIR=./output
TEMP_DIR=./temp
FFMPEG_PATH=ffmpeg
```

---

## 10. Build Phases

### Phase 1 — Foundation (UI + Server + Job System)
All frontend pages with full 95-feature UI. Simulated pipeline. No real AI.

### Phase 2 — The Brain
Claude API integration. 35 keyword rules. ExecutionPlan generation. Plan validation.

### Phase 3 — Ingest & Clean
Deepgram transcription. Silence/filler removal. Best take selection. Multi-cam sync. Footage classification. Shot selection. Smart variety.

### Phase 4 — AI Content Generation
KIE.ai (B-Roll, lipsync, face swap, motion, VFX, upscale). ElevenLabs (voice, cloning, styles). Suno (music). AI twin pipeline. AI dubbing pipeline. Sound effects. Stock media.

### Phase 5 — Edit Core
FFmpeg assembly. Subtitles (Remotion). Color grading. Background blur. Smart zooms. Music + ducking. Logo. Noise reduction. Speech enhancement. Photo motion.

### Phase 6 — Edit Advanced
Beat-sync cuts. Music sync (all elements). Kinetic typography. Chat-based editor. Edit styles. Virality score. Auto angle switching. Color matching. VFX effects. CTA animation. Lower thirds.

### Phase 7 — Export & Revisions
Multi-format export. AI reframe. 4K/60fps. Custom themes. Version system. Revision pipeline. Thumbnail.

### Phase 8 — Advanced AI
Voice cloning. AI music. Lipsync. Face swap. Motion transfer. Video-to-Video. Text-to-VFX. AI object add/replace. Talking photo. Generative extend. Eye contact. Upscaling. Visual DNA. Multi-model comparison.

### Phase 9 — Prompt-Only Mode & Templates
Prompt-only pipeline. Source document import. Brand kit. E-commerce templates. Digital/social templates. Multi-page stories. Trending sounds. Effects library. Caption templates (100+). AI script generator.
