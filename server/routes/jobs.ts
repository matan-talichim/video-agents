import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { FileInfo, UserOptions, BRollModel } from '../types.js';
import { createJob, getJob, updateJob, listJobs } from '../store/jobStore.js';
import { addVersion, getVersions, getVersion } from '../store/versionStore.js';
import { generatePlan, estimateCost } from '../brain/brain.js';
import { runPipeline } from '../orchestrator/orchestrator.js';

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

    // Build brain context from user selections
    const brainContext = {
      editStyle,
      captionTemplate,
      voiceoverStyle,
      targetLanguage,
      storyPageCount,
      brandKit: job.brandKit,
    };

    // Generate execution plan via Claude API
    const { plan, enabledCount } = await generatePlan(prompt, files, job.options, model, brainContext);
    const costEstimate = estimateCost(plan);
    updateJob(job.id, { plan, enabledFeaturesCount: enabledCount, costEstimate });

    // Get updated job with plan
    const updatedJob = getJob(job.id)!;

    // Start pipeline in background (don't await)
    runPipeline(updatedJob).catch((err) => {
      console.error(`Pipeline failed for job ${job.id}:`, err);
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

// GET /api/jobs/:id/video — serve output video
router.get('/:id/video', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'עבודה לא נמצאה' });
  }

  // Support format query parameter (e.g., ?format=9x16)
  const format = req.query.format as string | undefined;
  let videoPath: string;

  if (format && format !== '16x9') {
    videoPath = path.resolve(`output/${job.id}/final_${format}.mp4`);
  } else {
    videoPath = path.resolve(`output/${job.id}/final.mp4`);
  }

  if (fs.existsSync(videoPath)) {
    const stat = fs.statSync(videoPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');

    // Support range requests for video seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', chunkSize);
      fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
      fs.createReadStream(videoPath).pipe(res);
    }
  } else {
    res.status(404).json({
      error: 'הסרטון עדיין לא זמין',
      jobId: job.id,
      status: job.status,
    });
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

// GET /api/jobs/:id/versions — list versions
router.get('/:id/versions', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'עבודה לא נמצאה' });
  }
  const versions = getVersions(job.id);
  res.json(versions);
});

// GET /api/jobs/:id/versions/:vid — serve version video
router.get('/:id/versions/:vid', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'עבודה לא נמצאה' });
  }
  const version = getVersion(job.id, req.params.vid);
  if (!version) {
    return res.status(404).json({ error: 'גרסה לא נמצאה' });
  }
  res.json(version);
});

// POST /api/jobs/:id/revisions — create a revision
router.post('/:id/revisions', async (req, res) => {
  try {
    const job = getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'עבודה לא נמצאה' });
    }

    const { type, prompt, timeRange, newDuration } = req.body;

    if (!type || !prompt) {
      return res.status(400).json({ error: 'חסרים שדות חובה: type, prompt' });
    }

    // Update job to processing state
    updateJob(job.id, {
      status: 'processing',
      currentStep: 'מעבד תיקון...',
      progress: 10,
    });

    // Simulate revision processing
    const steps = [
      { name: 'ניתוח בקשת תיקון', progress: 20 },
      { name: 'תכנון שינויים', progress: 40 },
      { name: 'ביצוע עריכה', progress: 60 },
      { name: 'רינדור מחדש', progress: 80 },
      { name: 'אימות תוצאה', progress: 95 },
    ];

    for (const step of steps) {
      updateJob(job.id, { currentStep: step.name, progress: step.progress });
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Create simulated timeline for revision
    const duration = newDuration || (job.result?.duration || 60);
    const timeline = job.result?.timeline || [{
      start: 0,
      end: duration,
      label: 'קטע מעודכן',
      type: 'original' as const,
    }];

    // Parse timeRange if provided
    let parsedTimeRange: { from: number; to: number } | undefined;
    if (timeRange) {
      parsedTimeRange = {
        from: parseFloat(timeRange.from) || 0,
        to: parseFloat(timeRange.to) || duration,
      };
    }

    // Create new version
    const version = addVersion({
      jobId: job.id,
      prompt,
      type,
      timeRange: parsedTimeRange,
      duration: newDuration,
      timeline,
      videoUrl: `/api/jobs/${job.id}/video`,
    });

    // Update job
    const currentVersions = job.versions || [];
    updateJob(job.id, {
      status: 'done',
      progress: 100,
      currentStep: 'תיקון הושלם!',
      versions: [...currentVersions, version.id],
    });

    const updatedJob = getJob(job.id);
    res.json({ job: updatedJob, version });
  } catch (error) {
    console.error('Error creating revision:', error);
    res.status(500).json({ error: 'שגיאה ביצירת תיקון' });
  }
});

