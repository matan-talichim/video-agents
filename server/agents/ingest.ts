import fs from 'fs';
import path from 'path';
import type {
  Job,
  ExecutionPlan,
  IngestResult,
  TranscriptResult,
  FootageClassification,
  ShotSelection,
  FileInfo,
  TranscriptWord,
} from '../types.js';
import { transcribe, groupWordsIntoSentences, extractSpeakers } from '../services/deepgram.js';
import { askClaudeVision, askClaude } from '../services/claude.js';
import {
  extractAudio,
  extractFrame,
  applyOffset,
  getVideoDuration,
  findAudioOffset,
} from '../services/ffmpeg.js';
import { updateJob } from '../store/jobStore.js';

function saveJSON(filePath: string, data: any): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
}

export async function runIngestAgent(
  job: Job,
  plan: ExecutionPlan
): Promise<IngestResult> {
  const result: IngestResult = {
    transcript: null,
    syncedFiles: [],
    classifications: [],
    shotSelections: [],
    warnings: [],
  };

  const tempDir = path.join('temp', job.id);
  fs.mkdirSync(tempDir, { recursive: true });

  // --- TRANSCRIBE ---
  if (plan.ingest.transcribe) {
    try {
      updateProgress(job, 'תמלול...');
      const videoFile = job.files.find(f => f.type.startsWith('video'));
      if (videoFile) {
        result.transcript = await transcribe(videoFile.path, job.id);
        saveJSON(path.join(tempDir, 'transcript.json'), result.transcript);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Transcription failed:', msg);
      result.warnings.push(`תמלול נכשל: ${msg}. דילוג.`);
    }
  }

  // --- MULTI-CAM SYNC ---
  if (plan.ingest.multiCamSync) {
    try {
      updateProgress(job, 'סנכרון מצלמות...');
      const videoFiles = job.files.filter(f => f.type.startsWith('video'));
      if (videoFiles.length >= 2) {
        result.syncedFiles = await syncCameras(videoFiles, job.id);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Multi-cam sync failed:', msg);
      result.warnings.push(`סנכרון מצלמות נכשל: ${msg}. דילוג.`);
    }
  }

  // --- LIP SYNC VERIFY ---
  if (plan.ingest.lipSyncVerify && result.transcript) {
    try {
      updateProgress(job, 'אימות סנכרון שפתיים...');
      // Lip sync verification is done by checking transcript timing against video frames
      // This is a placeholder for future advanced implementation
      console.log('[Ingest] Lip sync verification — using transcript timing as reference');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Lip sync verify failed:', msg);
      result.warnings.push(`אימות סנכרון שפתיים נכשל: ${msg}. דילוג.`);
    }
  }

  // --- FOOTAGE CLASSIFICATION ---
  if (plan.ingest.footageClassification) {
    try {
      updateProgress(job, 'סיווג footage...');
      for (const file of job.files.filter(f => f.type.startsWith('video'))) {
        try {
          const classification = await classifyFootage(file.path, job.id);
          result.classifications.push({ file: file.name, ...classification });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`Classification failed for ${file.name}:`, msg);
          result.warnings.push(`סיווג ${file.name} נכשל: ${msg}. דילוג.`);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Footage classification failed:', msg);
      result.warnings.push(`סיווג footage נכשל: ${msg}. דילוג.`);
    }
  }

  // --- SPEAKER CLASSIFICATION ---
  if (plan.ingest.speakerClassification && result.transcript) {
    try {
      updateProgress(job, 'זיהוי דוברים...');
      const speakers = extractSpeakers(result.transcript);
      saveJSON(path.join(tempDir, 'speakers.json'), speakers);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Speaker classification failed:', msg);
      result.warnings.push(`זיהוי דוברים נכשל: ${msg}. דילוג.`);
    }
  }

  // --- SHOT SELECTION ---
  if (plan.ingest.shotSelection) {
    try {
      updateProgress(job, 'בחירת שוטים...');
      const videoFiles = job.files.filter(f => f.type.startsWith('video'));
      if (videoFiles.length > 1 && result.transcript) {
        result.shotSelections = await selectBestShots(videoFiles, result.transcript, job.id);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Shot selection failed:', msg);
      result.warnings.push(`בחירת שוטים נכשלה: ${msg}. דילוג.`);
    }
  }

  // --- SMART VARIETY ---
  if (plan.ingest.smartVariety && result.shotSelections.length > 0) {
    try {
      updateProgress(job, 'אופטימיזציית גיוון...');
      result.shotSelections = await enforceVariety(result.shotSelections);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Smart variety failed:', msg);
      result.warnings.push(`אופטימיזציית גיוון נכשלה: ${msg}. דילוג.`);
    }
  }

  // Save full ingest result
  saveJSON(path.join(tempDir, 'ingest_result.json'), result);

  return result;
}

async function syncCameras(videoFiles: FileInfo[], jobId: string): Promise<string[]> {
  const tempDir = path.join('temp', jobId);

  // Extract audio from each camera
  const audioFiles: string[] = [];
  for (const file of videoFiles) {
    const audioPath = path.join(tempDir, `${path.basename(file.name, path.extname(file.name))}_audio.wav`);
    await extractAudio(file.path, audioPath);
    audioFiles.push(audioPath);
  }

  // Cross-correlate to find offset between first two cameras
  const offset = await findAudioOffset(audioFiles[0], audioFiles[1]);
  console.log(`[Ingest] Camera sync offset: ${offset}s`);

  if (Math.abs(offset) < 0.01) {
    // No significant offset — cameras are already in sync
    return videoFiles.map(f => f.path);
  }

  // Apply offset to second camera
  const syncedPath = path.join(tempDir, 'cam2_synced.mp4');
  await applyOffset(videoFiles[1].path, offset, syncedPath);

  return [videoFiles[0].path, syncedPath];
}

async function classifyFootage(
  videoPath: string,
  jobId: string
): Promise<FootageClassification> {
  const tempDir = path.join('temp', jobId);
  const frameDir = path.join(tempDir, 'frames');
  fs.mkdirSync(frameDir, { recursive: true });

  // Extract 5 evenly-spaced frames
  const duration = await getVideoDuration(videoPath);
  const frames: string[] = [];

  for (let i = 0; i < 5; i++) {
    const timestamp = (duration / 6) * (i + 1);
    const framePath = path.join(frameDir, `frame_${i}.jpg`);
    await extractFrame(videoPath, timestamp, framePath);
    frames.push(framePath);
  }

  // Send frames to Claude Vision
  const frameImages = frames
    .filter(f => fs.existsSync(f))
    .map(f => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data: fs.readFileSync(f).toString('base64'),
      },
    }));

  if (frameImages.length === 0) {
    return { type: 'performance', confidence: 0.5, description: 'Could not extract frames' };
  }

  const response = await askClaudeVision(
    'You classify video footage. Return JSON only, no markdown.',
    [
      ...frameImages,
      {
        type: 'text',
        text: 'Classify this video clip based on these 5 frames. Return JSON: { "type": "performance" | "broll" | "close-up" | "wide-shot" | "product-shot", "confidence": 0-1, "description": "short description" }',
      },
    ]
  );

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    console.error('[Ingest] Failed to parse classification response:', response.slice(0, 200));
    return { type: 'performance', confidence: 0.5, description: 'Classification parse failed' };
  }
}

