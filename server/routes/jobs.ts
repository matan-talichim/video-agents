import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { FileInfo, UserOptions, BRollModel, RevisionRequest } from '../types.js';
import { createJob, getJob, updateJob, listJobs } from '../store/jobStore.js';
import { addVersion, getVersions as getStoreVersions, getVersion as getStoreVersion } from '../store/versionStore.js';
import { generatePlan, estimateCost } from '../brain/brain.js';
import { startJob, runPipeline } from '../orchestrator/orchestrator.js';
import { getVersions as getManagedVersions, getVersion as getManagedVersion, revertToVersion, getActiveVideoPath } from '../services/versionManager.js';
import { processRevision } from '../services/revisionPipeline.js';

const upload = multer({ dest: 'uploads/' });

const router = Router();

// POST /api/jobs — create a new job with file uploads
router.post('/', upload.array('files', 20), async (req, res) => {
  try {
    const prompt: string = req.body.prompt || '';
    const model: BRollModel = req.body.model || 'kling-v2.5-turbo';
    const projectName: string = req.body.projectName || '';

    // Parse options from JSON string
    let options: Partial<UserOptions> = {};
    if (req.body.options) {
      try {
        options = JSON.parse(req.body.options);
      } catch {
        // Use defaults if parsing fails
      }
    }

    // Parse edit style, caption template, etc.
    const editStyle = req.body.editStyle || undefined;
    const captionTemplate = req.body.captionTemplate || undefined;
    const voiceoverStyle = req.body.voiceoverStyle || undefined;
    const targetLanguage = req.body.targetLanguage || undefined;
    const storyPageCount = req.body.storyPageCount ? parseInt(req.body.storyPageCount, 10) : undefined;

    // Map uploaded files to FileInfo
    const multerFiles = (req.files as Express.Multer.File[]) || [];
    const files: FileInfo[] = multerFiles.map((f) => ({
      name: f.originalname,
      size: f.size,
      type: f.mimetype,
      path: f.path,
    }));

    // Create job in store
    const job = createJob({ prompt, model, options, files, projectName });

    // Apply extra fields
    if (editStyle) updateJob(job.id, { editStyle });
    if (captionTemplate) updateJob(job.id, { captionTemplate });
    if (voiceoverStyle) updateJob(job.id, { voiceoverStyle });
    if (targetLanguage) updateJob(job.id, { targetLanguage });
    if (storyPageCount) updateJob(job.id, { storyPageCount });

    // Parse brand kit if provided
    if (req.body.brandKit) {
      try {
        const brandKit = JSON.parse(req.body.brandKit);
        updateJob(job.id, { brandKit });
      } catch {
        // ignore
      }
    }

    // Parse user overrides if provided
    let userOverrides: Record<string, boolean> | undefined;
    let presetDefaults: Record<string, boolean> | undefined;
    if (req.body.userOverrides) {
      try { userOverrides = JSON.parse(req.body.userOverrides); } catch { /* ignore */ }
    }
    if (req.body.presetDefaults) {
      try { presetDefaults = JSON.parse(req.body.presetDefaults); } catch { /* ignore */ }
    }

    // Build brain context from user selections
    const brainContext = {
      editStyle,
      captionTemplate,
      voiceoverStyle,
      targetLanguage,
      storyPageCount,
      brandKit: job.brandKit,
      preset: req.body.preset,
      presetDefaults,
      userOverrides,
    };

    // Generate execution plan via Claude API
    const { plan, enabledCount, brainNotes } = await generatePlan(prompt, files, job.options, model, brainContext);
    const costEstimate = estimateCost(plan);
    const updateFields: Record<string, unknown> = { plan, enabledFeaturesCount: enabledCount, costEstimate };
    if (brainNotes && brainNotes.length > 0) {
      updateFields.brainNotes = brainNotes;
    }
    updateJob(job.id, updateFields);

    // Get updated job with plan
    const updatedJob = getJob(job.id)!;

    // Start preview generation in background (don't await)
    // Pipeline will wait for user approval before rendering
    startJob(updatedJob).catch((err) => {
      console.error(`Preview generation failed for job ${job.id}:`, err);
    });

    res.status(201).json(updatedJob);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'שגיאה ביצירת העבודה' });
  }
});

