import fs from 'fs';
import * as kie from '../services/kie.js';
import * as elevenlabs from '../services/elevenlabs.js';
import { askClaude } from '../services/claude.js';
import { runFFmpeg } from '../services/ffmpeg.js';
import { updateJob } from '../store/jobStore.js';
import type { Job, ExecutionPlan, TranscriptResult } from '../types.js';

export interface AITwinResult {
  success: boolean;
  videoPath: string | null;
  scriptText: string;
  voiceId?: string;
  voiceoverPath?: string;
}

export interface AIDubbingResult {
  success: boolean;
  translatedText: string;
  audioPath: string;
  videoPath: string | null;
  targetLanguage: string;
  lipsyncFailed?: boolean;
}

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
  console.log(`[GenerateAdvanced] ${job.id}: ${step}`);
}

// Full AI Twin pipeline: selfie → avatar model → script → speech → talking head video
export async function generateAITwin(
  job: Job,
  plan: ExecutionPlan,
  genDir: string
): Promise<AITwinResult> {
  console.log('[AI Twin] Starting full pipeline...');

  // Step 1: Get or generate script
  let scriptText: string;
  if (job.generateResult?.additionalAssets?.script) {
    scriptText = (job.generateResult.additionalAssets.script as Array<{ text: string }>)
      .map((s) => s.text)
      .join(' ');
  } else {
    // Generate script from prompt
    const targetDuration = typeof plan.export.targetDuration === 'number'
      ? plan.export.targetDuration : 60;
    const scriptResponse = await askClaude(
      'You write professional video scripts in Hebrew.',
      `Write a natural-sounding script for a person speaking to camera about: "${job.prompt}"
Duration target: ${targetDuration} seconds.
Tone: ${plan.generate.voiceoverStyle || 'narrator'}
Return ONLY the spoken text, no stage directions.`
    );
    scriptText = scriptResponse;
  }

  // Step 2: Generate speech (with voice cloning if requested)
  const speechPath = `${genDir}/twin_speech.mp3`;
  let voiceId: string | undefined;

  if (plan.generate.voiceClone) {
    // Find audio source for cloning
    const audioSource = plan.generate.voiceCloneSourceFile
      || job.files.find(f => f.type.startsWith('audio'))?.path
      || job.files.find(f => f.type.startsWith('video'))?.path;

    if (audioSource) {
      try {
        // Extract audio if video file
        let audioForClone = audioSource;
        if (audioSource.match(/\.(mp4|mov|webm|avi|mkv)$/i)) {
          audioForClone = `${genDir}/clone_audio_extract.wav`;
          await runFFmpeg(`ffmpeg -i "${audioSource}" -ac 1 -ar 16000 -t 180 -vn -y "${audioForClone}"`);
        }

        voiceId = await elevenlabs.cloneVoice(`twin_${job.id}`, [audioForClone]);
        console.log(`[AI Twin] Voice cloned: ${voiceId}`);
      } catch (error: any) {
        console.error('[AI Twin] Voice cloning failed, using default voice:', error.message);
      }
    }
  }

  await elevenlabs.textToSpeech(
    scriptText,
    speechPath,
    voiceId,
    plan.generate.voiceoverStyle || 'narrator'
  );

  // Step 3: Generate talking head from photo + speech
  const twinImagePath = plan.generate.aiTwinSourceImage
    || job.files.find(f => f.type.startsWith('image'))?.path;

  if (!twinImagePath) {
    console.error('[AI Twin] No source image found');
    return { success: false, videoPath: null, scriptText, voiceoverPath: speechPath };
  }

  const twinVideoPath = `${genDir}/ai_twin_final.mp4`;

  try {
    await kie.talkingPhoto(twinImagePath, speechPath, twinVideoPath);
    console.log('[AI Twin] Pipeline complete!');
    return { success: true, videoPath: twinVideoPath, scriptText, voiceId };
  } catch (error: any) {
    console.error('[AI Twin] Talking photo generation failed:', error.message);

    // Fallback: return just the audio as voiceover (no avatar)
    return { success: false, videoPath: null, scriptText, voiceoverPath: speechPath };
  }
}

