import { runFFmpeg } from '../services/ffmpeg.js';
import { askClaude } from '../services/claude.js';
import fs from 'fs';

// Generate WhatsApp-style chat conversation video
export async function generateWhatsAppTemplate(
  messages: Array<{ sender: string; text: string; isMe: boolean }>,
  outputPath: string,
  duration: number = 15
): Promise<string> {
  console.log(`[Social] Generating WhatsApp template: ${messages.length} messages`);
  const startTime = Date.now();

  // Create a chat-style video using FFmpeg text overlays
  // Each message appears with a slight delay
  const perMessageDuration = duration / messages.length;
  const filters: string[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgStartTime = i * perMessageDuration;
    const x = msg.isMe ? 'w-text_w-40' : '40';
    const bgColor = msg.isMe ? '#25D366@0.9' : '#333333@0.9';
    const y = 200 + (i * 80);

    filters.push(
      `drawtext=text='${msg.text}':fontsize=20:fontcolor=white:box=1:boxcolor=${bgColor}:boxborderw=10:x=${x}:y=${y}:enable='gte(t,${msgStartTime})'`
    );
  }

  // Dark background simulating phone screen
  await runFFmpeg(
    `ffmpeg -f lavfi -i "color=c=#0B141A:s=1080x1920:d=${duration}" -vf "${filters.join(',')}" -c:v libx264 -y "${outputPath}"`
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Social] WhatsApp template generated — ${elapsed}s`);

  return outputPath;
}

// Generate Instagram DM style
export async function generateInstagramDMTemplate(
  messages: Array<{ sender: string; text: string; isMe: boolean }>,
  outputPath: string,
  duration: number = 15
): Promise<string> {
  console.log(`[Social] Generating Instagram DM template: ${messages.length} messages`);
  const startTime = Date.now();

  const perMessageDuration = duration / messages.length;
  const filters: string[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgStartTime = i * perMessageDuration;
    const x = msg.isMe ? 'w-text_w-40' : '40';
    const bgColor = msg.isMe ? '#7c3aed@0.9' : '#262626@0.9';
    const y = 300 + (i * 70);

    filters.push(
      `drawtext=text='${msg.text}':fontsize=18:fontcolor=white:box=1:boxcolor=${bgColor}:boxborderw=8:x=${x}:y=${y}:enable='gte(t,${msgStartTime})'`
    );
  }

  await runFFmpeg(
    `ffmpeg -f lavfi -i "color=c=#000000:s=1080x1920:d=${duration}" -vf "${filters.join(',')}" -c:v libx264 -y "${outputPath}"`
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Social] Instagram DM template generated — ${elapsed}s`);

  return outputPath;
}

// Generate push notification stack
export async function generateNotificationTemplate(
  notifications: Array<{ app: string; title: string; body: string }>,
  backgroundVideoPath: string,
  outputPath: string
): Promise<string> {
  console.log(`[Social] Generating notification template: ${notifications.length} notifications`);
  const startTime = Date.now();

  const filters: string[] = [];

  for (let i = 0; i < Math.min(notifications.length, 5); i++) {
    const notif = notifications[i];
    const y = 100 + (i * 90);
    const notifStartTime = i * 1.5;

    // Notification card
    filters.push(
      `drawtext=text='${notif.app} · ${notif.title}':fontsize=16:fontcolor=white:box=1:boxcolor=#1c1c1e@0.95:boxborderw=20:x=40:y=${y}:enable='gte(t,${notifStartTime})'`
    );
    filters.push(
      `drawtext=text='${notif.body}':fontsize=14:fontcolor=#aaaaaa:x=60:y=${y + 35}:enable='gte(t,${notifStartTime})'`
    );
  }

  await runFFmpeg(
    `ffmpeg -i "${backgroundVideoPath}" -vf "${filters.join(',')}" -c:a copy -y "${outputPath}"`
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Social] Notification template generated — ${elapsed}s`);

  return outputPath;
}

// Auto-generate social template messages from prompt
export async function generateSocialContent(prompt: string, templateType: 'whatsapp' | 'instagram-dm' | 'notifications'): Promise<any[]> {
  console.log(`[Social] Generating ${templateType} content from prompt`);
  const startTime = Date.now();

  const response = await askClaude(
    'You create viral social media template content in Hebrew.',
    `Create content for a ${templateType} template video about: "${prompt}"

${templateType === 'whatsapp' ? 'Return JSON: [{ "sender": "name", "text": "message in Hebrew", "isMe": true/false }] — create 5-7 messages that tell a compelling story' : ''}
${templateType === 'instagram-dm' ? 'Return JSON: [{ "sender": "name", "text": "message in Hebrew", "isMe": true/false }] — create 5-7 DM messages' : ''}
${templateType === 'notifications' ? 'Return JSON: [{ "app": "app name", "title": "notification title", "body": "notification body in Hebrew" }] — create 4-5 notifications' : ''}

Make it engaging and viral. The conversation should have a twist or reveal.`
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Social] Content generated — ${elapsed}s`);

  try {
    return JSON.parse(response);
  } catch {
    return [];
  }
}