// POST /api/jobs/:id/chat — chat-based editing
router.post('/:id/chat', async (req, res) => {
  try {
    const job = getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'עבודה לא נמצאה' });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'חסרה הודעה' });
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate contextual Hebrew responses
    const responses: Record<string, string[]> = {
      default: [
        `הבנתי את הבקשה שלך. ביצעתי את השינויים בסרטון לפי ההוראות: "${message}". אפשר לראות את התוצאה בתצוגה המקדימה.`,
        `עדכנתי את הסרטון בהתאם. השינוי "${message}" יושם בהצלחה. רוצה לבצע שינויים נוספים?`,
        `השינויים בוצעו! הסרטון עודכן לפי הבקשה שלך. אם משהו לא מדויק, אפשר לתקן.`,
      ],
      subtitle: [
        'עדכנתי את הכתוביות בהתאם לבקשה. הסגנון והמיקום שונו. רוצה לראות את התוצאה?',
        'הכתוביות עודכנו בהצלחה! הוספתי הדגשות למילות מפתח. מה עוד לשנות?',
      ],
      music: [
        'החלפתי את המוזיקה בהתאם לבקשה. הקצב מותאם עכשיו לאנרגיה של הסרטון.',
        'המוזיקה עודכנה! הווליום מותאם אוטומטית לדיבור. מתאים?',
      ],
      cut: [
        'חתכתי את הקטע לפי ההוראות. הסרטון מעודכן עם מעברים חלקים.',
        'הקטע הוסר/קוצר בהתאם. המעברים תוקנו אוטומטית.',
      ],
      color: [
        'תיקון הצבע בוצע בהצלחה. הגרדיאנט מותאם לסגנון שבחרת.',
        'הצבעים עודכנו! הלוק כולל עכשיו יותר עומק ועקביות.',
      ],
      zoom: [
        'הוספתי זומים חכמים בנקודות ההדגשה. התנועה חלקה ומקצועית.',
        'הזומים עודכנו! הסגנון מותאם לאנרגיה של כל קטע.',
      ],
    };

    // Detect category from message
    const lowerMsg = message.toLowerCase();
    let category = 'default';
    if (lowerMsg.includes('כתוב') || lowerMsg.includes('subtitle') || lowerMsg.includes('טקסט')) category = 'subtitle';
    else if (lowerMsg.includes('מוזיקה') || lowerMsg.includes('שיר') || lowerMsg.includes('music')) category = 'music';
    else if (lowerMsg.includes('חתוך') || lowerMsg.includes('קצר') || lowerMsg.includes('הסר') || lowerMsg.includes('cut')) category = 'cut';
    else if (lowerMsg.includes('צבע') || lowerMsg.includes('color') || lowerMsg.includes('גרדיאנט')) category = 'color';
    else if (lowerMsg.includes('זום') || lowerMsg.includes('zoom') || lowerMsg.includes('הגדל')) category = 'zoom';

    const categoryResponses = responses[category];
    const response = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

    // Create a chat version
    const timeline = job.result?.timeline || [];
    const version = addVersion({
      jobId: job.id,
      prompt: message,
      type: 'chat',
      timeline,
      videoUrl: `/api/jobs/${job.id}/video`,
    });

    const currentVersions = job.versions || [];
    updateJob(job.id, {
      versions: [...currentVersions, version.id],
    });

    res.json({
      response,
      version,
      applied: true,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'שגיאה בעיבוד ההודעה' });
  }
});

export default router;
