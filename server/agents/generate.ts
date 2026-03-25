import fs from 'fs';
import path from 'path';
import * as kie from '../services/kie.js';
import * as elevenlabs from '../services/elevenlabs.js';
import * as suno from '../services/suno.js';
import * as stockMedia from '../services/stockMedia.js';
import * as sfx from '../services/soundEffects.js';
import * as stems from '../services/stems.js';
import { askClaude } from '../services/claude.js';
import { extractFrame, getVideoDuration, runFFmpeg } from '../services/ffmpeg.js';
import { updateJob } from '../store/jobStore.js';
import type { Job, ExecutionPlan, TranscriptResult, GenerateResult } from '../types.js';

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
  console.log(`[Generate] ${job.id}: ${step}`);
}

function saveJSON(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function runGenerateAgent(
  job: Job,
  plan: ExecutionPlan,
  transcript?: TranscriptResult | null
): Promise<GenerateResult> {
  const result: GenerateResult = {
    brollClips: [],
    voiceoverPath: null,
    musicPath: null,
    sfxMoments: [],
    thumbnailPath: null,
    stockClips: [],
    additionalAssets: {},
  };

  const genDir = `temp/${job.id}/generated`;
  fs.mkdirSync(genDir, { recursive: true });

  const warnings: string[] = [];

  // --- AI SCRIPT GENERATOR ---
  if (plan.generate.aiScriptGenerator || plan.analyze.aiScriptGenerator) {
    updateProgress(job, 'יצירת תסריט AI...');
    try {
      const targetDuration = typeof plan.export.targetDuration === 'number'
        ? plan.export.targetDuration : 60;

      const script = await askClaude(
        'You write professional video scripts in Hebrew.',
        `Write a complete video script for: "${job.prompt}"

Format — return ONLY a JSON array:
[{ "section": "hook", "text": "...", "duration_estimate": 3, "visual_suggestion": "...", "tone_note": "..." }, ...]

Include: hook (3s), introduction (10-15s), main content (sections), CTA, closing.
Language: Hebrew. Duration target: ${targetDuration} seconds.
Return ONLY the JSON array, no other text.`
      );
      const cleaned = script.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result.additionalAssets.script = JSON.parse(cleaned);
      saveJSON(`${genDir}/script.json`, result.additionalAssets.script);
    } catch (error: any) {
      console.error('[Generate] Script generation failed:', error.message);
      warnings.push(`Script generation failed: ${error.message}`);
    }
  }

  // --- B-ROLL FROM TRANSCRIPT ---
  if (plan.generate.brollFromTranscript && transcript) {
    updateProgress(job, 'תכנון B-Roll מתמלול...');
    try {
      const brollPlanResponse = await askClaude(
        'You plan B-Roll inserts for professional video editing.',
        `Read this transcript and suggest B-Roll video clips:

${transcript.fullText}

For each major topic, create a detailed cinematic B-Roll prompt. Return ONLY a JSON array:
[{ "timestamp": 15.5, "duration": 4, "prompt": "Cinematic aerial drone shot of modern apartment buildings at golden hour, 4K, shallow depth of field", "reason": "Speaker mentions real estate project" }]

Rules:
- Don't insert B-Roll during the hook (first 3 seconds)
- Each B-Roll clip: 3-5 seconds
- Leave at least 8 seconds between insertions
- Max 5-6 B-Roll clips for a 60-second video
- Make prompts VERY detailed and cinematic
Return ONLY the JSON array, no other text.`
      );
      const cleaned = brollPlanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result.additionalAssets.brollPlan = JSON.parse(cleaned);
      saveJSON(`${genDir}/broll_plan.json`, result.additionalAssets.brollPlan);
    } catch (error: any) {
      console.error('[Generate] B-Roll planning failed:', error.message);
      warnings.push(`B-Roll planning failed: ${error.message}`);
    }
  }

  // --- B-ROLL GENERATION ---
  if (plan.generate.broll && result.additionalAssets.brollPlan) {
    updateProgress(job, 'יצירת B-Roll...');
    const brollPlan = result.additionalAssets.brollPlan as Array<{
      timestamp: number; duration: number; prompt: string; reason: string;
    }>;

    for (let i = 0; i < brollPlan.length; i++) {
      const clip = brollPlan[i];
      try {
        updateProgress(job, `יצירת B-Roll ${i + 1}/${brollPlan.length}...`);
        const outputPath = `${genDir}/broll_${i}.mp4`;

        await kie.generateVideo(
          clip.prompt,
          plan.generate.brollModel,
          clip.duration || 4,
          outputPath
        );

        result.brollClips.push({
          path: outputPath,
          timestamp: clip.timestamp,
          duration: clip.duration,
          prompt: clip.prompt,
        });
      } catch (error: any) {
        console.error(`[Generate] B-Roll ${i} generation failed:`, error.message);
        warnings.push(`B-Roll ${i} failed: ${error.message}. Trying stock footage fallback.`);

        // Fallback: try stock footage
        if (plan.generate.stockFootageSearch) {
          try {
            const keyword = clip.reason.split(' ').slice(-2).join(' ');
            const stockResults = await stockMedia.searchVideos(keyword, 1);
            if (stockResults.length > 0 && stockResults[0].downloadUrl) {
              const stockPath = `${genDir}/stock_broll_${i}.mp4`;
              await stockMedia.downloadMedia(stockResults[0].downloadUrl, stockPath);
              result.brollClips.push({
                path: stockPath,
                timestamp: clip.timestamp,
                duration: clip.duration,
                prompt: clip.prompt,
                isStock: true,
              });
              warnings.push(`B-Roll ${i} used stock footage fallback.`);
            }
          } catch (stockError: any) {
            console.error(`[Generate] Stock fallback failed for B-Roll ${i}:`, stockError.message);
            warnings.push(`B-Roll ${i} stock fallback also failed: ${stockError.message}`);
          }
        }
      }
    }
  }

  // --- STOCK FOOTAGE SEARCH (standalone, not as B-Roll fallback) ---
  if (plan.generate.stockFootageSearch && transcript && result.brollClips.length === 0) {
    updateProgress(job, 'חיפוש footage מוכן...');
    try {
      const keywordsResponse = await askClaude(
        'Extract search keywords.',
        `From this transcript, extract 3-5 visual search keywords for stock footage. Return ONLY a JSON array: ["keyword1", "keyword2", ...]

${transcript.fullText}`
      );
      const cleaned = keywordsResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const keywordList: string[] = JSON.parse(cleaned);

      for (const keyword of keywordList) {
        try {
          const results = await stockMedia.searchVideos(keyword, 2);
          for (const video of results) {
            if (!video.downloadUrl) continue;
            const outputPath = `${genDir}/stock_${keyword.replace(/\s/g, '_')}_${video.id}.mp4`;
            await stockMedia.downloadMedia(video.downloadUrl, outputPath);
            result.stockClips.push({ path: outputPath, keyword, duration: video.duration });
          }
        } catch (err: any) {
          console.error(`[Generate] Stock search for "${keyword}" failed:`, err.message);
        }
      }
    } catch (error: any) {
      console.error('[Generate] Stock search failed:', error.message);
      warnings.push(`Stock footage search failed: ${error.message}`);
    }
  }

  // --- AI VOICEOVER ---
  if (plan.generate.aiVoiceover) {
    updateProgress(job, 'יצירת קריינות...');
    try {
      const script = result.additionalAssets.script;
      const text = script
        ? (script as Array<{ text: string }>).map(s => s.text).join(' ')
        : job.prompt;

      const voicePath = `${genDir}/voiceover.mp3`;
      let voiceId: string | undefined;

      // If voice clone was requested and audio exists
      if (plan.generate.voiceClone && plan.generate.voiceCloneSourceFile) {
        updateProgress(job, 'שכפול קול...');
        try {
          voiceId = await elevenlabs.cloneVoice(
            `clone_${job.id}`,
            [plan.generate.voiceCloneSourceFile]
          );
        } catch (cloneError: any) {
          console.error('[Generate] Voice cloning failed:', cloneError.message);
          warnings.push(`Voice cloning failed: ${cloneError.message}. Using default voice.`);
        }
      }

      await elevenlabs.textToSpeech(
        text,
        voicePath,
        voiceId,
        plan.generate.voiceoverStyle || 'narrator'
      );

      result.voiceoverPath = voicePath;
    } catch (error: any) {
      console.error('[Generate] Voiceover generation failed:', error.message);
      warnings.push(`Voiceover generation failed: ${error.message}`);
    }
  }

  // --- AI TWIN ---
  if (plan.generate.aiTwin) {
    updateProgress(job, 'יצירת אווטאר AI...');
    try {
      // Step 1: Generate speech
      const script = result.additionalAssets.script;
      const text = script
        ? (script as Array<{ text: string }>).map(s => s.text).join(' ')
        : job.prompt;
      const speechPath = `${genDir}/twin_speech.mp3`;

      let voiceId: string | undefined;
      if (plan.generate.voiceClone && plan.generate.voiceCloneSourceFile) {
        try {
          voiceId = await elevenlabs.cloneVoice(
            `twin_${job.id}`,
            [plan.generate.voiceCloneSourceFile]
          );
        } catch (cloneError: any) {
          console.error('[Generate] AI Twin voice cloning failed:', cloneError.message);
          warnings.push(`AI Twin voice cloning failed: ${cloneError.message}`);
        }
      }
      await elevenlabs.textToSpeech(text, speechPath, voiceId, plan.generate.voiceoverStyle);

      // Step 2: Generate talking head from photo + speech
      const twinImagePath = plan.generate.aiTwinSourceImage
        || job.files.find(f => f.type.startsWith('image'))?.path;
      if (twinImagePath) {
        const twinVideoPath = `${genDir}/ai_twin.mp4`;
        await kie.talkingPhoto(twinImagePath, speechPath, twinVideoPath);
        result.additionalAssets.aiTwinVideo = twinVideoPath;
      } else {
        warnings.push('AI Twin skipped: no source image found.');
      }
    } catch (error: any) {
      console.error('[Generate] AI Twin generation failed:', error.message);
      warnings.push(`AI Twin generation failed: ${error.message}`);
    }
  }

  // --- AI DUBBING ---
  if (plan.generate.aiDubbing && transcript) {
    updateProgress(job, 'דיבוב ותרגום...');
    try {
      const targetLang = plan.generate.aiDubbingTargetLanguage || 'en';

      // Step 1: Translate transcript
      const translated = await askClaude(
        'You are a professional translator.',
        `Translate this Hebrew text to ${targetLang}. Keep the same structure and timing. Return only the translated text:

${transcript.fullText}`
      );

      // Step 2: Generate speech in target language
      const dubbedSpeechPath = `${genDir}/dubbed_speech.mp3`;
      let voiceId: string | undefined;
      if (plan.generate.voiceClone && plan.generate.voiceCloneSourceFile) {
        try {
          voiceId = await elevenlabs.cloneVoice(
            `dub_${job.id}`,
            [plan.generate.voiceCloneSourceFile]
          );
        } catch (cloneError: any) {
          console.error('[Generate] Dubbing voice clone failed:', cloneError.message);
          warnings.push(`Dubbing voice clone failed: ${cloneError.message}`);
        }
      }
      await elevenlabs.textToSpeech(translated, dubbedSpeechPath, voiceId);

      // Step 3: Lipsync
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        const lipsyncedPath = `${genDir}/dubbed_lipsynced.mp4`;
        await kie.lipsync(videoFile.path, dubbedSpeechPath, lipsyncedPath);
        result.additionalAssets.dubbedVideo = lipsyncedPath;
      } else {
        result.additionalAssets.dubbedAudio = dubbedSpeechPath;
        warnings.push('AI Dubbing: no video file for lipsync, saved dubbed audio only.');
      }
    } catch (error: any) {
      console.error('[Generate] AI Dubbing failed:', error.message);
      warnings.push(`AI Dubbing failed: ${error.message}`);
    }
  }

  // --- AI MUSIC GENERATION ---
  if (plan.generate.musicGeneration) {
    updateProgress(job, 'יצירת מוזיקה...');
    try {
      const mood = plan.generate.musicMood || 'energetic';
      const duration = typeof plan.export.targetDuration === 'number'
        ? plan.export.targetDuration : 60;
      const prompt = `${mood} background music for a professional video, no lyrics, ${duration} seconds`;

      const musicPath = `${genDir}/ai_music.mp3`;
      await suno.generateMusic(prompt, duration, true, musicPath);
      result.musicPath = musicPath;
    } catch (error: any) {
      console.error('[Generate] Music generation failed:', error.message);
      warnings.push(`Music generation failed: ${error.message}`);
    }
  }

  // --- MUSIC STEM SEPARATION ---
  if (plan.generate.musicStemSeparation && result.musicPath) {
    updateProgress(job, 'הפרדת כלים ממוזיקה...');
    try {
      const stemResult = await stems.separateStems(result.musicPath, `${genDir}/stems`);
      result.additionalAssets.stems = stemResult;
    } catch (error: any) {
      console.error('[Generate] Stem separation failed:', error.message);
      warnings.push(`Stem separation failed: ${error.message}`);
    }
  }

  // --- AI SOUND EFFECTS ---
  if (plan.generate.aiSoundEffects && transcript) {
    updateProgress(job, 'אפקטי סאונד AI...');
    try {
      const sfxMoments = await sfx.analyzeSFXMoments(transcript.fullText);

      // Resolve each SFX keyword to actual file
      for (const moment of sfxMoments) {
        const sfxFile = sfx.findSoundEffect(moment.sfx_keyword);
        if (sfxFile && fs.existsSync(sfxFile)) {
          result.sfxMoments.push({
            ...moment,
            filePath: sfxFile,
          });
        }
      }
    } catch (error: any) {
      console.error('[Generate] SFX analysis failed:', error.message);
      warnings.push(`SFX analysis failed: ${error.message}`);
    }
  }

  // --- THUMBNAIL ---
  if (plan.generate.thumbnail) {
    updateProgress(job, 'יצירת תמונה ממוזערת...');
    try {
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        // Extract 10 candidate frames
        const framePaths: string[] = [];
        const duration = await getVideoDuration(videoFile.path);
        for (let i = 0; i < 10; i++) {
          const t = (duration / 11) * (i + 1);
          const fp = `${genDir}/thumb_candidate_${i}.jpg`;
          await extractFrame(videoFile.path, t, fp);
          framePaths.push(fp);
        }

        // Use middle frame as default thumbnail
        const bestFrame = framePaths[Math.floor(framePaths.length / 2)];

        // Copy as thumbnail
        const outputDir = `output/${job.id}`;
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const thumbPath = `${outputDir}/thumbnail.jpg`;
        fs.copyFileSync(bestFrame, thumbPath);
        result.thumbnailPath = thumbPath;
      }
    } catch (error: any) {
      console.error('[Generate] Thumbnail generation failed:', error.message);
      warnings.push(`Thumbnail generation failed: ${error.message}`);
    }
  }

  // --- VIDEO-TO-VIDEO STYLE TRANSFER ---
  if (plan.generate.videoToVideo) {
    updateProgress(job, 'שינוי סגנון וידאו...');
    try {
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        const styledPath = `${genDir}/styled_video.mp4`;
        await kie.videoToVideo(
          videoFile.path,
          'Cinematic film look with warm color grading',
          styledPath
        );
        result.additionalAssets.styledVideo = styledPath;
      }
    } catch (error: any) {
      console.error('[Generate] Video-to-video failed:', error.message);
      warnings.push(`Video-to-video style transfer failed: ${error.message}`);
    }
  }

  // --- TEXT-TO-VFX ---
  if (plan.generate.textToVFX && plan.generate.textToVFXPrompts) {
    updateProgress(job, 'יצירת VFX...');
    try {
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        for (let i = 0; i < plan.generate.textToVFXPrompts.length; i++) {
          try {
            const vfxPath = `${genDir}/vfx_${i}.mp4`;
            await kie.textToVFX(videoFile.path, plan.generate.textToVFXPrompts[i], vfxPath);
            result.additionalAssets[`vfx_${i}`] = vfxPath;
          } catch (vfxError: any) {
            console.error(`[Generate] VFX ${i} failed:`, vfxError.message);
            warnings.push(`VFX "${plan.generate.textToVFXPrompts[i]}" failed: ${vfxError.message}`);
          }
        }
      }
    } catch (error: any) {
      console.error('[Generate] Text-to-VFX failed:', error.message);
      warnings.push(`Text-to-VFX failed: ${error.message}`);
    }
  }

  // --- EYE CONTACT CORRECTION ---
  if (plan.edit.eyeContactCorrection) {
    updateProgress(job, 'תיקון קשר עין...');
    try {
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        const correctedPath = `${genDir}/eye_contact_corrected.mp4`;
        await kie.eyeContactCorrection(videoFile.path, correctedPath);
        result.additionalAssets.eyeContactVideo = correctedPath;
      }
    } catch (error: any) {
      console.error('[Generate] Eye contact correction failed:', error.message);
      warnings.push(`Eye contact correction failed: ${error.message}`);
    }
  }

  // --- UPSCALING ---
  if (plan.edit.upscaling) {
    updateProgress(job, 'שדרוג ל-4K...');
    try {
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        const upscaledPath = `${genDir}/upscaled_4k.mp4`;
        await kie.upscale(videoFile.path, upscaledPath);
        result.additionalAssets.upscaledVideo = upscaledPath;
      }
    } catch (error: any) {
      console.error('[Generate] Upscaling failed:', error.message);
      warnings.push(`Upscaling failed: ${error.message}`);
    }
  }

  // --- AI BACKGROUND ---
  if (plan.generate.aiBackground) {
    updateProgress(job, 'יצירת רקע AI...');
    try {
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        const bgRemovedPath = `${genDir}/bg_removed.mp4`;
        await kie.backgroundRemoval(videoFile.path, bgRemovedPath);
        result.additionalAssets.backgroundRemoved = bgRemovedPath;
      }
    } catch (error: any) {
      console.error('[Generate] AI Background failed:', error.message);
      warnings.push(`AI Background removal failed: ${error.message}`);
    }
  }

  // Collect warnings into job
  if (warnings.length > 0) {
    const existingWarnings = job.warnings || [];
    updateJob(job.id, { warnings: [...existingWarnings, ...warnings] });
  }

  // Save generate result summary
  saveJSON(`temp/${job.id}/generate_result.json`, {
    brollCount: result.brollClips.length,
    hasVoiceover: !!result.voiceoverPath,
    hasMusic: !!result.musicPath,
    sfxCount: result.sfxMoments.length,
    hasThumbnail: !!result.thumbnailPath,
    stockClipCount: result.stockClips.length,
    additionalAssets: Object.keys(result.additionalAssets),
    warnings,
  });

  return result;
}

// Check if any generate feature is enabled
export function hasAnyGenerateFeature(plan: ExecutionPlan): boolean {
  return (
    plan.generate.broll ||
    plan.generate.brollFromTranscript ||
    plan.generate.aiVoiceover ||
    plan.generate.musicGeneration ||
    plan.generate.aiSoundEffects ||
    plan.generate.thumbnail ||
    plan.generate.stockFootageSearch ||
    plan.generate.aiTwin ||
    plan.generate.aiDubbing ||
    plan.generate.voiceClone ||
    plan.generate.videoToVideo ||
    plan.generate.textToVFX ||
    plan.edit.eyeContactCorrection ||
    plan.edit.upscaling ||
    plan.generate.aiBackground ||
    plan.generate.aiScriptGenerator ||
    plan.generate.musicStemSeparation ||
    plan.analyze.aiScriptGenerator
  );
}