// GET /api/jobs — list all jobs
router.get('/', (_req, res) => {
  const jobs = listJobs();
  res.json(jobs);
});

// GET /api/jobs/:id — get single job
router.get('/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'עבודה לא נמצאה' });
  }
  res.json(job);
});

// GET /api/jobs/:id/video — serve video with optional format parameter
router.get('/:id/video', (req, res) => {
  const format = req.query.format as string;
  const jobId = req.params.id;

  let videoPath: string;

  if (format && format !== '16x9') {
    videoPath = `output/${jobId}/final_${format}.mp4`;
  } else {
    videoPath = getActiveVideoPath(jobId);
  }

  if (!fs.existsSync(videoPath)) {
    // Fallback to main video
    videoPath = `output/${jobId}/final.mp4`;
  }

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  // Support range requests for video streaming
  const stat = fs.statSync(videoPath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    fs.createReadStream(videoPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(videoPath).pipe(res);
  }
});

// GET /api/jobs/:id/thumbnail — serve thumbnail
router.get('/:id/thumbnail', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'עבודה לא נמצאה' });
  }

  const thumbPath = path.resolve(`output/${job.id}/thumbnail.jpg`);
  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(thumbPath).pipe(res);
  } else {
    res.status(404).json({ error: 'תמונה ממוזערת לא זמינה' });
  }
});

// GET /api/jobs/:id/versions — list all versions
router.get('/:id/versions', (req, res) => {
  const managedVersions = getManagedVersions(req.params.id);
  if (managedVersions.length > 0) {
    res.json(managedVersions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      prompt: v.prompt,
      type: v.type,
      timeRange: v.timeRange,
      duration: v.videoDuration,
      date: v.date,
      videoUrl: v.videoUrl,
      isActive: v.isActive,
      timeline: v.timeline,
    })));
  } else {
    // Fall back to store versions for backward compatibility
    const job = getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'עבודה לא נמצאה' });
    }
    const versions = getStoreVersions(job.id);
    res.json(versions);
  }
});

// GET /api/jobs/:id/versions/:vnum/video — serve version video
router.get('/:id/versions/:vnum/video', (req, res) => {
  const version = getManagedVersion(req.params.id, parseInt(req.params.vnum));
  if (!version || !version.filePath) {
    return res.status(404).json({ error: 'Version not found' });
  }

  if (!fs.existsSync(version.filePath)) {
    return res.status(404).json({ error: 'Version file not found' });
  }

  res.sendFile(path.resolve(version.filePath));
});

// POST /api/jobs/:id/versions/:vnum/revert — revert to version
router.post('/:id/versions/:vnum/revert', (req, res) => {
  const version = revertToVersion(req.params.id, parseInt(req.params.vnum));
  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  // Update job result
  const job = getJob(req.params.id);
  if (job) {
    updateJob(req.params.id, {
      result: {
        ...job.result!,
        videoUrl: version.videoUrl,
        timeline: version.timeline,
        duration: version.videoDuration || job.result?.duration || 0,
      },
    });
  }

  res.json({ success: true, activeVersion: version.versionNumber });
});

// POST /api/jobs/:id/revisions — submit revision
router.post('/:id/revisions', async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const revision: RevisionRequest = req.body;

  try {
    updateJob(req.params.id, {
      status: 'processing',
      currentStep: 'מעבד תיקון...',
    });

    // Process revision in background
    processRevision(job, revision, job.plan!, job.transcript)
      .then(result => {
        updateJob(req.params.id, {
          status: 'done',
          currentStep: '',
          result: {
            ...job.result!,
            videoUrl: result.version.videoUrl,
            timeline: result.version.timeline,
          },
          versions: [...(job.versions || []), result.version.id],
        });
      })
      .catch(error => {
        console.error('Revision failed:', error);
        updateJob(req.params.id, {
          status: 'done', // revert to done, not error
          currentStep: '',
        });
      });

    res.json({ success: true, message: 'Revision processing started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chat-based editing is now handled by the Claude-powered chatEditor route
// See: server/routes/chatEditor.ts (registered at /api/jobs/:id/chat)

export default router;