async function selectBestShots(
  files: FileInfo[],
  transcript: TranscriptResult,
  jobId: string
): Promise<ShotSelection[]> {
  const tempDir = path.join('temp', jobId);
  const sentences = groupWordsIntoSentences(transcript.words);
  const selections: ShotSelection[] = [];

  for (const sentence of sentences) {
    const candidateFrames: { file: string; framePath: string }[] = [];

    for (const file of files.filter(f => f.type.startsWith('video'))) {
      try {
        const framePath = path.join(
          tempDir,
          `shot_select_${path.basename(file.name)}_${sentence.start.toFixed(1)}.jpg`
        );
        await extractFrame(file.path, sentence.start + 0.5, framePath);
        if (fs.existsSync(framePath)) {
          candidateFrames.push({ file: file.name, framePath });
        }
      } catch {
        // Frame extraction failed for this file at this timestamp — skip
      }
    }

    if (candidateFrames.length <= 1) {
      selections.push({
        start: sentence.start,
        end: sentence.end,
        selectedFile: files[0].name,
      });
      continue;
    }

    // Claude Vision rates each option
    const frameImages = candidateFrames.map(cf => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data: fs.readFileSync(cf.framePath).toString('base64'),
      },
    }));

    try {
      const response = await askClaudeVision(
        'You are picking the best camera angle for a video. Return JSON only, no markdown.',
        [
          ...frameImages,
          {
            type: 'text',
            text: `There are ${candidateFrames.length} camera options for timestamp ${sentence.start}s. Rate each 1-10 for: composition, energy, focus. Return JSON: { "best_index": 0, "scores": [{"score": 8, "reason": "..."}, ...] }`,
          },
        ]
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);

      const bestIndex = Math.min(
        Math.max(0, parsed.best_index || 0),
        candidateFrames.length - 1
      );

      selections.push({
        start: sentence.start,
        end: sentence.end,
        selectedFile: candidateFrames[bestIndex].file,
      });
    } catch {
      // Default to first camera if Claude call fails
      selections.push({
        start: sentence.start,
        end: sentence.end,
        selectedFile: candidateFrames[0].file,
      });
    }
  }

  return selections;
}

async function enforceVariety(selections: ShotSelection[]): Promise<ShotSelection[]> {
  if (selections.length <= 1) return selections;

  try {
    const response = await askClaude(
      'You enforce visual variety in video editing. Return JSON array only, no markdown.',
      `Here is a shot selection plan:\n${JSON.stringify(selections)}\n\nRules:\n- Never use same clip/camera twice in a row\n- Alternate between close-up and wide when possible\n- If 3+ consecutive static shots, swap one for a different angle\n- Return the corrected plan as JSON array with same structure: [{ "start": number, "end": number, "selectedFile": string }]`
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch {
    console.error('[Ingest] Variety enforcement failed, using original selections');
    return selections;
  }
}
