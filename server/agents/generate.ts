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
import { generateAITwin, generateAIDubbing } from './generateAdvanced.js';
import { compareModels } from '../services/modelComparison.js';
import { selectBestModel } from '../services/modelSelection.js';
import { applyVisualDNA } from '../services/visualDNA.js';
import { transformBRollPlanToCinematic } from '../services/brollGenerator.js';
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

  // --- AUTOMATED MODEL SELECTION ---
  if (plan.generate.automatedModelSelection && plan.generate.broll) {
    try {
      const budget = plan.generate.brollModel === 'sora-2' ? 'high' :
                      plan.generate.brollModel === 'kling-v2.5-turbo' ? 'low' : 'medium';
      const recommendation = await selectBestModel(job.prompt, budget);
      plan.generate.brollModel = recommendation.model as any;
      console.log(`[Auto Model] Selected: ${recommendation.model} (${recommendation.reason})`);
    } catch (error: any) {
      console.error('Auto model selection failed:', error.message);
      warnings.push(`Auto model selection failed: ${error.message}`);
    }
  }

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

  // --- MOTION GRAPHICS PLAN ---
  if (plan.edit.lowerThirds || plan.edit.kineticTypography || plan.edit.logoWatermark) {
    try {
      updateProgress(job, 'תכנון גרפיקה מונפשת...');
      const category = job.videoIntelligence?.concept?.category || 'talking-head';
      const brandColor = job.brandKit?.primaryColor || '#7c3aed';

      const mgResponse = await askClaude(
        'You plan motion graphics for video editing. Return ONLY valid JSON.',
        `Plan motion graphics for a ${category} video.
Brand color: ${brandColor}
Has lower thirds: ${plan.edit.lowerThirds}
Has kinetic text: ${plan.edit.kineticTypography}
Has logo: ${plan.edit.logoWatermark}

Decide which elements use Remotion (free, consistent) vs AI generation (premium, creative).
Rules:
- Simple text animations → Remotion
- Logo animations → AI generation for premium feel, Remotion for standard
- Lower thirds → always Remotion (consistency)
- Kinetic text → Remotion with templates
- Transitions → AI for premium, Remotion for standard

Return JSON:
{
  "logoAnimation": { "needed": ${!!plan.edit.logoWatermark}, "method": "remotion|ai", "style": "..." },
  "lowerThirds": { "needed": ${!!plan.edit.lowerThirds}, "method": "remotion", "style": "..." },
  "priceReveal": { "needed": false, "method": "remotion", "style": "..." },
  "sectionTransitions": { "needed": true, "method": "remotion", "style": "..." }
}`
      );

      try {
        const cleaned = mgResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        job.motionGraphicsPlan = JSON.parse(cleaned);
        updateJob(job.id, { motionGraphicsPlan: job.motionGraphicsPlan } as any);
        saveJSON(`${genDir}/motion_graphics_plan.json`, job.motionGraphicsPlan);
        console.log(`[Generate] Motion graphics plan created`);
      } catch {
        console.log('[Generate] Motion graphics plan parsing failed, using defaults');
      }
    } catch (error: any) {
      console.error('[Generate] Motion graphics planning failed:', error.message);
      warnings.push(`Motion graphics planning failed: ${error.message}`);
    }
  }

  // --- B-ROLL FROM TRANSCRIPT ---
  if (plan.generate.brollFromTranscript && transcript) {
    updateProgress(job, 'תכנון B-Roll מתמלול...');
    try {
      const targetDuration = typeof plan.export.targetDuration === 'number'
        ? plan.export.targetDuration : 60;
      const estimatedClips = (plan.generate as Record<string, unknown>).estimatedBRollClips as number
        || (targetDuration <= 15 ? 2 : targetDuration <= 30 ? 3 : targetDuration <= 60 ? 5 : targetDuration <= 90 ? 7 : Math.ceil(targetDuration / 12));

      const brollPlanResponse = await askClaude(
        'You plan B-Roll inserts for professional video editing. For each B-Roll insertion, write the prompt as a cinematic director would: include camera movement, shot type, lighting, depth of field, and style. Always include negative prompts.',
        `Read this transcript and suggest B-Roll video clips:

${transcript.fullText}

Generate ${estimatedClips} B-Roll clips for a ${targetDuration}-second video. Space them evenly throughout the video. Each clip should be 3-5 seconds long. Don't cluster B-Roll — leave at least 8 seconds between insertions.

For each clip, write the prompt like a Hollywood cinematographer — NOT like a Google search.
Include: camera movement (dolly/drone/tracking/etc), shot type (wide/medium/close-up), lighting (golden hour/studio/natural), depth of field, and style.

Return ONLY a JSON array:
[{ "timestamp": 15.5, "duration": 4, "prompt": "Slow aerial drone shot descending toward modern apartment complex, golden hour warm sunlight, cinematic 4K, shallow depth of field with city bokeh in background, luxury real estate style. No text, no watermark.", "reason": "Speaker mentions real estate project" }]

Rules:
- Don't insert B-Roll during the hook (first 3 seconds)
- Each B-Roll clip: 3-5 seconds
- Leave at least 8 seconds between insertions
- Generate exactly ${estimatedClips} B-Roll clips
- Every prompt MUST include camera movement, lighting, and negative prompts
- NEVER write vague prompts like "beach scene" — write cinematic director-style prompts
Return ONLY the JSON array, no other text.`
      );
      const cleaned = brollPlanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const rawBrollPlan = JSON.parse(cleaned);

      // Transform basic prompts into full cinematic prompts with image-to-video workflow
      updateProgress(job, 'שדרוג פרומפטים לסינמטי...');
      const videoCategory = plan.edit.editStyle || 'cinematic';
      const brandStyle = (job.brandKit as Record<string, unknown>)?.mood as string || 'cinematic-luxury';
      const cinematicPlan = await transformBRollPlanToCinematic(rawBrollPlan, videoCategory, brandStyle);
      result.additionalAssets.brollPlan = cinematicPlan;
      saveJSON(`${genDir}/broll_plan.json`, cinematicPlan);
    } catch (error: any) {
      console.error('[Generate] B-Roll planning failed:', error.message);
      warnings.push(`B-Roll planning failed: ${error.message}`);
    }
  }

  // --- VISUAL DNA (apply to all B-Roll prompts) ---
  if (plan.generate.visualDNA && job.visualDNAProfileId) {
    if (result.additionalAssets.brollPlan) {
      for (const clip of result.additionalAssets.brollPlan as Array<{ prompt: string }>) {
        clip.prompt = applyVisualDNA(clip.prompt, job.visualDNAProfileId);
      }
      console.log('[Visual DNA] Applied brand style to B-Roll prompts');
    }
  }

  // --- B-ROLL GENERATION ---
  if (plan.generate.broll && result.additionalAssets.brollPlan) {
    updateProgress(job, 'יצירת B-Roll...');
    const brollPlan = result.additionalAssets.brollPlan as Array<{
      timestamp: number; duration: number; prompt: string; reason: string;
      cinematicPrompt?: { imagePrompt: string; videoPrompt: string; negativePrompt: string; basicConcept: string };
    }>;

    // Determine which clips need character consistency
    const characterRef = job.characterReference;
    const clipsNeedingCharacter = characterRef?.useInClips || [];

    for (let i = 0; i < brollPlan.length; i++) {
      const clip = brollPlan[i];
      try {
        updateProgress(job, `יצירת B-Roll ${i + 1}/${brollPlan.length}...`);
        const outputPath = `${genDir}/broll_${i}.mp4`;

        // Use cinematic videoPrompt if available, fall back to original prompt
        let videoPrompt = clip.cinematicPrompt?.videoPrompt || clip.prompt;
        const negativePrompt = clip.cinematicPrompt?.negativePrompt || 'no text, no watermark, no blurry, no distortion';

        // Append visual DNA style instructions if available
        if (job.visualDNA) {
          videoPrompt += ` Style: ${job.visualDNA.palette} color palette, ${job.visualDNA.contrast} contrast.`;
        }

        // If image-to-video workflow: generate image first, then animate
        if (clip.cinematicPrompt?.imagePrompt) {
          try {
            const imagePath = `${genDir}/broll_${i}_frame.jpg`;
            await kie.generateImage(clip.cinematicPrompt.imagePrompt, imagePath);
            console.log(`[Generate] B-Roll ${i}: Generated reference image for image-to-video workflow`);
          } catch (imgError: any) {
            console.log(`[Generate] B-Roll ${i}: Image generation skipped (${imgError.message}), using text-to-video`);
          }
        }

        await kie.generateVideo(
          videoPrompt,
          plan.generate.brollModel,
          clip.duration || 4,
          outputPath,
          negativePrompt
        );

        // Apply character consistency: if this clip needs the presenter and we have a reference,
        // use animate-replace to swap in the consistent character
        if (
          characterRef?.hasReference &&
          characterRef.referenceImagePath &&
          fs.existsSync(characterRef.referenceImagePath) &&
          (clipsNeedingCharacter.includes(i) || promptMentionsPerson(videoPrompt))
        ) {
          try {
            const charOutputPath = `${genDir}/broll_${i}_char.mp4`;
            await kie.animateReplace(outputPath, characterRef.referenceImagePath, charOutputPath);
            if (fs.existsSync(charOutputPath)) {
              fs.renameSync(charOutputPath, outputPath);
              console.log(`[Generate] B-Roll ${i}: Applied character consistency from reference`);
            }
          } catch (charError: any) {
            console.log(`[Generate] B-Roll ${i}: Character consistency skipped (${charError.message})`);
          }
        }

        result.brollClips.push({
          path: outputPath,
          timestamp: clip.timestamp,
          duration: clip.duration,
          prompt: videoPrompt,
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

  // --- AI TRANSITIONS (between consecutive B-Roll clips) ---
  if (result.brollClips.length >= 2) {
    try {
      updateProgress(job, 'תכנון מעברים AI...');
      const sortedClips = [...result.brollClips].sort((a, b) => a.timestamp - b.timestamp);
      const aiTransitions: Array<{
        fromClipEnd: number; toClipStart: number; type: string;
        prompt: string; duration: number; reason: string;
      }> = [];

      // Find consecutive B-Roll clips that are close together (within 10s)
      for (let i = 0; i < sortedClips.length - 1 && aiTransitions.length < 3; i++) {
        const clipA = sortedClips[i];
        const clipB = sortedClips[i + 1];
        const gap = clipB.timestamp - (clipA.timestamp + clipA.duration);

        // Only create AI transitions for clips with a gap (speaker segment between them)
        if (gap > 0 && gap < 10) {
          const transitionResponse = await askClaude(
            'You create smooth cinematic video transition prompts. Return ONLY valid JSON.',
            `Create a smooth AI transition prompt between these two B-Roll clips:
Clip A (ends at ${(clipA.timestamp + clipA.duration).toFixed(1)}s): "${clipA.prompt}"
Clip B (starts at ${clipB.timestamp.toFixed(1)}s): "${clipB.prompt}"

Return JSON: { "type": "spatial-morph", "prompt": "Smooth cinematic transition from [A description] to [B description], camera pushing forward...", "duration": 2.0, "reason": "..." }`
          );
          try {
            const cleaned = transitionResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            aiTransitions.push({
              fromClipEnd: clipA.timestamp + clipA.duration,
              toClipStart: clipB.timestamp,
              type: parsed.type || 'spatial-morph',
              prompt: parsed.prompt || '',
              duration: parsed.duration || 2.0,
              reason: parsed.reason || 'smooth transition between B-Roll clips',
            });
          } catch {
            // Skip unparseable transition
          }
        }
      }

      if (aiTransitions.length > 0) {
        job.aiTransitions = aiTransitions;
        updateJob(job.id, { aiTransitions } as any);
        saveJSON(`${genDir}/ai_transitions.json`, aiTransitions);
        console.log(`[Generate] Planned ${aiTransitions.length} AI transitions between B-Roll clips`);
      }
    } catch (error: any) {
      console.error('[Generate] AI transition planning failed:', error.message);
      warnings.push(`AI transition planning failed: ${error.message}`);
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

  // --- MULTI-MODEL COMPARISON ---
  if (plan.generate.multiModelComparison && result.additionalAssets.brollPlan?.length > 0) {
    try {
      updateProgress(job, 'השוואת מודלים...');
      const firstPrompt = (result.additionalAssets.brollPlan as Array<{ prompt: string }>)[0].prompt;
      const models = ['veo-3.1-fast', 'kling-v2.5-turbo', 'seedance-1.5-pro'];
      const comparisonDir = `${genDir}/comparison`;
      fs.mkdirSync(comparisonDir, { recursive: true });

      const comparisonResults = await compareModels(firstPrompt, models, 4, comparisonDir);
      result.additionalAssets.modelComparison = comparisonResults;
      saveJSON(`${genDir}/model_comparison.json`, comparisonResults);
    } catch (error: any) {
      console.error('Model comparison failed:', error.message);
      warnings.push(`Model comparison failed: ${error.message}`);
    }
  }

  // --- AI TWIN (full pipeline) ---
  if (plan.generate.aiTwin) {
    try {
      updateProgress(job, 'יצירת אווטאר AI...');
      const twinResult = await generateAITwin(job, plan, genDir);

      if (twinResult.success && twinResult.videoPath) {
        result.additionalAssets.aiTwinVideo = twinResult.videoPath;
        // In prompt-only mode, this becomes the main video
        if (job.mode === 'prompt-only') {
          result.additionalAssets.mainVideo = twinResult.videoPath;
        }
      } else if (twinResult.voiceoverPath) {
        result.voiceoverPath = twinResult.voiceoverPath;
      }
    } catch (error: any) {
      console.error('AI Twin failed:', error.message);
      warnings.push('AI Twin generation failed: ' + error.message);
    }
  }

  // --- AI DUBBING (full pipeline) ---
  if (plan.generate.aiDubbing && transcript) {
    try {
      updateProgress(job, 'דיבוב ותרגום...');
      const dubbingResult = await generateAIDubbing(job, plan, transcript, genDir);

      if (dubbingResult.success) {
        result.additionalAssets.dubbedVideo = dubbingResult.videoPath;
        result.additionalAssets.dubbedAudio = dubbingResult.audioPath;
        result.additionalAssets.translatedText = dubbingResult.translatedText;
        result.additionalAssets.targetLanguage = dubbingResult.targetLanguage;

        if (dubbingResult.lipsyncFailed) {
          warnings.push('Lipsync failed — audio was replaced without lip synchronization');
        }
      }
    } catch (error: any) {
      console.error('AI Dubbing failed:', error.message);
      warnings.push('AI Dubbing failed: ' + error.message);
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

  // --- FACE SWAP ---
  if (plan.generate.faceSwap) {
    try {
      updateProgress(job, 'החלפת פנים...');
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      const faceImage = job.files.find(f => f.type.startsWith('image') && f.name.includes('face'));
      if (videoFile && faceImage) {
        const faceSwapPath = `${genDir}/face_swapped.mp4`;
        await kie.faceSwap(videoFile.path, faceImage.path, faceSwapPath);
        result.additionalAssets.faceSwappedVideo = faceSwapPath;
      }
    } catch (error: any) {
      console.error('Face swap failed:', error.message);
      warnings.push(`Face swap failed: ${error.message}`);
    }
  }

  // --- MOTION TRANSFER ---
  if (plan.generate.motionTransfer) {
    try {
      updateProgress(job, 'העברת תנועה...');
      const motionVideo = job.files.find(f => f.type.startsWith('video'));
      const targetImage = job.files.find(f => f.type.startsWith('image'));
      if (motionVideo && targetImage) {
        const motionPath = `${genDir}/motion_transferred.mp4`;
        await kie.motionTransfer(targetImage.path, motionVideo.path, motionPath);
        result.additionalAssets.motionTransferVideo = motionPath;
      }
    } catch (error: any) {
      console.error('Motion transfer failed:', error.message);
      warnings.push(`Motion transfer failed: ${error.message}`);
    }
  }

  // --- ANIMATE REPLACE ---
  if (plan.generate.animateReplace) {
    try {
      updateProgress(job, 'החלפת דמות...');
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      const characterImage = job.files.find(f => f.type.startsWith('image'));
      if (videoFile && characterImage) {
        const replacePath = `${genDir}/character_replaced.mp4`;
        await kie.animateReplace(videoFile.path, characterImage.path, replacePath);
        result.additionalAssets.characterReplacedVideo = replacePath;
      }
    } catch (error: any) {
      console.error('Animate replace failed:', error.message);
      warnings.push(`Animate replace failed: ${error.message}`);
    }
  }

  // --- GENERATIVE EXTEND ---
  if (plan.generate.generativeExtend) {
    try {
      updateProgress(job, 'הארכת קליפ...');
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        const extendedPath = `${genDir}/extended.mp4`;
        await kie.generativeExtend(videoFile.path, 3, extendedPath);
        result.additionalAssets.extendedVideo = extendedPath;
      }
    } catch (error: any) {
      console.error('Generative extend failed:', error.message);
      warnings.push(`Generative extend failed: ${error.message}`);
    }
  }

  // --- MULTI-SHOT SEQUENCES ---
  if (plan.generate.multiShotSequences) {
    try {
      updateProgress(job, 'יצירת רצף שוטים...');
      const multiShotPath = `${genDir}/multi_shot.mp4`;
      await kie.multiShotSequence(job.prompt, 3, multiShotPath);
      result.additionalAssets.multiShotVideo = multiShotPath;
    } catch (error: any) {
      console.error('Multi-shot sequence failed:', error.message);
      warnings.push(`Multi-shot sequence failed: ${error.message}`);
    }
  }

  // --- FIRST-LAST FRAME ---
  if (plan.generate.firstLastFrame) {
    try {
      updateProgress(job, 'יצירת תנועה בין פריימים...');
      const images = job.files.filter(f => f.type.startsWith('image'));
      if (images.length >= 2) {
        const firstLastPath = `${genDir}/first_last_frame.mp4`;
        await kie.firstLastFrame(images[0].path, images[1].path, firstLastPath);
        result.additionalAssets.firstLastFrameVideo = firstLastPath;
      }
    } catch (error: any) {
      console.error('First-last frame failed:', error.message);
      warnings.push(`First-last frame failed: ${error.message}`);
    }
  }

  // --- MOTION CONTROL ---
  if (plan.generate.motionControl) {
    try {
      updateProgress(job, 'שליטה בתנועה...');
      const image = job.files.find(f => f.type.startsWith('image'));
      if (image) {
        const motionControlPath = `${genDir}/motion_control.mp4`;
        await kie.motionControl(image.path, {}, motionControlPath);
        result.additionalAssets.motionControlVideo = motionControlPath;
      }
    } catch (error: any) {
      console.error('Motion control failed:', error.message);
      warnings.push(`Motion control failed: ${error.message}`);
    }
  }

  // --- POV WALKTHROUGH (from uploaded photos) ---
  const uploadedPhotos = job.uploadedPhotos || job.files.filter(f => f.type.startsWith('image')).map(f => f.path);
  if (job.mode === 'prompt-only' && uploadedPhotos.length >= 2) {
    try {
      updateProgress(job, 'מייצר סיור וירטואלי מתמונות...');

      // Ask Claude to order photos into a logical walkthrough sequence
      const sequenceResponse = await askClaude(
        'You plan virtual property walkthroughs from photos. Return ONLY valid JSON.',
        `Order these ${uploadedPhotos.length} photos into a logical walkthrough sequence for: "${job.prompt}"

Return JSON:
{
  "sequence": [0, 2, 1, 3],
  "roomLabels": ["entrance", "living-room", "kitchen", "bedroom"],
  "cameraPace": "slow-elegant"
}`
      );

      let sequence: number[] = [];
      let roomLabels: string[] = [];
      try {
        const cleaned = sequenceResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        sequence = parsed.sequence || uploadedPhotos.map((_: unknown, i: number) => i);
        roomLabels = parsed.roomLabels || [];
      } catch {
        sequence = uploadedPhotos.map((_: unknown, i: number) => i);
      }

      const walkthroughClips: string[] = [];
      const perRoomDuration = 4;

      for (let i = 0; i < sequence.length; i++) {
        const photoIndex = sequence[i];
        const photoPath = uploadedPhotos[photoIndex];
        if (!photoPath || !fs.existsSync(photoPath)) continue;

        const roomLabel = roomLabels[i] || `room-${i}`;
        const clipPath = `${genDir}/walkthrough_${i}.mp4`;

        try {
          updateProgress(job, `סיור וירטואלי — ${roomLabel} (${i + 1}/${sequence.length})...`);
          const povPrompt = `Slow steady walk-forward POV through ${roomLabel}, smooth camera movement at eye level, cinematic, natural lighting, residential interior. No text, no watermark.`;

          await kie.generateWithCamera(povPrompt, 'push-in', perRoomDuration, clipPath);
          walkthroughClips.push(clipPath);
        } catch (clipError: any) {
          console.error(`[Generate] Walkthrough clip ${i} failed:`, clipError.message);
          warnings.push(`Walkthrough ${roomLabel} failed: ${clipError.message}`);
        }
      }

      if (walkthroughClips.length > 0) {
        result.additionalAssets.walkthroughClips = walkthroughClips;
        job.povWalkthrough = {
          enabled: true,
          photos: uploadedPhotos,
          sequence: roomLabels,
          totalDuration: walkthroughClips.length * perRoomDuration,
          perRoomDuration,
        };
        updateJob(job.id, { povWalkthrough: job.povWalkthrough } as any);
        console.log(`[Generate] POV walkthrough: ${walkthroughClips.length} room clips generated`);
      }
    } catch (error: any) {
      console.error('[Generate] POV walkthrough failed:', error.message);
      warnings.push(`POV walkthrough failed: ${error.message}`);
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

// Check if a B-Roll prompt mentions a person (for character consistency)
function promptMentionsPerson(prompt: string): boolean {
  const personKeywords = [
    'person', 'people', 'man', 'woman', 'speaker', 'presenter', 'customer',
    'client', 'walking', 'sitting', 'talking', 'standing', 'smiling',
    'אדם', 'אנשים', 'גבר', 'אישה', 'לקוח', 'מציג', 'הולך', 'יושב',
  ];
  const lower = prompt.toLowerCase();
  return personKeywords.some(kw => lower.includes(kw));
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
    plan.analyze.aiScriptGenerator ||
    plan.generate.visualDNA ||
    plan.generate.multiModelComparison ||
    plan.generate.automatedModelSelection ||
    plan.generate.faceSwap ||
    plan.generate.motionTransfer ||
    plan.generate.animateReplace ||
    plan.generate.generativeExtend ||
    plan.generate.multiShotSequences ||
    plan.generate.firstLastFrame ||
    plan.generate.motionControl
  );
}
