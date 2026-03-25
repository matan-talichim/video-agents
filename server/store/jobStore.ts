import crypto from 'crypto';
import type { Job, UserOptions, FileInfo, BRollModel, JobStatus } from '../types.js';

const jobs = new Map<string, Job>();

const defaultOptions: UserOptions = {
  aiBackground: false,
  backgroundBlur: false,
  cinematic: false,
  energyBoost: false,
  eyeContact: false,
  removeSilences: true,
  hebrewSubtitles: true,
  calmProfessional: false,
  energeticMusic: false,
  calmMusic: false,
  trendy: false,
  lowerThirds: false,
  aiSoundEffects: false,
  viralityScore: false,
  kineticTypography: false,
  musicSync: false,
  trendingSounds: false,
};

export function createJob(params: {
  prompt: string;
  model: BRollModel;
  options?: Partial<UserOptions>;
  files?: FileInfo[];
  projectName?: string;
}): Job {
  const id = crypto.randomUUID();
  const job: Job = {
    id,
    mode: (params.files && params.files.length > 0) ? 'raw' : 'prompt-only',
    status: 'pending',
    progress: 0,
    currentStep: 'ממתין להתחלה',
    prompt: params.prompt,
    model: params.model || 'kling-v2.5-turbo',
    options: { ...defaultOptions, ...params.options },
    files: params.files || [],
    plan: null,
    result: null,
    versions: [],
    createdAt: new Date().toISOString(),
    projectName: params.projectName || `פרויקט ${id.slice(0, 6)}`,
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  const updated = { ...job, ...updates };
  jobs.set(id, updated);
  return updated;
}

export function listJobs(): Job[] {
  return Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
