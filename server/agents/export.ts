import * as ffmpeg from '../services/ffmpeg.js';
import { smartReframe } from '../services/reframe.js';
import { updateJob } from '../store/jobStore.js';
import type { Job, ExecutionPlan } from '../types.js';
import fs from 'fs';

export interface ExportResult {
  exports: Array<{ format: string; path: string; url: string }>;
  mainVideoPath?: string;
  duration?: number;
}

function updateProgress(job: Job, step: string): void {
  updateJob(job.id, { currentStep: step });
  console.log(`[Export] ${job.id}: ${step}`);
}

export async function runExportAgent(
  job: Job,
  plan: ExecutionPlan,
  editedVideoPath: string
): Promise<ExportResult> {
  const outputDir = `output/${job.id}`;
  fs.mkdirSync(outputDir, { recursive: true });

  const result: ExportResult = {
    exports: [],
  };

  // Get video duration
  const duration = await ffmpeg.getVideoDuration(editedVideoPath);

  // === EXPORT EACH FORMAT ===
  for (const format of plan.export.formats) {
    try {
      updateProgress(job, `ייצוא ${format}...`);

      const formatFilename = `final_${format.replace(':', 'x')}.mp4`;
      const formatPath = `${outputDir}/${formatFilename}`;

      if (format === '16:9') {
        // Original landscape — just copy or scale
        await ffmpeg.runFFmpeg(ffmpeg.exportFormat(editedVideoPath, '16:9', formatPath));
      } else if (format === '9:16') {
        // Vertical — smart reframe with face detection
        if (plan.export.aiReframe) {
          await smartReframe(editedVideoPath, formatPath, '9:16', duration);
        } else {
          await ffmpeg.runFFmpeg(ffmpeg.exportFormat(editedVideoPath, '9:16', formatPath));
        }
      } else if (format === '1:1') {
        // Square
        if (plan.export.aiReframe) {
          await smartReframe(editedVideoPath, formatPath, '1:1', duration);
        } else {
          await ffmpeg.runFFmpeg(ffmpeg.exportFormat(editedVideoPath, '1:1', formatPath));
        }
      }

      result.exports.push({
        format,
        path: formatPath,
        url: `/api/jobs/${job.id}/video?format=${format.replace(':', 'x')}`,
      });
    } catch (error: any) {
      console.error(`Export ${format} failed:`, error.message);
      job.warnings?.push(`Export ${format} failed: ${error.message}`);
    }
  }

  // === HIGH BITRATE 4K EXPORT ===
  if (plan.export.highBitrate4K) {
    try {
      updateProgress(job, 'ייצוא 4K באיכות גבוהה...');
      const hqPath = `${outputDir}/final_4k_hq.mp4`;
      await ffmpeg.runFFmpeg(ffmpeg.highBitrateExport(editedVideoPath, hqPath));
      result.exports.push({
        format: '4K',
        path: hqPath,
        url: `/api/jobs/${job.id}/video?format=4k`,
      });
    } catch (error: any) {
      console.error('4K export failed:', error.message);
    }
  }

  // === COPY MAIN VIDEO ===
  const mainPath = `${outputDir}/final.mp4`;
  if (!fs.existsSync(mainPath)) {
    fs.copyFileSync(editedVideoPath, mainPath);
  }

  result.mainVideoPath = mainPath;
  result.duration = duration;

  return result;
}
