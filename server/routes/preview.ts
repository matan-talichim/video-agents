import { Router } from 'express';
import { getJob, updateJob } from '../store/jobStore.js';
import { generatePreview, updatePreview } from '../services/previewGenerator.js';
import { runPipeline } from '../orchestrator/orchestrator.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// GET /api/jobs/:id/preview — get current preview data
router.get('/:id/preview', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.previewData) return res.status(404).json({ error: 'No preview available' });

  res.json(job.previewData);
});

// GET /api/jobs/:id/preview/frame/:index — serve a preview frame image
router.get('/:id/preview/frame/:index', (req, res) => {
  const job = getJob(req.params.id);
  if (!job || !job.previewData) return res.status(404).json({ error: 'Not found' });

  const frameIndex = parseInt(req.params.index);
  const frame = job.previewData.keyFrames[frameIndex];

  if (!frame || !fs.existsSync(frame.imagePath)) {
    return res.status(404).json({ error: 'Frame not found' });
  }

  res.sendFile(path.resolve(frame.imagePath));
});

// POST /api/jobs/:id/preview/approve — user approves, start rendering
router.post('/:id/preview/approve', async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.previewData) return res.status(400).json({ error: 'No preview to approve' });

  // Save approved suggestions if provided
  const approvedSuggestions = req.body.approvedSuggestions || {};

  // Update job status to 'processing' BEFORE starting pipeline
  // so the frontend can navigate to ProcessingPage immediately.
  // Analysis (transcription, speaker detection, content analysis) was already done
  // in startJob() before preview — skip straight to generation phase.
  const analysisAlreadyDone = !!(job as any).transcript || !!(job as any).contentAnalysis;
  updateJob(job.id, {
    status: 'processing',
    approvedAt: new Date().toISOString(),
    plan: job.previewData.plan,
    currentStep: analysisAlreadyDone ? 'generating-broll' : 'transcribing',
    progress: analysisAlreadyDone ? 35 : 0,
  } as any);

  // Get the updated job
  const updatedJob = getJob(job.id)!;
  (updatedJob as any).approvedSuggestions = approvedSuggestions;
  if (!updatedJob.completedPipelineSteps) (updatedJob as any).completedPipelineSteps = [];

  // Start the real rendering pipeline in background (don't await)
  runPipeline(updatedJob).catch((error: any) => {
    console.error('Pipeline failed:', error);
    updateJob(job.id, {
      status: 'error',
      currentStep: error.message,
    });
  });

  // Return immediately so frontend can navigate
  res.json({ success: true, status: 'processing', message: 'הסרטון מתחיל להיערך!' });
});

// POST /api/jobs/:id/preview/change — user requests a change, regenerate preview
router.post('/:id/preview/change', async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.previewData) return res.status(400).json({ error: 'No preview to modify' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Change request message required' });

  try {
    // Save current preview to history
    const history = job.previewHistory || [];
    history.push(job.previewData);

    // Update status
    updateJob(job.id, {
      status: 'planning',
      currentStep: 'מעדכן תוכנית...',
      previewHistory: history,
    } as any);

    // Generate updated preview
    const currentJob = getJob(job.id)!;
    const newPreview = await updatePreview(currentJob, job.previewData, message);

    updateJob(job.id, {
      previewData: newPreview,
      status: 'preview',
      currentStep: '',
    } as any);

    res.json({
      success: true,
      preview: newPreview,
      message: 'התוכנית עודכנה! בדוק את ה-preview החדש.',
    });
  } catch (error: any) {
    console.error('Preview update failed:', error);
    updateJob(job.id, {
      status: 'preview',
    });
    res.status(500).json({ error: 'Failed to update preview' });
  }
});

// POST /api/jobs/:id/preview/undo — undo last change
router.post('/:id/preview/undo', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (!job.previewHistory || job.previewHistory.length === 0) {
    return res.status(400).json({ error: 'Nothing to undo' });
  }

  // Pop last preview from history
  const history = [...job.previewHistory];
  const previousPreview = history.pop()!;

  updateJob(job.id, {
    previewData: previousPreview,
    previewHistory: history,
    status: 'preview',
  } as any);

  res.json({ success: true, preview: previousPreview });
});

export default router;
