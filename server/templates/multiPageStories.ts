import { runFFmpeg } from '../services/ffmpeg.js';
import * as kie from '../services/kie.js';
import { askClaude } from '../services/claude.js';
import fs from 'fs';

// Generate multi-page story (3-5 pages with transitions)
export async function generateMultiPageStory(
  prompt: string,
  pageCount: number,
  model: string,
  musicPath: string | null,
  outputPath: string
): Promise<string> {
  console.log(`[Stories] Generating ${pageCount}-page story`);
  const startTime = Date.now();

  // Step 1: Plan each page
  const pagePlan = await askClaude(
    'You plan Instagram/TikTok multi-page stories in Hebrew.',
    `Create a ${pageCount}-page story plan for: "${prompt}"

Each page should tell part of the story and build to a conclusion.
Return JSON: [{
  "page": 1,
  "visual_prompt": "Detailed cinematic prompt for AI video generation",
  "text_overlay": "Hebrew text to show on this page",
  "duration_seconds": 5,
  "transition": "fade" | "slide-left" | "zoom" | "cut"
}]

Page 1 = hook/attention grabber
Last page = CTA or conclusion
Each page: 4-6 seconds`
  );

  let pages;
  try {
    pages = JSON.parse(pagePlan);
  } catch {
    pages = Array.from({ length: pageCount }, (_, i) => ({
      page: i + 1,
      visual_prompt: `Story page ${i + 1} about: ${prompt}`,
      text_overlay: '',
      duration_seconds: 5,
      transition: 'fade',
    }));
  }

  // Step 2: Generate video for each page
  const pageClips: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pagePath = outputPath.replace('.mp4', `_page_${i}.mp4`);

    try {
      await kie.generateVideo(page.visual_prompt, model as any, page.duration_seconds, pagePath);
    } catch {
      // Fallback: colored background
      const colors = ['#7c3aed', '#3B82F6', '#059669', '#D97706', '#DC2626'];
      await runFFmpeg(
        `ffmpeg -f lavfi -i "color=c=${colors[i % colors.length]}:s=1080x1920:d=${page.duration_seconds}" -c:v libx264 -y "${pagePath}"`
      );
    }

    // Add text overlay if present
    if (page.text_overlay) {
      const withTextPath = pagePath.replace('.mp4', '_text.mp4');
      await runFFmpeg(
        `ffmpeg -i "${pagePath}" -vf "drawtext=text='${page.text_overlay}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=15" -c:a copy -y "${withTextPath}"`
      );
      pageClips.push(withTextPath);
    } else {
      pageClips.push(pagePath);
    }
  }

  // Step 3: Concat with transitions
  // Simple approach: concat all pages
  const listPath = outputPath.replace('.mp4', '_list.txt');
  fs.writeFileSync(listPath, pageClips.map(p => `file '${p}'`).join('\n'));

  const concatPath = outputPath.replace('.mp4', '_concat.mp4');
  await runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c:v libx264 -c:a aac -y "${concatPath}"`);

  // Step 4: Add music if available
  if (musicPath && fs.existsSync(musicPath)) {
    await runFFmpeg(
      `ffmpeg -i "${concatPath}" -i "${musicPath}" -filter_complex "[1:a]volume=0.2[music];[0:a][music]amix=inputs=2:duration=first" -map 0:v -c:v copy -y "${outputPath}"`
    );
  } else {
    fs.copyFileSync(concatPath, outputPath);
  }

  // Cleanup
  for (const clip of pageClips) {
    try { fs.unlinkSync(clip); } catch {}
  }
  try { fs.unlinkSync(listPath); } catch {}
  try { fs.unlinkSync(concatPath); } catch {}

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Stories] Multi-page story generated — ${elapsed}s`);

  return outputPath;
}
