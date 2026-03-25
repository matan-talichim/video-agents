# CLAUDE.md — Video Agents Project Conventions

## Project Overview
AI-powered video editing system with 95 features and a smart "Brain" (Claude API) that decides which features to activate per job. Based on research of 15 competing platforms.

## Architecture
- Frontend: React + TypeScript + Vite + Tailwind (Hebrew RTL, dark theme)
- Backend: Express.js (TypeScript)
- Brain: Claude API → receives prompt + files + options → returns ExecutionPlan JSON
- Orchestrator: reads plan → runs only enabled agents in order
- Agents: ingest, clean, analyze, generate, edit, export, revise
- Services: deepgram, claude, kie, ffmpeg, elevenlabs, suno, stockMedia, soundEffects, stems

## Key Principles
1. **Brain-first**: Every job starts with Claude API generating an ExecutionPlan
2. **Only run what's needed**: Never run all 95 features — only the ones the Brain selects
3. **Each feature = one function**: Standalone function with clear input/output
4. **Retry on failure**: Every API call retries 3x with exponential backoff. If fails → skip + log, never crash pipeline
5. **Progress tracking**: Each step reports progress. Frontend polls every 2 seconds
6. **Version history**: Every completed job creates a version. Revisions create new versions
7. **Cost efficiency**: Brain prefers free tools (Pexels, FFmpeg) over paid APIs when quality is equivalent

## Feature Count: 95
- Stage 1: Ingest & Classify (13 features)
- Stage 2: Analyze & Plan (8 features)
- Stage 3: AI Content Generation (24 features)
- Stage 4: Edit & Assemble (28 features)
- Stage 5: Export & Deliver (6 features)
- Stage 6: Revisions & History (4 features)
- Stage 7: Templates & Workflow (7 features)
- Stage 8: (included in stages above): virality score, chat editor, edit styles, brand kit, music sync, kinetic typography, AI twin, AI dubbing, AI sound effects, caption templates

## Coding Standards
- TypeScript strict mode
- All UI text in Hebrew (RTL direction)
- Dark theme: #0a0a12 background, purple/blue gradients, subtle borders
- Use Tailwind CSS for ALL styling
- File naming: camelCase for files, PascalCase for React components
- Use async/await, never raw callbacks
- Log every API call: start + end + duration + cost estimate
- Handle FFmpeg errors by parsing stderr
- Never hardcode API keys — always from .env

## File Locations
- User uploads: `uploads/{jobId}/`
- Temp processing: `temp/{jobId}/`
- Final output: `output/{jobId}/`
- Versions: `output/{jobId}/v{N}.mp4`
- Thumbnails: `output/{jobId}/thumbnail.jpg`
- Transcripts: `temp/{jobId}/transcript.json`
- Plans: `temp/{jobId}/plan.json`
- Generated content: `temp/{jobId}/generated/`

## API Keys (from .env)
- ANTHROPIC_API_KEY — Claude API (Brain + analysis + planning)
- DEEPGRAM_API_KEY — Transcription (Hebrew)
- KIE_API_KEY — Video generation (B-Roll, lipsync, face swap, motion, VFX, upscale)
- ELEVENLABS_API_KEY — Voice (TTS, cloning, voice styles)
- SUNO_API_KEY — Music generation
- PEXELS_API_KEY — Stock footage search (free)

## External Tools
- FFmpeg — video/audio processing (must be installed on system)
- aubio — beat/onset detection (Python, install via pip)
- Demucs — music stem separation (Python, install via pip)
- Remotion — animated subtitles, kinetic typography, templates (npm package)

## Build Phases (9 phases)
1. Foundation (full UI for 95 features + simulated pipeline)
2. Brain (Claude API decision engine with 35 keyword rules)
3. Ingest & Clean (Deepgram + FFmpeg + Claude Vision)
4. AI Content Generation (KIE.ai + ElevenLabs + Suno + stock)
5. Edit Core (FFmpeg assembly + Remotion subtitles)
6. Edit Advanced (beat-sync + music sync + chat editor + styles + virality)
7. Export & Revisions (multi-format + 4K + themes + versions)
8. Advanced AI (voice clone + lipsync + face swap + VFX + motion)
9. Prompt-Only Mode + Templates (document import + brand kit + e-commerce + stories)

## Important Conventions
- Every feature function must handle its own errors and return gracefully
- Never crash the pipeline because one feature failed
- Progress must be reported at each sub-step (not just per major stage)
- The Brain's ExecutionPlan is the single source of truth for what runs
- All video processing goes through FFmpeg service (never call ffmpeg directly)
- All AI generation goes through respective service wrappers (never call APIs directly)
- Clean up temp files after job completes successfully
- Maximum job duration: 30 minutes timeout
