// server/services/brandedIntroOutro.ts
// Generates platform-aware branded intros and outros using FFmpeg.

import { runFFmpeg } from './ffmpeg.js';
import fs from 'fs';
import path from 'path';

export interface IntroOutroPlan {
  intro: { enabled: boolean; duration: number; style: string; elements: string[] };
  outro: { enabled: boolean; duration: number; style: string; elements: string[] };
}

export function planIntroOutro(brandKit: any, ctaPlan: any, platform: string): IntroOutroPlan {
  // TikTok/Reels: NO intro (wastes precious seconds), short outro
  if (platform === 'tiktok') {
    return {
      intro: { enabled: false, duration: 0, style: 'none', elements: [] },
      outro: { enabled: true, duration: 1.5, style: 'logo-flash', elements: ['logo'] },
    };
  }

  if (platform === 'instagram-reels') {
    return {
      intro: { enabled: false, duration: 0, style: 'none', elements: [] },
      outro: { enabled: true, duration: 2, style: 'cta-with-logo', elements: ['cta', 'logo'] },
    };
  }

  // YouTube/LinkedIn: Short intro + full outro
  return {
    intro: { enabled: true, duration: 2, style: 'logo-fade-in', elements: ['logo', 'tagline'] },
    outro: {
      enabled: true, duration: 3, style: 'cta-card',
      elements: ['logo', 'cta-text', 'phone', 'website', 'social-handles'],
    },
  };
}

// Generate intro with FFmpeg (simple but effective)
export async function generateIntro(
  brandKit: any,
  plan: IntroOutroPlan['intro'],
  outputPath: string,
  resolution: string
): Promise<string | null> {
  if (!plan.enabled || !brandKit?.logoFile) return null;

  console.log(`[IntroOutro] Generating ${plan.duration}s intro (${plan.style})`);

  const [w, h] = resolution.split(':').map(Number);
  const bgColor = brandKit.primaryColor || '#1a1a2e';

  // Create colored background with centered logo fade-in
  await runFFmpeg(
    `ffmpeg -f lavfi -i "color=c=${bgColor}:s=${w}x${h}:d=${plan.duration}" ` +
    `-i "${brandKit.logoFile}" ` +
    `-filter_complex "[1:v]scale=w=${Math.floor(w * 0.3)}:h=-1[logo];` +
    `[0:v][logo]overlay=(W-w)/2:(H-h)/2:format=auto,` +
    `fade=t=in:st=0:d=0.5,fade=t=out:st=${plan.duration - 0.3}:d=0.3[v]" ` +
    `-map "[v]" -t ${plan.duration} -c:v libx264 -y "${outputPath}"`
  );

  console.log(`[IntroOutro] Intro generated: ${outputPath}`);
  return outputPath;
}

// Generate outro with CTA card
export async function generateOutro(
  brandKit: any,
  plan: IntroOutroPlan['outro'],
  ctaText: string,
  contactInfo: any,
  outputPath: string,
  resolution: string
): Promise<string | null> {
  if (!plan.enabled) return null;

  console.log(`[IntroOutro] Generating ${plan.duration}s outro (${plan.style})`);

  const [w, h] = resolution.split(':').map(Number);
  const bgColor = brandKit.primaryColor || '#1a1a2e';
  const textColor = 'white';
  const cta = ctaText || 'צרו קשר';
  const phone = contactInfo?.phone || '';

  // Dark background with CTA text + optional phone + logo
  const filterComplex = `color=c=${bgColor}:s=${w}x${h}:d=${plan.duration}`;
  const drawFilters: string[] = [];

  // CTA text (large, center)
  drawFilters.push(
    `drawtext=text='${cta.replace(/'/g, "'\\''")}':fontsize=56:fontcolor=${textColor}:x=(w-text_w)/2:y=(h/2)-60`
  );

  // Phone number (below CTA)
  if (phone) {
    drawFilters.push(
      `drawtext=text='${phone}':fontsize=36:fontcolor=${textColor}@0.8:x=(w-text_w)/2:y=(h/2)+20`
    );
  }

  // Fade in
  drawFilters.push(`fade=t=in:st=0:d=0.3`);

  await runFFmpeg(
    `ffmpeg -f lavfi -i "${filterComplex}" -vf "${drawFilters.join(',')}" ` +
    `-t ${plan.duration} -c:v libx264 -y "${outputPath}"`
  );

  console.log(`[IntroOutro] Outro generated: ${outputPath}`);
  return outputPath;
}

// Prepend intro and append outro to main video
export async function attachIntroOutro(
  mainVideoPath: string,
  introPath: string | null,
  outroPath: string | null,
  outputPath: string
): Promise<string> {
  const parts: string[] = [];
  if (introPath) parts.push(introPath);
  parts.push(mainVideoPath);
  if (outroPath) parts.push(outroPath);

  if (parts.length === 1) return mainVideoPath;

  console.log(`[IntroOutro] Attaching ${parts.length} parts (intro: ${!!introPath}, outro: ${!!outroPath})`);

  const listPath = outputPath.replace('.mp4', '_list.txt');
  fs.writeFileSync(listPath, parts.map(p => `file '${path.resolve(p)}'`).join('\n'));

  await runFFmpeg(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${outputPath}"`);
  try { fs.unlinkSync(listPath); } catch {}

  console.log(`[IntroOutro] Final video with intro/outro: ${outputPath}`);
  return outputPath;
}
