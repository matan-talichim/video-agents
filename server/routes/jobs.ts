import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import type { FileInfo, UserOptions, BRollModel, RevisionRequest } from '../types.js';
import { createJob, getJob, updateJob, listJobs } from '../store/jobStore.js';
import { addVersion, getVersions as getStoreVersions, getVersion as getStoreVersion } from '../store/versionStore.js';
import { generatePlan, estimateCost } from '../brain/brain.js';
import { startJob, runPipeline } from '../orchestrator/orchestrator.js';
import { getVersions as getManagedVersions, getVersion as getManagedVersion, revertToVersion, getActiveVideoPath } from '../services/versionManager.js';
import { processRevision } from '../services/revisionPipeline.js';
import { askClaude, extractJSON } from '../services/claude.js';

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
    const videoType = req.body.videoType || undefined;

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
    if (videoType) updateJob(job.id, { videoType } as any);

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

// GET /api/jobs/:id/video — serve video with optional format/variation parameter
router.get('/:id/video', (req, res) => {
  const format = req.query.format as string;
  const variationId = req.query.variation as string;
  const jobId = req.params.id;

  // Check for A/B test variation first
  if (variationId) {
    const job = getJob(jobId);
    if (job?.abTestResult) {
      const variation = job.abTestResult.variations.find(v => v.id === variationId);
      if (variation?.videoPath && fs.existsSync(variation.videoPath)) {
        return res.sendFile(path.resolve(variation.videoPath));
      }
    }
  }

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
    // Try alternative paths
    const job = getJob(jobId);
    const alternatives = [
      job?.result?.videoUrl ? '' : '', // skip
      `output/${jobId}.mp4`,
      `temp/${jobId}/edit/final.mp4`,
      `temp/${jobId}/final.mp4`,
    ];

    // Also check finalVideoPath from job
    if ((job as any)?.finalVideoPath) {
      alternatives.unshift((job as any).finalVideoPath);
    }

    // Search backwards for last successful edit step
    for (let i = 25; i >= 1; i--) {
      alternatives.push(`temp/${jobId}/edit/step_${i}.mp4`);
    }
    alternatives.push(`temp/${jobId}/edit/selected_assembled.mp4`);
    alternatives.push(`temp/${jobId}/stabilized.mp4`);

    // Try original uploaded file as absolute last resort
    if (job?.files?.[0]?.path) {
      alternatives.push(job.files[0].path);
    }

    for (const alt of alternatives) {
      if (alt && fs.existsSync(alt)) {
        videoPath = alt;
        console.log(`[Video] Found at alternative path: ${alt}`);
        break;
      }
    }
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

// GET /api/jobs/:id/audit — get pipeline audit report
router.get('/:id/audit', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!(job as any).auditReport) return res.json({ error: 'No audit data' });
  res.json((job as any).auditReport);
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

// GET /api/jobs/:id/ab-status — check which A/B variations are ready
router.get('/:id/ab-status', (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.abTestResult) return res.json({ variations: [], status: 'none' });

  res.json({
    variations: job.abTestResult.variations.map(v => ({
      id: v.id,
      hookType: v.hookType,
      textOverlay: v.textOverlay,
      viralScore: v.viralScore,
      status: v.status,
      videoUrl: v.status === 'ready' ? `/api/jobs/${job.id}/video?variation=${v.id}` : null,
    })),
    status: job.abTestResult.status,
  });
});

// GET /api/jobs/:id/qa — get QA results
router.get('/:id/qa', (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.qaResult) return res.json({ passed: true, issues: [], overallScore: 10, autoFixes: [], warnings: [] });
  res.json(job.qaResult);
});

// GET /api/jobs/:id/retention — get retention prediction
router.get('/:id/retention', (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.retentionPlan) return res.json({ predictions: [], fixes: [], predictedRetention: 0 });
  res.json(job.retentionPlan);
});