// Full AI Dubbing pipeline: transcript → translate → TTS → lipsync → audio replace
export async function generateAIDubbing(
  job: Job,
  plan: ExecutionPlan,
  transcript: TranscriptResult,
  genDir: string
): Promise<AIDubbingResult> {
  const targetLang = plan.generate.aiDubbingTargetLanguage || 'en';
  console.log(`[Dubbing] Starting pipeline: Hebrew → ${targetLang}`);

  // Step 1: Translate transcript
  const langNames: Record<string, string> = {
    en: 'English', ar: 'Arabic', ru: 'Russian', fr: 'French',
    es: 'Spanish', de: 'German', zh: 'Chinese', pt: 'Portuguese',
    it: 'Italian', ja: 'Japanese', ko: 'Korean', hi: 'Hindi',
  };

  const translatedText = await askClaude(
    'You are a professional translator. Translate accurately while keeping the same tone, emotion, and pacing.',
    `Translate this Hebrew transcript to ${langNames[targetLang] || targetLang}.
Maintain the speaker's tone and style. Keep sentence structure similar for lip-sync timing.
Return ONLY the translated text, nothing else.

Hebrew transcript:
${transcript.fullText}`
  );

  console.log(`[Dubbing] Translation complete: ${translatedText.slice(0, 100)}...`);

  // Step 2: Generate speech in target language
  const dubbedSpeechPath = `${genDir}/dubbed_speech_${targetLang}.mp3`;
  let voiceId: string | undefined;

  // Clone original voice if requested
  if (plan.generate.voiceClone) {
    const audioSource = job.files.find(f => f.type.startsWith('audio'))?.path
      || job.files.find(f => f.type.startsWith('video'))?.path;

    if (audioSource) {
      try {
        let audioForClone = audioSource;
        if (audioSource.match(/\.(mp4|mov|webm|avi|mkv)$/i)) {
          audioForClone = `${genDir}/dub_clone_extract.wav`;
          await runFFmpeg(`ffmpeg -i "${audioSource}" -ac 1 -ar 16000 -t 180 -vn -y "${audioForClone}"`);
        }
        voiceId = await elevenlabs.cloneVoice(`dub_${targetLang}_${job.id}`, [audioForClone]);
      } catch (error: any) {
        console.error('[Dubbing] Voice cloning failed:', error.message);
      }
    }
  }

  await elevenlabs.textToSpeech(translatedText, dubbedSpeechPath, voiceId);
  console.log('[Dubbing] Speech generated');

  // Step 3: Lipsync — sync original video's lips to new audio
  const videoFile = job.files.find(f => f.type.startsWith('video'));
  if (!videoFile) {
    // No video to lipsync — return just the translated audio
    return {
      success: true,
      translatedText,
      audioPath: dubbedSpeechPath,
      videoPath: null,
      targetLanguage: targetLang,
    };
  }

  const lipsyncedPath = `${genDir}/dubbed_lipsynced_${targetLang}.mp4`;

  try {
    await kie.lipsync(videoFile.path, dubbedSpeechPath, lipsyncedPath);
    console.log('[Dubbing] Lipsync complete!');

    return {
      success: true,
      translatedText,
      audioPath: dubbedSpeechPath,
      videoPath: lipsyncedPath,
      targetLanguage: targetLang,
    };
  } catch (error: any) {
    console.error('[Dubbing] Lipsync failed, falling back to audio-only replace:', error.message);

    // Fallback: just replace the audio track (no lipsync)
    const audioReplacePath = `${genDir}/dubbed_audio_replace_${targetLang}.mp4`;
    try {
      await runFFmpeg(
        `ffmpeg -i "${videoFile.path}" -i "${dubbedSpeechPath}" -map 0:v -map 1:a -c:v copy -shortest -y "${audioReplacePath}"`
      );
      return {
        success: true,
        translatedText,
        audioPath: dubbedSpeechPath,
        videoPath: audioReplacePath,
        targetLanguage: targetLang,
        lipsyncFailed: true,
      };
    } catch (fallbackError: any) {
      return {
        success: false,
        translatedText,
        audioPath: dubbedSpeechPath,
        videoPath: null,
        targetLanguage: targetLang,
      };
    }
  }
}
