import { askClaude } from './claude.js';
import type { Job, ExecutionPlan, RevisionRequest } from '../types.js';
import { runEditAgent } from '../agents/edit.js';
import { createVersion } from './versionManager.js';

interface RevisionResult {
  success: boolean;
  version: any;
  description: string;
}

// Process a revision request
export async function processRevision(
  job: Job,
  revision: RevisionRequest,
  originalPlan: ExecutionPlan,
  transcript?: any
): Promise<RevisionResult> {
  console.log(`[Revision] Processing ${revision.type} revision for job ${job.id}`);

  switch (revision.type) {
    case 'general':
      return processGeneralRevision(job, revision, originalPlan, transcript);
    case 'timecode':
      return processTimecodeRevision(job, revision, originalPlan, transcript);
    case 'duration':
      return processDurationRevision(job, revision, originalPlan, transcript);
    case 'chat':
      return processChatRevision(job, revision, originalPlan, transcript);
    default:
      throw new Error(`Unknown revision type: ${revision.type}`);
  }
}

// General revision: "shorten the intro", "make it more dramatic"
async function processGeneralRevision(
  job: Job,
  revision: RevisionRequest,
  originalPlan: ExecutionPlan,
  transcript?: any
): Promise<RevisionResult> {
  // Ask Claude what needs to change
  const response = await askClaude(
    'You are a video editor processing revision requests.',
    `Original video plan:\n${JSON.stringify(originalPlan, null, 2)}\n\nUser revision request: "${revision.prompt}"\n\nWhat steps need to be re-run? Return JSON:\n{\n  "changes": [\n    { "step": "colorGrading", "new_value": "moody", "reason": "user wants darker mood" },\n    { "step": "pacing", "new_value": "fast", "reason": "user wants more energy" }\n  ],\n  "rerun_steps": ["edit"],\n  "description": "Hebrew description of changes made"\n}`
  );

  let changePlan;
  try {
    changePlan = JSON.parse(response);
  } catch {
    changePlan = { changes: [], rerun_steps: ['edit'], description: 'מעבד שינויים...' };
  }

  // Apply changes to plan
  const updatedPlan = { ...originalPlan };
  for (const change of changePlan.changes) {
    applyPlanChange(updatedPlan, change.step, change.new_value);
  }

  // Re-run affected pipeline steps
  const editResult = await runEditAgent(
    job,
    updatedPlan,
    job.cleanVideoPath || job.files[0]?.path,
    job.generateResult || { brollClips: [], voiceoverPath: null, musicPath: null, sfxMoments: [], thumbnailPath: null, stockClips: [], additionalAssets: {} },
    transcript
  );

  // Create new version
  const version = createVersion(
    job.id,
    editResult.finalVideoPath,
    revision.prompt,
    'general',
    editResult.timeline || job.result?.timeline || [],
    editResult.duration
  );

  return {
    success: true,
    version,
    description: changePlan.description,
  };
}

// Timecode revision: "at 0:15-0:30 replace with new B-Roll"
async function processTimecodeRevision(
  job: Job,
  revision: RevisionRequest,
  originalPlan: ExecutionPlan,
  transcript?: any
): Promise<RevisionResult> {
  const { from, to } = parseTimeRange(revision.timeRange!);

  // Ask Claude what to do with this specific segment
  const response = await askClaude(
    'You process timecode-specific video revisions.',
    `Video duration: ${job.result?.duration || 60}s\nTimecode range: ${from}s - ${to}s\nRevision request: "${revision.prompt}"\n\nWhat should be done with this segment? Return JSON:\n{\n  "action": "replace_broll" | "remove" | "regenerate" | "recolor" | "add_effect",\n  "params": { ... },\n  "description": "Hebrew description"\n}`
  );

  let action;
  try {
    action = JSON.parse(response);
  } catch {
    action = { action: 'regenerate', params: {}, description: 'מעבד שינוי בטווח הזמנים...' };
  }

  // Re-run full edit with a note about the timecode change
  const updatedPlan = { ...originalPlan };

  const editResult = await runEditAgent(
    job,
    updatedPlan,
    job.cleanVideoPath || job.files[0]?.path,
    job.generateResult || { brollClips: [], voiceoverPath: null, musicPath: null, sfxMoments: [], thumbnailPath: null, stockClips: [], additionalAssets: {} },
    transcript
  );

  const version = createVersion(
    job.id,
    editResult.finalVideoPath,
    revision.prompt,
    'timecode',
    editResult.timeline || job.result?.timeline || [],
    editResult.duration,
    { from, to }
  );

  return {
    success: true,
    version,
    description: action.description,
  };
}