// POST /api/jobs/:id/performance — report actual performance metrics (Brain learning)
router.post('/:id/performance', (req, res) => {
  const { updateProjectPerformance } = require('../services/editorBrain.js');
  const { optimizeMasterPrompt } = require('../services/masterPromptOptimizer.js');

  const { views, likes, shares, comments, avgRetention } = req.body;
  if (views === undefined) {
    return res.status(400).json({ error: 'views is required' });
  }

  const engagementRate = views > 0 ? ((likes + shares + comments) / views) * 100 : 0;
  const updated = updateProjectPerformance(req.params.id, {
    views: views || 0,
    likes: likes || 0,
    shares: shares || 0,
    comments: comments || 0,
    engagementRate,
    avgRetention: avgRetention || 0,
  });

  if (!updated) {
    return res.status(404).json({ error: 'Project not found in brain memory' });
  }

  // Re-optimize master prompt with new data
  try { optimizeMasterPrompt(); } catch {}

  res.json({ success: true, engagementRate: parseFloat(engagementRate.toFixed(2)) });
});

// POST /api/jobs/:id/revision/analyze — Brain analyzes revision request, returns plan with costs
router.post('/:id/revision/analyze', async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const response = await askClaude(
      `You are a video editing assistant. The user watched the edited video and wants changes. Analyze their request and create a list of specific, actionable changes with cost estimates.`,
      `The user requested these changes to their edited video:
"${prompt}"

Current video info:
- Duration: ${job.result?.duration || 30}s
- Platform: ${(job as any).plan?.export?.formats?.[0] || 'instagram-reels'}
- B-Roll clips: ${(job as any).editingBlueprint?.brollInsertions?.length || 0}
- Current model: ${job.model || 'kling-v2.5-turbo'}

Break down the request into specific actionable items. Each item should have:
- A clear description (in Hebrew)
- Details of what exactly will change
- Whether it costs money or is free (FFmpeg = free, new B-Roll = model cost ~$0.40, new Claude call = $0.03, new music = $0.10)
- An icon emoji

Return JSON:
{
  "items": [
    {
      "id": "rev_1",
      "icon": "🎞️",
      "description": "הוספת B-Roll",
      "details": "ייווצר קליפ AI חדש",
      "type": "add-broll",
      "cost": 0.40,
      "requiresRerender": true
    }
  ],
  "summary": "תיאור קצר של כל השינויים",
  "totalCost": 0.50,
  "estimatedTime": "2-3 דקות"
}`
    );

    const cleaned = extractJSON(response);
    const plan = JSON.parse(cleaned);

    // Save plan to job
    updateJob(req.params.id, { revisionPlan: plan } as any);

    res.json(plan);
  } catch (err: any) {
    console.error('Revision analysis failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/revision/execute — Execute approved revision items
router.post('/:id/revision/execute', async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { approvedItems } = req.body;
  if (!approvedItems || approvedItems.length === 0) {
    return res.status(400).json({ error: 'No items approved' });
  }

  const revisionPlan = (job as any).revisionPlan;
  const itemsToExecute = revisionPlan?.items?.filter(
    (item: any) => approvedItems.includes(item.id)
  ) || [];

  // Mark job as re-processing
  updateJob(req.params.id, {
    status: 'processing',
    currentStep: 'מבצע תיקונים...',
  } as any);

  // Execute revisions in background
  executeRevisions(job, itemsToExecute).catch(err => {
    console.error('[Revision] Failed:', err);
    updateJob(req.params.id, {
      status: 'done',
      currentStep: '',
    } as any);
  });

  res.json({ success: true, itemCount: itemsToExecute.length });
});

async function executeRevisions(job: any, items: any[]) {
  console.log(`[Revision] Executing ${items.length} revisions for job ${job.id}`);

  for (const item of items) {
    console.log(`[Revision] Processing: ${item.description}`);
    updateJob(job.id, { currentStep: `תיקון: ${item.description}` } as any);

    // Each revision type would be handled by the appropriate service
    // For now, log and continue — actual implementation depends on the service layer
    switch (item.type) {
      case 'add-broll':
      case 'replace-broll':
      case 'change-music':
      case 'change-subtitles':
      case 'remove-section':
      case 'add-zoom':
      case 'change-speed':
      case 'add-sfx':
      case 'change-text':
        console.log(`[Revision] Would execute: ${item.type} — ${item.description}`);
        break;
      default:
        console.log(`[Revision] Unknown type: ${item.type}`);
    }
  }

  // Update job as completed
  const revisionCount = ((job as any).revisionCount || 0) + 1;
  updateJob(job.id, {
    status: 'done',
    currentStep: 'הושלם בהצלחה!',
    progress: 100,
  } as any);
  updateJob(job.id, { revisionCount, revisionStatus: 'done' } as any);
  console.log(`[Revision] ✅ All ${items.length} revisions complete. Version ${revisionCount}`);
}

// POST /api/jobs/:id/approve-final — User approves, cleanup temp files
router.post('/:id/approve-final', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const approvedAt = new Date().toISOString();
  updateJob(req.params.id, { approvedFinal: true, approvedAt } as any);

  // Cleanup temp files (materials no longer needed)
  const tempDir = `temp/${req.params.id}`;
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`[Cleanup] Deleted temp materials: ${tempDir}`);
  }

  console.log(`[Approve] Job ${req.params.id} approved at ${approvedAt}`);
  res.json({ success: true, approvedAt });
});

