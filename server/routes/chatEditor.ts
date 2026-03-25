import { Router } from 'express';
import { askClaude } from '../services/claude.js';
import { getJob, updateJob } from '../store/jobStore.js';
import { addVersion } from '../store/versionStore.js';

const router = Router();

const CHAT_EDITOR_SYSTEM = `You are an AI video editor assistant. The user sends edit commands in Hebrew.
You analyze the command and return a JSON action plan.

Available actions:
- change_music: { "action": "change_music", "mood": "energetic|calm|dramatic" }
- change_volume: { "action": "change_volume", "target": "music|speech", "level": 0.0-1.0 }
- add_broll: { "action": "add_broll", "timestamp": number, "prompt": "description" }
- remove_segment: { "action": "remove_segment", "start": number, "end": number }
- change_subtitles: { "action": "change_subtitles", "style": "animated|simple|karaoke|bounce|typewriter" }
- change_color: { "action": "change_color", "style": "cinematic|bright|moody|vintage|clean" }
- add_text: { "action": "add_text", "text": "...", "timestamp": number, "duration": number }
- change_pacing: { "action": "change_pacing", "pacing": "fast|normal|calm" }
- add_zoom: { "action": "add_zoom", "timestamp": number, "zoom_factor": number }
- add_sfx: { "action": "add_sfx", "timestamp": number, "effect": "whoosh|ding|boom" }
- general_feedback: { "action": "general_feedback", "description": "what to change" }

Return JSON: { "action": "...", ...params, "response_message": "Hebrew message to user explaining what you did" }`;

// POST /api/jobs/:id/chat — process a chat edit command with Claude AI
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const job = getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'עבודה לא נמצאה' });
    }

    if (!message) {
      return res.status(400).json({ error: 'חסרה הודעה' });
    }

    // Send to Claude: current job state + user's edit command
    const userMessage = `Current video: ${job.result?.duration || 60} seconds long.
Current features enabled: ${JSON.stringify(job.plan?.edit || {})}.

User command: "${message}"`;

    let actionPlan: any;

    try {
      const response = await askClaude(CHAT_EDITOR_SYSTEM, userMessage);

      const jsonStr = response
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      actionPlan = JSON.parse(jsonStr);
    } catch {
      actionPlan = {
        action: 'general_feedback',
        description: message,
        response_message: 'מבין את הבקשה. אני מעבד את השינוי...',
      };
    }

    // Create a new version for this chat edit
    const currentVersions = job.versions || [];
    const timeline = job.result?.timeline || [];

    const version = addVersion({
      jobId: id,
      prompt: message,
      type: 'chat',
      timeline,
      videoUrl: job.result?.videoUrl || `/api/jobs/${id}/video`,
    });

    updateJob(id, {
      versions: [...currentVersions, version.id],
    });

    res.json({
      success: true,
      action: actionPlan.action,
      message: actionPlan.response_message || 'בוצע! הסרטון עודכן.',
      versionId: version.id,
      versionNumber: version.versionNumber,
      response: actionPlan.response_message || 'בוצע! הסרטון עודכן.',
      version,
      applied: true,
    });

  } catch (error: any) {
    console.error('Chat editor error:', error.message);
    res.status(500).json({ error: 'שגיאה בעיבוד ההודעה' });
  }
});

export default router;