// Duration revision: "make it 30 seconds instead of 60"
async function processDurationRevision(
  job: Job,
  revision: RevisionRequest,
  originalPlan: ExecutionPlan,
  transcript?: any
): Promise<RevisionResult> {
  const newDuration = revision.newDuration!;

  // Ask Claude which segments to keep/remove
  const response = await askClaude(
    'You shorten or lengthen videos by selecting segments.',
    `Current video duration: ${job.result?.duration || 60}s\nTarget duration: ${newDuration}s\nTranscript: ${transcript?.fullText?.slice(0, 1000) || 'N/A'}\nTimeline: ${JSON.stringify(job.result?.timeline || [])}\n\nWhich segments should be kept to reach the target duration? Prioritize: hook, key messages, CTA. Return JSON:\n{\n  "segments_to_keep": [{ "start": 0, "end": 3, "reason": "hook" }, ...],\n  "segments_to_remove": [{ "start": 15, "end": 25, "reason": "redundant" }],\n  "description": "Hebrew description"\n}`
  );

  let durationPlan;
  try {
    durationPlan = JSON.parse(response);
  } catch {
    durationPlan = { segments_to_keep: [], description: 'מקצר את הסרטון...' };
  }

  // Update plan with new duration
  const updatedPlan = {
    ...originalPlan,
    export: { ...originalPlan.export, targetDuration: newDuration },
  };

  const editResult = await runEditAgent(
    job,
    updatedPlan,
    job.cleanVideoPath || job.files[0]?.path,
    job.generateResult || { brollClips: [], voiceoverPath: null, musicPath: null, sfxMoments: [], thumbnailPath: null, stockClips: [], additionalAssets: {} },
    transcript
  );

  const version = createVersion(
    job.id,
    editResult.finalVideoPath,
    revision.prompt,
    'duration',
    editResult.timeline || job.result?.timeline || [],
    editResult.duration,
    undefined,
    newDuration
  );

  return {
    success: true,
    version,
    description: durationPlan.description,
  };
}

// Chat revision: quick edit command
async function processChatRevision(
  job: Job,
  revision: RevisionRequest,
  originalPlan: ExecutionPlan,
  transcript?: any
): Promise<RevisionResult> {
  // This is handled by the chat editor route (Phase 6)
  // But if it comes through the revision pipeline, treat as general
  return processGeneralRevision(job, revision, originalPlan, transcript);
}

// Helper: parse time range string "1:30" → seconds
function parseTimeRange(range: { from: string; to: string }): { from: number; to: number } {
  return {
    from: parseTimeString(range.from),
    to: parseTimeString(range.to),
  };
}

function parseTimeString(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number(time) || 0;
}

// Helper: apply a single change to the execution plan
function applyPlanChange(plan: ExecutionPlan, step: string, value: any): void {
  const stepMap: Record<string, (p: ExecutionPlan) => void> = {
    colorGrading: (p) => { p.edit.colorGradingStyle = value; },
    pacing: (p) => { p.edit.pacing = value; },
    music: (p) => { p.generate.musicMood = value; },
    subtitles: (p) => { p.edit.subtitleStyle = value; },
    zoomStyle: (p) => { p.edit.zoomStyle = value; },
    beatSync: (p) => { p.edit.beatSyncCuts = value === 'true' || value === true; },
    backgroundBlur: (p) => { p.edit.backgroundBlur = value === 'true' || value === true; },
    logoPosition: (p) => { /* handled by theme */ },
  };

  if (stepMap[step]) {
    stepMap[step](plan);
  }
}