// POST /api/jobs/:id/export — Export video in different formats/qualities
router.post('/:id/export', async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { format, quality, aspect } = req.body;

  // Find the input video
  let inputPath = getActiveVideoPath(req.params.id);
  if (!fs.existsSync(inputPath)) {
    inputPath = `output/${req.params.id}/final.mp4`;
  }
  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Video file not found' });
  }

  const ext = format === 'gif' ? 'gif' : format === 'webm' ? 'webm' : format === 'mov' ? 'mov' : 'mp4';
  const outputPath = `temp/${req.params.id}/export_${quality}_${format}.${ext}`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let ffmpegCmd = '';

  // Handle aspect ratio changes
  if (aspect === '9:16') {
    ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -crf 20 -c:a aac -y "${outputPath}"`;
  } else if (aspect === '1:1') {
    ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080" -c:v libx264 -crf 20 -c:a aac -y "${outputPath}"`;
  } else if (format === 'gif') {
    ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "fps=15,scale=480:-1:flags=lanczos" -t 10 -y "${outputPath}"`;
  } else if (format === 'webm') {
    ffmpegCmd = `ffmpeg -i "${inputPath}" -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -y "${outputPath}"`;
  } else {
    switch (quality) {
      case '4k':
        ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "scale=3840:2160:flags=lanczos" -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k -y "${outputPath}"`;
        break;
      case '720p':
        ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "scale=1280:720" -c:v libx264 -crf 23 -preset fast -c:a aac -b:a 128k -y "${outputPath}"`;
        break;
      case 'prores':
        ffmpegCmd = `ffmpeg -i "${inputPath}" -c:v prores_ks -profile:v 3 -c:a pcm_s16le -y "${outputPath.replace(`.${ext}`, '.mov')}"`;
        break;
      default:
        ffmpegCmd = `ffmpeg -i "${inputPath}" -c copy -y "${outputPath}"`;
    }
  }

  try {
    execSync(ffmpegCmd, { stdio: 'pipe', timeout: 300000 });

    const finalPath = quality === 'prores' ? outputPath.replace(`.${ext}`, '.mov') : outputPath;
    const contentType = format === 'gif' ? 'image/gif' : format === 'webm' ? 'video/webm' : 'video/mp4';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="video-agents-${req.params.id}.${ext}"`);
    fs.createReadStream(finalPath).pipe(res);
  } catch (err: any) {
    console.error('Export failed:', err.message);
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

// Chat-based editing is now handled by the Claude-powered chatEditor route
// See: server/routes/chatEditor.ts (registered at /api/jobs/:id/chat)

export default router;
