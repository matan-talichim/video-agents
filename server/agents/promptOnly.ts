import { askClaude } from '../services/claude.js';
import * as kie from '../services/kie.js';
import * as elevenlabs from '../services/elevenlabs.js';
import * as suno from '../services/suno.js';
import * as stockMedia from '../services/stockMedia.js';
import { runFFmpeg } from '../services/ffmpeg.js';
import { generateAITwin } from './generateAdvanced.js';
import { updateJob } from '../store/jobStore.js';
import type { Job, ExecutionPlan } from '../types.js';
import fs from 'fs';

interface ScenePlan {
  scene_number: number;
  section: string;
  narration_text: string;
  duration_seconds: number;
  visual_description: string;
  camera_movement: string;
  mood: string;
  text_overlay?: string;
  broll_prompt: string;
}

export interface PromptOnlyResult {
  videoPath: string;
  scenes: ScenePlan[];
  voiceoverPath: string;
  musicPath: string | null;
  sceneClips: string[];
  duration: number;
}

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
  console.log(`[Prompt-Only] ${job.id}: ${step}`);
}

function logApiCall(service: string, action: string, startTime: number, cost?: number): void {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[${service}] ${action} — ${duration}s${cost ? ` — est. $${cost.toFixed(4)}` : ''}`);
}

export async function runPromptOnlyPipeline(
  job: Job,
  plan: ExecutionPlan
): Promise<PromptOnlyResult> {
  const genDir = `temp/${job.id}/generated`;
  const editDir = `temp/${job.id}/edit`;
  fs.mkdirSync(genDir, { recursive: true });
  fs.mkdirSync(editDir, { recursive: true });

  // === STEP 1: GENERATE SCRIPT ===
  updateProgress(job, 'יצירת תסריט...');

  const scriptPrompt = plan.templates.sourceDocumentImport && (job as any).sourceDocumentContent
    ? `Create a video script based on this document content:\n\n${(job as any).sourceDocumentContent}\n\nUser's additional instructions: "${job.prompt}"`
    : job.prompt;

  const startScript = Date.now();
  const scriptResponse = await askClaude(
    'You write professional video scripts in Hebrew for marketing videos.',
    `Write a complete video script for: "${scriptPrompt}"

Duration target: ${plan.export.targetDuration || 60} seconds.
Tone: ${plan.generate.voiceoverStyle || 'narrator'}
Platform: ${plan.export.formats.includes('9:16') ? 'TikTok/Reels (short, punchy)' : 'YouTube (detailed)'}

Return JSON array: [{
  "scene_number": 1,
  "section": "hook",
  "narration_text": "Hebrew text that the voiceover will say",
  "duration_seconds": 3,
  "visual_description": "Detailed cinematic description for AI video generation",
  "camera_movement": "static" | "pan-left" | "zoom-in" | "aerial" | "dolly-forward",
  "mood": "dramatic" | "energetic" | "calm" | "inspiring",
  "text_overlay": "Optional text to show on screen (Hebrew)",
  "broll_prompt": "Detailed prompt for generating the visual clip with AI"
}]

Include: hook (3s), introduction (10-15s), main content (sections), CTA (5s), closing.
Make broll_prompts very detailed and cinematic: "Cinematic aerial drone shot of modern luxury apartment building at golden hour, 4K, shallow depth of field, slow dolly forward"
Language: Hebrew for narration_text and text_overlay.`
  );
  logApiCall('Claude', 'Script generation', startScript, 0.02);

  let scenes: ScenePlan[];
  try {
    scenes = JSON.parse(scriptResponse);
  } catch {
    // Fallback: create a simple 3-scene plan
    scenes = [
      { scene_number: 1, section: 'hook', narration_text: job.prompt.slice(0, 50), duration_seconds: 5, visual_description: 'Opening shot', camera_movement: 'zoom-in', mood: 'dramatic', broll_prompt: `Cinematic opening shot related to: ${job.prompt}` },
      { scene_number: 2, section: 'main', narration_text: job.prompt, duration_seconds: 20, visual_description: 'Main content', camera_movement: 'static', mood: 'calm', broll_prompt: `Professional footage related to: ${job.prompt}` },
      { scene_number: 3, section: 'cta', narration_text: 'צרו קשר עוד היום', duration_seconds: 5, visual_description: 'Call to action', camera_movement: 'static', mood: 'energetic', broll_prompt: `Closing shot with energy` },
    ];
  }

  console.log(`[Prompt-Only] Script: ${scenes.length} scenes, total ~${scenes.reduce((a, s) => a + s.duration_seconds, 0)}s`);

  // === STEP 2: GENERATE VOICEOVER ===
  updateProgress(job, 'יצירת קריינות...');

  const fullNarration = scenes.map(s => s.narration_text).join(' ');
  const voiceoverPath = `${genDir}/voiceover.mp3`;

  let voiceId: string | undefined;
  if (plan.generate.voiceClone && plan.generate.voiceCloneSourceFile) {
    try {
      const startClone = Date.now();
      voiceId = await elevenlabs.cloneVoice(`po_${job.id}`, [plan.generate.voiceCloneSourceFile]);
      logApiCall('ElevenLabs', 'Voice cloning', startClone, 0.05);
    } catch (error: any) {
      console.error('Voice cloning failed for prompt-only:', error.message);
    }
  }

  const startTTS = Date.now();
  await elevenlabs.textToSpeech(
    fullNarration,
    voiceoverPath,
    voiceId,
    plan.generate.voiceoverStyle || 'narrator'
  );
  logApiCall('ElevenLabs', 'TTS generation', startTTS, 0.01);

  // === STEP 3: CHECK IF AI TWIN MODE ===
  let mainVideoFromTwin: string | null = null;

  if (plan.generate.aiTwin) {
    try {
      updateProgress(job, 'יצירת אווטאר AI...');
      const startTwin = Date.now();
      const twinResult = await generateAITwin(job, plan, genDir);
      logApiCall('KIE', 'AI Twin generation', startTwin, 0.10);
      if (twinResult.success && twinResult.videoPath) {
        mainVideoFromTwin = twinResult.videoPath;
      }
    } catch (error: any) {
      console.error('AI Twin in prompt-only failed:', error.message);
    }
  }

  // === STEP 4: GENERATE VIDEO CLIPS FOR EACH SCENE ===
  updateProgress(job, 'יצירת קליפים...');

  const sceneClips: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    updateProgress(job, `יצירת קליפ ${i + 1}/${scenes.length}...`);

    const clipPath = `${genDir}/scene_${i}.mp4`;

    try {
      const startGen = Date.now();

      // Try AI generation first
      if (plan.generate.multiShotSequences && scenes.length <= 4) {
        // Use multi-shot for short videos
        if (i === 0) {
          const allPrompts = scenes.map(s => s.broll_prompt).join('. Next scene: ');
          await kie.multiShotSequence(allPrompts, scenes.length, `${genDir}/multi_shot_all.mp4`);
          // Split the multi-shot video into individual scenes
          // For now, use individual generation as fallback
        }
      }

      // Generate with camera controls if specified
      if (scene.camera_movement && scene.camera_movement !== 'static') {
        await kie.generateWithCamera(
          scene.broll_prompt,
          scene.camera_movement,
          scene.duration_seconds,
          clipPath
        );
      } else {
        await kie.generateVideo(
          scene.broll_prompt,
          plan.generate.brollModel,
          scene.duration_seconds,
          clipPath
        );
      }

      logApiCall('KIE', `Scene ${i} generation`, startGen, 0.03);
      sceneClips.push(clipPath);
    } catch (error: any) {
      console.error(`Scene ${i} generation failed:`, error.message);

      // Fallback: try stock footage
      try {
        const keyword = scene.visual_description.split(' ').slice(0, 3).join(' ');
        const stockResults = await stockMedia.searchVideos(keyword, 1);
        if (stockResults.length > 0) {
          const stockPath = `${genDir}/scene_${i}_stock.mp4`;
          await stockMedia.downloadMedia(stockResults[0].downloadUrl, stockPath);
          // Trim to scene duration
          await runFFmpeg(`ffmpeg -i "${stockPath}" -t ${scene.duration_seconds} -c copy -y "${clipPath}"`);
          sceneClips.push(clipPath);
        } else {
          // Last resort: generate a color placeholder
          await runFFmpeg(`ffmpeg -f lavfi -i "color=c=black:s=1920x1080:d=${scene.duration_seconds}" -c:v libx264 -y "${clipPath}"`);
          sceneClips.push(clipPath);
        }
      } catch (stockError: any) {
        console.error(`Stock fallback also failed for scene ${i}:`, stockError.message);
        // Generate black placeholder
        await runFFmpeg(`ffmpeg -f lavfi -i "color=c=black:s=1920x1080:d=${scene.duration_seconds}" -c:v libx264 -y "${clipPath}"`);
        sceneClips.push(clipPath);
      }
    }
  }

  // === STEP 5: GENERATE MUSIC ===
  let musicPath: string | null = null;

  if (plan.generate.musicGeneration) {
    try {
      updateProgress(job, 'יצירת מוזיקה...');
      const totalDuration = scenes.reduce((a, s) => a + s.duration_seconds, 0);
      const mood = plan.generate.musicMood || 'energetic';
      musicPath = `${genDir}/music.mp3`;
      const startMusic = Date.now();
      await suno.generateMusic(
        `${mood} background music for a professional ${plan.export.formats.includes('9:16') ? 'social media' : 'corporate'} video, no lyrics`,
        totalDuration,
        true,
        musicPath
      );
      logApiCall('Suno', 'Music generation', startMusic, 0.05);
    } catch (error: any) {
      console.error('Music generation failed:', error.message);
      // Use library music
      const mood = plan.generate.musicMood || 'energetic';
      const libraryPath = `server/assets/music/${mood}_01.mp3`;
      if (fs.existsSync(libraryPath)) {
        musicPath = libraryPath;
      }
    }
  } else if (plan.edit.music) {
    const mood = plan.generate.musicMood || 'energetic';
    const libraryPath = `server/assets/music/${mood}_01.mp3`;
    if (fs.existsSync(libraryPath)) {
      musicPath = libraryPath;
    }
  }

  // === STEP 6: ASSEMBLE ===
  updateProgress(job, 'הרכבת הסרטון...');

  // Concat all scene clips
  const concatListPath = `${editDir}/scene_concat.txt`;
  fs.writeFileSync(concatListPath, sceneClips.map(c => `file '${c}'`).join('\n'));

  const assembledPath = `${editDir}/assembled.mp4`;
  await runFFmpeg(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -c:a aac -y "${assembledPath}"`);

  // If AI Twin video exists, use it as main (or intercut with B-Roll scenes)
  let mainVideo = mainVideoFromTwin || assembledPath;

  // Add voiceover to assembled video
  const withVoicePath = `${editDir}/with_voice.mp4`;
  await runFFmpeg(`ffmpeg -i "${mainVideo}" -i "${voiceoverPath}" -map 0:v -map 1:a -c:v copy -shortest -y "${withVoicePath}"`);
  mainVideo = withVoicePath;

  // Add music if available
  if (musicPath) {
    const withMusicPath = `${editDir}/with_music.mp4`;
    const musicVolume = plan.edit.autoDucking ? 0.12 : 0.15;
    await runFFmpeg(`ffmpeg -i "${mainVideo}" -i "${musicPath}" -filter_complex "[1:a]volume=${musicVolume}[music];[0:a][music]amix=inputs=2:duration=first" -map 0:v -c:v copy -y "${withMusicPath}"`);
    mainVideo = withMusicPath;
  }

  return {
    videoPath: mainVideo,
    scenes,
    voiceoverPath,
    musicPath,
    sceneClips,
    duration: scenes.reduce((a, s) => a + s.duration_seconds, 0),
  };
}
