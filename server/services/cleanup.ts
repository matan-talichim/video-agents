import fs from 'fs';
import path from 'path';

// Clean up temp files after job completes
export function cleanupJobTemp(jobId: string): void {
  const tempDir = `temp/${jobId}`;

  if (!fs.existsSync(tempDir)) return;

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`[Cleanup] Removed temp files for job ${jobId}`);
  } catch (error: any) {
    console.error(`[Cleanup] Failed to clean job ${jobId}:`, error.message);
  }
}

// Clean up old jobs (older than 24 hours)
export function cleanupOldJobs(): void {
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) return;

  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const dir of fs.readdirSync(outputDir)) {
    const dirPath = path.join(outputDir, dir);
    try {
      const stat = fs.statSync(dirPath);
      if (stat.isDirectory() && now - stat.mtimeMs > maxAge) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`[Cleanup] Removed old job: ${dir}`);
      }
    } catch {}
  }
}

// Schedule cleanup every hour
export function startCleanupSchedule(): void {
  setInterval(cleanupOldJobs, 60 * 60 * 1000);
  console.log('[Cleanup] Scheduled hourly cleanup of old jobs');
}
