import crypto from 'crypto';
import type { JobVersion, Segment } from '../types.js';

const versions = new Map<string, JobVersion[]>();

export function addVersion(params: {
  jobId: string;
  prompt: string;
  type: JobVersion['type'];
  timeRange?: { from: number; to: number };
  duration?: number;
  timeline: Segment[];
  videoUrl: string;
}): JobVersion {
  const jobVersions = versions.get(params.jobId) || [];

  // Deactivate previous versions
  for (const v of jobVersions) {
    v.isActive = false;
  }

  const version: JobVersion = {
    id: crypto.randomUUID(),
    jobId: params.jobId,
    versionNumber: jobVersions.length + 1,
    prompt: params.prompt,
    type: params.type,
    timeRange: params.timeRange,
    duration: params.duration,
    timeline: params.timeline,
    date: new Date().toISOString(),
    videoUrl: params.videoUrl,
    isActive: true,
  };

  jobVersions.push(version);
  versions.set(params.jobId, jobVersions);
  return version;
}

export function getVersions(jobId: string): JobVersion[] {
  return versions.get(jobId) || [];
}

export function getVersion(jobId: string, versionId: string): JobVersion | undefined {
  const jobVersions = versions.get(jobId) || [];
  return jobVersions.find((v) => v.id === versionId);
}
