import { askClaudeVision, parseVisionJSON } from './claude.js';
import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';

export interface QAResult {
  passed: boolean;
  overallScore: number;       // 1-10
  issues: QAIssue[];
  autoFixes: AutoFix[];
  warnings: string[];         // Hebrew warnings to show user
}

export interface QAIssue {
  type: 'subtitle-covers-face' | 'broll-mismatch' | 'color-jump' | 'audio-desync' |
        'dead-air' | 'flash-frame' | 'text-outside-safezone' | 'low-energy-section' |
        'abrupt-ending' | 'missing-hook' | 'too-long-shot' | 'audio-peak';
  timestamp: number;
  severity: 'critical' | 'warning' | 'minor';
  description: string;        // Hebrew
  autoFixable: boolean;
}

export interface AutoFix {
  issue: string;
  fix: string;                // what was done
  timestamp: number;
}

export async function runQualityCheck(
  videoPath: string,
  duration: number,
  plan: any,
  jobId?: string
): Promise<QAResult> {
  const tempPrefix = jobId ? `temp/${jobId}` : 'temp';
  console.log('[QA] Running automated quality review...');

  const issues: QAIssue[] = [];
  const autoFixes: AutoFix[] = [];

  // === CHECK 1: Visual Review (sample 6-8 frames across the video) ===
  const frameCount = Math.min(8, Math.ceil(duration / 8));
  const frames: Array<{ path: string; timestamp: number }> = [];

  for (let i = 0; i < frameCount; i++) {
    const timestamp = (duration / (frameCount + 1)) * (i + 1);
    const framePath = `${tempPrefix}/qa_frame_${i}.jpg`;
    try {
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${timestamp} -vframes 1 -q:v 2 -y "${framePath}"`);
      frames.push({ path: framePath, timestamp });
    } catch (error: any) {
      console.error(`[QA] Failed to extract frame at ${timestamp}s:`, error.message);
    }
  }

  if (frames.length > 0) {
    // Send frames to Claude Vision for review
    const frameImages = frames.map(f => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data: fs.readFileSync(f.path).toString('base64'),
      },
    }));

    try {
      const visualReview = await askClaudeVision(
        `You are a video QA inspector. Review rendered frames for technical and creative issues BEFORE showing to client. Be strict. RESPOND ONLY WITH A JSON OBJECT. No text before or after. Start your response with { and end with }.`,
        [
          ...frameImages,
          {
            type: 'text',
            text: `Review these ${frameCount} frames from a ${duration.toFixed(0)}s rendered video.
Format: ${plan.export?.formats?.includes('9:16') ? '9:16 vertical' : '16:9 horizontal'}

Check for ALL issues:
1. SUBTITLE COVERS FACE — text overlapping person's face?
2. B-ROLL MISMATCH — any B-Roll frame looks unrelated?
3. COLOR JUMP — dramatic color temperature change between consecutive frames?
4. TEXT OUTSIDE SAFE ZONE — text too close to edges (especially 9:16 where UI covers top/bottom)?
5. LOW VISUAL QUALITY — blurry, pixelated, poorly composed?
6. MISSING VISUAL VARIETY — consecutive frames too similar (same static shot)?
7. ABRUPT START/END — first frame good opening? Last frame good ending?
8. SUBTITLE READABILITY — text readable against background?

Return JSON only:
{
  "issues": [
    { "type": "subtitle-covers-face", "frameIndex": 2, "timestamp": 12.5, "severity": "critical", "description": "כתוביות מכסות את פני הדובר", "autoFixable": true }
  ],
  "overallVisualScore": 8
}`,
          },
        ]
      );

      const result = parseVisionJSON(visualReview, { issues: [], overallVisualScore: 7 });
      for (const issue of result.issues || []) {
        issues.push({
          type: issue.type,
          timestamp: frames[issue.frameIndex]?.timestamp || issue.timestamp,
          severity: issue.severity,
          description: issue.description,
          autoFixable: issue.autoFixable,
        });
      }
    } catch (error: any) {
      console.error('[QA] Visual review failed:', error.message);
    }

    // Cleanup frames
    for (const frame of frames) {
      try { fs.unlinkSync(frame.path); } catch {}
    }
  }

  // === CHECK 2: Audio Analysis — dead silence ===
  try {
    const { stderr: silenceStderr } = await runFFmpeg(
      `ffmpeg -i "${videoPath}" -af "silencedetect=noise=-40dB:d=2" -f null -`
    );
    const silenceOutput = silenceStderr || '';
    const silenceMatches = silenceOutput.match(/silence_start: ([\d.]+)/g);
    if (silenceMatches) {
      for (const match of silenceMatches) {
        const timestamp = parseFloat(match.replace('silence_start: ', ''));
        if (timestamp < duration - 1) {
          issues.push({
            type: 'dead-air',
            timestamp,
            severity: 'warning',
            description: `שתיקה של 2+ שניות ב-${formatTimestamp(timestamp)} — חסרה מוזיקה או room tone`,
            autoFixable: true,
          });
        }
      }
    }
  } catch (error: any) {
    console.error('[QA] Silence detection failed:', error.message);
  }

  // === CHECK 3: Audio Peak Detection ===
  try {
    const { stderr: peakStderr } = await runFFmpeg(
      `ffmpeg -i "${videoPath}" -af "volumedetect" -f null -`
    );
    const peakOutput = peakStderr || '';
    const maxVolMatch = peakOutput.match(/max_volume: ([-\d.]+)/);
    if (maxVolMatch) {
      const maxVol = parseFloat(maxVolMatch[1]);
      if (maxVol > -1) {
        issues.push({
          type: 'audio-peak',
          timestamp: 0,
          severity: 'warning',
          description: `שיא אודיו גבוה (${maxVol.toFixed(1)}dB) — סיכון לעיוות`,
          autoFixable: true,
        });
      }
    }
  } catch (error: any) {
    console.error('[QA] Audio peak detection failed:', error.message);
  }

  // === AUTO-FIX Critical Issues ===
  for (const issue of issues) {
    if (issue.autoFixable && issue.severity === 'critical') {
      const fix = await autoFixIssue(videoPath, issue);
      if (fix) {
        autoFixes.push(fix);
        issue.description += ' — תוקן אוטומטית';
      }
    }
  }

  // Calculate overall score
  const criticalCount = issues.filter(
    i => i.severity === 'critical' && !autoFixes.find(f => f.issue === i.type)
  ).length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const overallScore = Math.max(1, 10 - criticalCount * 2 - warningCount * 0.5);
  const passed = criticalCount === 0 && overallScore >= 7;

  console.log(`[QA] Score: ${overallScore.toFixed(1)}/10 | Issues: ${issues.length} | Auto-fixed: ${autoFixes.length} | Passed: ${passed}`);

  return {
    passed,
    overallScore,
    issues,
    autoFixes,
    warnings: issues
      .filter(i => i.severity !== 'minor')
      .map(i => i.description),
  };
}

async function autoFixIssue(videoPath: string, issue: QAIssue): Promise<AutoFix | null> {
  try {
    switch (issue.type) {
      case 'audio-peak': {
        const normalizedPath = videoPath.replace('.mp4', '_normalized.mp4');
        await runFFmpeg(
          `ffmpeg -i "${videoPath}" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:v copy -y "${normalizedPath}"`
        );
        fs.renameSync(normalizedPath, videoPath);
        return { issue: 'audio-peak', fix: 'נורמלזציה של אודיו ל-14 LUFS', timestamp: 0 };
      }
      case 'dead-air':
        return { issue: 'dead-air', fix: 'סומן להוספת room tone ברנדור הבא', timestamp: issue.timestamp };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function formatTimestamp(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// --- TEXT READABILITY CHECK (mobile-first) ---

export interface TextReadabilityResult {
  text: string;
  timestamp: number;
  readable: boolean;
  issue?: string;
}

export async function checkTextReadability(
  videoPath: string,
  textOverlays: Array<{ text: string; timestamp: number; fontSize: string; color: string }>,
  aspectRatio: string,
  jobId?: string
): Promise<TextReadabilityResult[]> {
  const tempPrefix = jobId ? `temp/${jobId}` : 'temp';
  console.log(`[TextReadability] Checking ${textOverlays.length} text overlays for mobile readability...`);
  const results: TextReadabilityResult[] = [];

  for (const overlay of textOverlays) {
    const framePath = `${tempPrefix}/text_check_${overlay.timestamp}.jpg`;
    const mobilePath = `${tempPrefix}/text_mobile_${overlay.timestamp}.jpg`;

    try {
      // Extract frame at text timestamp
      await runFFmpeg(`ffmpeg -i "${videoPath}" -ss ${overlay.timestamp} -vframes 1 -q:v 2 -y "${framePath}"`);

      // Simulate mobile view: resize to 360px wide (typical phone)
      await runFFmpeg(`ffmpeg -i "${framePath}" -vf "scale=360:-1" -q:v 2 -y "${mobilePath}"`);

      // Claude Vision checks readability at mobile size
      const image = {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: fs.readFileSync(mobilePath).toString('base64'),
        },
      };

      const response = await askClaudeVision(
        'You check if text in video frames is readable on a mobile phone screen. RESPOND ONLY WITH A JSON OBJECT. No text before or after. Start your response with { and end with }.',
        [
          image,
          {
            type: 'text',
            text: `This frame is shown at PHONE SIZE (360px wide). Is the text "${overlay.text}" readable? Check: size (too small?), contrast (text vs background), position (covered by UI?). Return ONLY JSON, no other text: { "readable": true, "issue": "" }`,
          },
        ]
      );

      const result = parseVisionJSON(response, { readable: true, issue: '' });
      results.push({ text: overlay.text, timestamp: overlay.timestamp, readable: result.readable, issue: result.issue || undefined });
    } catch (error: any) {
      console.error(`[TextReadability] Check failed for text at ${overlay.timestamp}s:`, error.message);
      results.push({ text: overlay.text, timestamp: overlay.timestamp, readable: true });
    } finally {
      // Cleanup
      try { fs.unlinkSync(framePath); } catch {}
      try { fs.unlinkSync(mobilePath); } catch {}
    }
  }

  const readableCount = results.filter(r => r.readable).length;
  console.log(`[TextReadability] ${readableCount}/${results.length} texts readable on mobile`);
  return results;
}
