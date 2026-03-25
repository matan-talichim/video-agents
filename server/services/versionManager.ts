import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { JobVersion, Segment } from '../types.js';

const versions: Map<string, JobVersion[]> = new Map();

// Create a new version from a completed edit
export function createVersion(
  jobId: string,
  videoPath: string,
  prompt: string,
  type: 'original' | 'general' | 'timecode' | 'duration' | 'chat',
  timeline: Segment[],
  duration: number,
  timeRange?: { from: number; to: number },
  newDuration?: number
): JobVersion {
  const jobVersions = versions.get(jobId) || [];
  const versionNumber = jobVersions.length;

  // Copy video to version-specific path
  const versionDir = `output/${jobId}`;
  fs.mkdirSync(versionDir, { recursive: true });
  const versionVideoPath = `${versionDir}/v${versionNumber}.mp4`;

  if (fs.existsSync(videoPath)) {
    fs.copyFileSync(videoPath, versionVideoPath);
  }

  // Deactivate all previous versions
  for (const v of jobVersions) {
    v.isActive = false;
  }

  const version: JobVersion = {
    id: crypto.randomUUID(),
    jobId,
    versionNumber,
    prompt,
    type,
    timeRange,
    duration: newDuration,
    timeline,
    date: new Date().toISOString(),
    videoUrl: `/api/jobs/${jobId}/versions/${versionNumber}/video`,
    isActive: true,
    filePath: versionVideoPath,
    videoDuration: duration,
  };

  jobVersions.push(version);
  versions.set(jobId, jobVersions);

  // Save version metadata
  const metaPath = `${versionDir}/v${versionNumber}_meta.json`;
  fs.writeFileSync(metaPath, JSON.stringify(version, null, 2));

  console.log(`[Version] Created v${versionNumber} for job ${jobId} (${type})`);
  return version;
}

// Get all versions for a job
export function getVersions(jobId: string): JobVersion[] {
  return versions.get(jobId) || [];
}

// Get specific version
export function getVersion(jobId: string, versionNumber: number): JobVersion | null {
  const jobVersions = versions.get(jobId) || [];
  return jobVersions.find(v => v.versionNumber === versionNumber) || null;
}

// Revert to a specific version
export function revertToVersion(jobId: string, versionNumber: number): JobVersion | null {
  const jobVersions = versions.get(jobId) || [];

  // Deactivate all
  for (const v of jobVersions) {
    v.isActive = false;
  }

  // Activate target
  const target = jobVersions.find(v => v.versionNumber === versionNumber);
  if (target) {
    target.isActive = true;

    // Copy version video back to final.mp4
    const finalPath = `output/${jobId}/final.mp4`;
    if (target.filePath && fs.existsSync(target.filePath)) {
      fs.copyFileSync(target.filePath, finalPath);
    }

    console.log(`[Version] Reverted job ${jobId} to v${versionNumber}`);
  }

  return target || null;
}

// Get the active version's video path
export function getActiveVideoPath(jobId: string): string {
  const jobVersions = versions.get(jobId) || [];
  const active = jobVersions.find(v => v.isActive);

  if (active?.filePath && fs.existsSync(active.filePath)) {
    return active.filePath;
  }

  return `output/${jobId}/final.mp4`;
}

// Delete a specific version
export function deleteVersion(jobId: string, versionNumber: number): boolean {
  const jobVersions = versions.get(jobId) || [];
  const index = jobVersions.findIndex(v => v.versionNumber === versionNumber);

  if (index === -1) return false;

  const version = jobVersions[index];

  // Don't delete the active version
  if (version.isActive) return false;

  // Delete video file
  if (version.filePath && fs.existsSync(version.filePath)) {
    fs.unlinkSync(version.filePath);
  }

  // Remove from array
  jobVersions.splice(index, 1);
  versions.set(jobId, jobVersions);

  return true;
}
