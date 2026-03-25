import fs from 'fs';
import path from 'path';

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_BASE = 'https://api.suno.ai/v1';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate music track from prompt
export async function generateMusic(
  prompt: string,
  duration: number,
  instrumental: boolean,
  outputPath: string
): Promise<string> {
  console.log(`[Suno] Generating music: "${prompt.slice(0, 50)}..." duration=${duration}s instrumental=${instrumental}`);
  const startTime = Date.now();

  const response = await fetch(`${SUNO_BASE}/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      duration,
      instrumental,
    }),
  });

  if (!response.ok) {
    throw new Error(`Suno failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const taskId = data.task_id || data.id;

  // Poll for completion
  const resultUrl = await pollSunoTask(taskId);

  // Download
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const audioResponse = await fetch(resultUrl);
  const buffer = await audioResponse.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log(`[Suno] Music generated in ${((Date.now() - startTime) / 1000).toFixed(1)}s → ${outputPath}`);
  return outputPath;
}

// Extend existing track
export async function extendTrack(
  audioPath: string,
  extraSeconds: number,
  outputPath: string
): Promise<string> {
  console.log(`[Suno] Extending track by ${extraSeconds}s`);
  const audioBase64 = fs.readFileSync(audioPath).toString('base64');

  const response = await fetch(`${SUNO_BASE}/extend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: audioBase64,
      extend_seconds: extraSeconds,
    }),
  });

  if (!response.ok) {
    throw new Error(`Suno extend failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const taskId = data.task_id || data.id;
  const resultUrl = await pollSunoTask(taskId);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const audioResponse = await fetch(resultUrl);
  const buffer = await audioResponse.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  return outputPath;
}

async function pollSunoTask(taskId: string): Promise<string> {
  for (let i = 0; i < 60; i++) { // max 5 minutes
    await sleep(5000);

    const response = await fetch(`${SUNO_BASE}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${SUNO_API_KEY}` },
    });
    const data = await response.json();

    if (data.status === 'completed') return data.audio_url;
    if (data.status === 'failed') throw new Error(`Suno generation failed: ${data.error}`);
  }
  throw new Error('Suno timed out after 5 minutes');
}
