import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  Job,
  ExecutionPlan,
  TranscriptResult,
  CleanResult,
} from '../types.js';
import { askClaude } from '../services/claude.js';
import {
  detectSilences,
  getVideoDuration,
  trimAndConcat,
  invertRanges,
  vidstabDetect,
  parseShakiness,
  runFFmpeg,
} from '../services/ffmpeg.js';
import { updateJob } from '../store/jobStore.js';

const execAsync = promisify(exec);

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
}

export async function runCleanAgent(
  job: Job,
  plan: ExecutionPlan,
  transcript: TranscriptResult | null
): Promise<CleanResult> {
  const result: CleanResult = {
    cleanVideoPath: '',
    removedSilences: [],
    removedFillers: [],
    removedBadTakes: [],
    excludedClips: [],
    warnings: [],
  };

  let currentInput = job.files.find(f => f.type.startsWith('video'))?.path;
  if (!currentInput) {
    result.warnings.push('לא נמצא קובץ וידאו לניקוי.');
    return result;
  }

  result.cleanVideoPath = currentInput;
  const tempDir = path.join('temp', job.id);
  fs.mkdirSync(tempDir, { recursive: true });

  // --- REMOVE SILENCES (with strategic silence protection) ---
  if (plan.clean.removeSilences) {
    try {
      updateProgress(job, 'הסרת שתיקות...');
      const threshold = plan.clean.silenceThreshold || 1.5;

      const silences = await detectSilences(currentInput, -30, threshold);

      // Protected silences — strategic pauses that should NOT be removed
      const protectedSilences = job.contentAnalysis?.protectedSilences || job.protectedSilences || [];

      function isSilenceProtected(silenceStart: number, silenceEnd: number): boolean {
        return protectedSilences.some((ps: any) => {
          const psEnd = ps.at + ps.duration;
          // Check if the silence overlaps with a protected silence
          return silenceStart < psEnd && silenceEnd > ps.at;
        });
      }

      // Filter out protected silences
      const silencesToRemove: Array<{ start: number; end: number }> = [];
      let keptCount = 0;
      for (const silence of silences) {
        if (isSilenceProtected(silence.start, silence.end)) {
          const matchedProtected = protectedSilences.find((ps: any) => Math.abs(ps.at - silence.start) < 0.5);
          console.log(`[Clean] Keeping protected silence at ${silence.start.toFixed(1)}s (${matchedProtected?.type || 'strategic'})`);
          keptCount++;
          continue;
        }
        silencesToRemove.push(silence);
      }

      result.removedSilences = silencesToRemove;

      if (keptCount > 0) {
        console.log(`[Clean] Removed ${silencesToRemove.length} silences, kept ${keptCount} protected pauses`);
      }

      if (silencesToRemove.length > 0) {
        const totalDuration = await getVideoDuration(currentInput);
        const keepSegments = invertRanges(silencesToRemove, totalDuration);

        if (keepSegments.length > 0) {
          const outputPath = path.join(tempDir, 'no_silence.mp4');
          await trimAndConcat(currentInput, keepSegments, outputPath, job.id);
          currentInput = outputPath;
          result.cleanVideoPath = currentInput;
          console.log(`[Clean] Removed ${silencesToRemove.length} silence segments`);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Remove silences failed:', msg);
      result.warnings.push(`הסרת שתיקות נכשלה: ${msg}. דילוג.`);
    }
  }

  // --- REMOVE FILLER WORDS ---
  if (plan.clean.removeFillerWords && transcript) {
    try {
      updateProgress(job, 'הסרת מילות מילוי...');
      const fillerList = plan.clean.fillerWordsList?.length > 0
        ? plan.clean.fillerWordsList
        : ['אממ', 'אהה', 'כאילו', 'בעצם', 'נו', 'רגע', 'אז', 'יאללה', 'שנייה'];

      // Find potential fillers in transcript
      const potentialFillers = transcript.words.filter(w =>
        fillerList.includes(w.word.replace(/[.,!?]/g, ''))
      );

      if (potentialFillers.length > 0) {
        // Ask Claude to verify each — some might be meaningful in context
        const contextCheck = await askClaude(
          'You identify filler words in Hebrew speech transcripts. Return JSON only, no markdown.',
          `Here are potential filler words with their surrounding context from a transcript.\n\n${potentialFillers.map(f => {
            const contextWords = transcript.words.filter(
              w => w.start >= f.start - 2 && w.end <= f.end + 2
            );
            return `Word: "${f.word}" at ${f.start}s, Context: "${contextWords.map(w => w.word).join(' ')}"`;
          }).join('\n')}\n\nFor each word, determine if it's truly a filler (should be removed) or meaningful in context (should be kept). Return JSON array: [{ "word": "...", "start": ..., "is_filler": true/false, "reason": "..." }]`
        );

        try {
          const jsonMatch = contextCheck.match(/\[[\s\S]*\]/);
          const verified = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(contextCheck);
          const confirmedFillers = verified.filter((v: any) => v.is_filler);
          result.removedFillers = confirmedFillers;

          if (confirmedFillers.length > 0) {
            // Build segments to keep (excluding filler timestamps with padding)
            const fillerRanges = confirmedFillers.map((f: any) => {
              // Find the original word to get accurate timing
              const originalWord = potentialFillers.find(
                p => Math.abs(p.start - f.start) < 0.1
              );
              return {
                start: Math.max(0, (originalWord?.start || f.start) - 0.05),
                end: (originalWord?.end || f.start + 0.3) + 0.05,
              };
            });

            const totalDuration = await getVideoDuration(currentInput);
            const keepSegments = invertRanges(fillerRanges, totalDuration);

            if (keepSegments.length > 0) {
              const outputPath = path.join(tempDir, 'no_fillers.mp4');
              await trimAndConcat(currentInput, keepSegments, outputPath, job.id);
              currentInput = outputPath;
              result.cleanVideoPath = currentInput;
              console.log(`[Clean] Removed ${confirmedFillers.length} filler words`);
            }
          }
        } catch (parseError) {
          console.error('[Clean] Failed to parse filler verification response');
          result.warnings.push('אימות מילות מילוי נכשל: שגיאת פענוח תגובה. דילוג.');
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Remove filler words failed:', msg);
      result.warnings.push(`הסרת מילות מילוי נכשלה: ${msg}. דילוג.`);
    }
  }

  // --- SELECT BEST TAKE ---
  if (plan.clean.selectBestTake && transcript) {
    try {
      updateProgress(job, 'בחירת best take...');

      const response = await askClaude(
        'You are a professional video editor analyzing a transcript for duplicate takes. Return JSON only, no markdown.',
        `Here is a transcript with timestamps:\n\n${transcript.words.map(w => `[${w.start.toFixed(1)}s] ${w.word}`).join(' ')}\n\nFind sentences that the speaker repeated (said the same thing multiple times — retakes). For each group of duplicates, rate each take 1-10 based on: fluency, confidence, clarity, completeness. Return JSON:\n[{ "sentence": "...", "takes": [{ "start": ..., "end": ..., "score": ..., "reason": "..." }], "best_take_index": 0 }]\n\nIf no duplicates found, return empty array [].`
      );

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        const duplicates = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);

        if (Array.isArray(duplicates) && duplicates.length > 0) {
          const segmentsToRemove: Array<{ start: number; end: number }> = [];
          for (const group of duplicates) {
            if (!group.takes || !Array.isArray(group.takes)) continue;
            for (let i = 0; i < group.takes.length; i++) {
              if (i !== group.best_take_index) {
                segmentsToRemove.push({
                  start: group.takes[i].start,
                  end: group.takes[i].end,
                });
              }
            }
          }
          result.removedBadTakes = segmentsToRemove;

          if (segmentsToRemove.length > 0) {
            const totalDuration = await getVideoDuration(currentInput);
            const keepSegments = invertRanges(segmentsToRemove, totalDuration);

            if (keepSegments.length > 0) {
              const outputPath = path.join(tempDir, 'best_takes.mp4');
              await trimAndConcat(currentInput, keepSegments, outputPath, job.id);
              currentInput = outputPath;
              result.cleanVideoPath = currentInput;
              console.log(`[Clean] Removed ${segmentsToRemove.length} bad take segments`);
            }
          }
        }
      } catch (parseError) {
        console.error('[Clean] Failed to parse best take response');
        result.warnings.push('בחירת best take נכשלה: שגיאת פענוח תגובה. דילוג.');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Select best take failed:', msg);
      result.warnings.push(`בחירת best take נכשלה: ${msg}. דילוג.`);
    }
  }

  // --- REMOVE SHAKY B-ROLL ---
  if (plan.clean.removeShakyBRoll) {
    try {
      updateProgress(job, 'סינון B-Roll רועד...');

      for (const file of job.files.filter(f => f.type.startsWith('video'))) {
        try {
          const transformFile = path.join(
            tempDir,
            `${path.basename(file.name, path.extname(file.name))}_transform.trf`
          );

          await vidstabDetect(file.path, transformFile);

          if (fs.existsSync(transformFile)) {
            const transformData = fs.readFileSync(transformFile, 'utf-8');
            const avgShakiness = parseShakiness(transformData);

            if (avgShakiness > 0.3) {
              result.excludedClips.push({
                file: file.name,
                reason: 'shaky',
                shakiness: avgShakiness,
              });
              console.log(
                `[Clean] Flagged shaky clip: ${file.name} (shakiness: ${avgShakiness.toFixed(2)})`
              );
            }
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`vidstab failed for ${file.name}:`, msg);
          // Don't crash — just skip this check
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Remove shaky B-Roll failed:', msg);
      result.warnings.push(`סינון B-Roll רועד נכשל: ${msg}. דילוג.`);
    }
  }

  result.cleanVideoPath = currentInput;

  // Save clean result
  const cleanResultPath = path.join(tempDir, 'clean_result.json');
  fs.writeFileSync(cleanResultPath, JSON.stringify(result, null, 2));
  console.log(`[Clean] Result saved to ${cleanResultPath}`);

  return result;
}
