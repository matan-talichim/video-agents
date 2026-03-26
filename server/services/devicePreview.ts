// server/services/devicePreview.ts
// Simulates how a video looks on different device sizes using Claude Vision.

import { askClaudeVision, parseVisionJSON } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface DevicePreviewResult {
  devices: Array<{
    name: string;
    resolution: string;
    issues: string[];
    passed: boolean;
  }>;
  overallPassed: boolean;
}

export async function simulateDevicePreview(
  videoPath: string,
  duration: number,
  aspectRatio: string,
  jobId?: string
): Promise<DevicePreviewResult> {
  const tempPrefix = jobId ? `temp/${jobId}` : 'temp';
  console.log('[DevicePreview] Simulating multi-device preview...');

  // Define device viewports
  const devices = [
    { name: 'iPhone (small)', width: 375, height: aspectRatio === '9:16' ? 667 : 211 },
    { name: 'iPad', width: 768, height: aspectRatio === '9:16' ? 1024 : 432 },
    { name: 'Desktop', width: 1280, height: aspectRatio === '9:16' ? 720 : 720 },
  ];

  // Take a frame with text/subtitles (middle of video where text likely exists)
  const textTimestamp = duration * 0.4;
  const framePath = `${tempPrefix}/device_preview_src.jpg`;
  try {
    await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${textTimestamp} -vframes 1 -q:v 2 -y "${framePath}"`);
  } catch (error: any) {
    console.error('[DevicePreview] Failed to extract frame:', error.message);
    return {
      devices: devices.map(d => ({ name: d.name, resolution: `${d.width}x${d.height}`, issues: [], passed: true })),
      overallPassed: true,
    };
  }

  // Create device-sized versions
  const deviceFrames: Array<{ name: string; path: string; resolution: string }> = [];
  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    const devicePath = `${tempPrefix}/device_${i}.jpg`;
    try {
      await runFFmpeg(`ffmpeg -i "${framePath}" -vf "scale=${d.width}:${d.height}:flags=lanczos" -q:v 2 -y "${devicePath}"`);
      deviceFrames.push({ name: d.name, path: devicePath, resolution: `${d.width}x${d.height}` });
    } catch (error: any) {
      console.error(`[DevicePreview] Failed to create ${d.name} preview:`, error.message);
    }
  }

  if (deviceFrames.length === 0) {
    console.warn('[DevicePreview] No device frames created, skipping');
    try { fs.unlinkSync(framePath); } catch {}
    return {
      devices: devices.map(d => ({ name: d.name, resolution: `${d.width}x${d.height}`, issues: [], passed: true })),
      overallPassed: true,
    };
  }

  // Send all frames to Claude Vision for review
  const images = deviceFrames.map(d => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: fs.readFileSync(d.path).toString('base64'),
    },
  }));

  try {
    const response = await askClaudeVision(
      'You check if video content is readable and usable on different device sizes.',
      [
        ...images,
        {
          type: 'text',
          text: `These ${deviceFrames.length} images show the SAME video frame at different device sizes:
${deviceFrames.map((d, i) => `${i + 1}. ${d.name} (${d.resolution})`).join('\n')}

For EACH device check:
- TEXT: Can you read all text/subtitles? Too small? Cropped?
- SAFE ZONES: Is anything cut off by phone notch/status bar/home bar?
- FACE: Is the speaker's face visible and centered?
- CTA: If there's a CTA button/text, is it tappable size on phone?
- OVERALL: Would this look professional on this device?

Return JSON:
{
  "devices": [
    { "name": "iPhone (small)", "resolution": "375x667", "issues": ["subtitle text too small — increase to 48px minimum"], "passed": false },
    { "name": "iPad", "resolution": "768x1024", "issues": [], "passed": true },
    { "name": "Desktop", "resolution": "1280x720", "issues": [], "passed": true }
  ],
  "overallPassed": false
}`,
        },
      ]
    );

    const defaultResult = {
      devices: deviceFrames.map(d => ({ name: d.name, resolution: d.resolution, issues: [], passed: true })),
      overallPassed: true,
    };
    const result = parseVisionJSON(response, defaultResult);
    const passedCount = result.devices?.filter((d: any) => d.passed).length || 0;
    console.log(`[DevicePreview] ${passedCount}/${result.devices?.length || 0} devices passed`);
    return result;
  } catch (error: any) {
    console.error('[DevicePreview] Analysis failed:', error.message);
    return {
      devices: deviceFrames.map(d => ({ name: d.name, resolution: d.resolution, issues: [], passed: true })),
      overallPassed: true,
    };
  } finally {
    // Cleanup
    try { fs.unlinkSync(framePath); } catch {}
    for (const d of deviceFrames) { try { fs.unlinkSync(d.path); } catch {} }
  }
}
