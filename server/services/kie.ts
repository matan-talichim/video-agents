import fs from 'fs';
import path from 'path';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_BASE_URL = 'https://api.kie.ai/v1';
const MAX_CONCURRENT = 2;
let activeGenerations = 0;
const queue: Array<() => void> = [];

// --- Rate limiter ---
async function waitForSlot(): Promise<void> {
  if (activeGenerations < MAX_CONCURRENT) {
    activeGenerations++;
    return;
  }
  return new Promise(resolve => {
    queue.push(() => {
      activeGenerations++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeGenerations--;
  if (queue.length > 0) {
    const next = queue.shift();
    next?.();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Core API call with retry ---
async function kieRequest(endpoint: string, body: any, retries: number = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now();
      console.log(`[KIE] API request: ${endpoint} — attempt ${attempt}/${retries}`);

      const response = await fetch(`${KIE_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`KIE.ai ${response.status}: ${error}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[KIE] API response in ${duration}ms`);
      return data;
    } catch (error: any) {
      console.error(`[KIE] Attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

// --- Poll until generation is done ---
async function pollUntilDone(taskId: string, timeoutMs: number = 300000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${KIE_BASE_URL}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
      });
      const data = await response.json();

      if (data.status === 'completed' || data.status === 'done') {
        return data.output_url || data.result_url || data.url;
      }
      if (data.status === 'failed' || data.status === 'error') {
        throw new Error(`KIE.ai generation failed: ${data.error || 'unknown error'}`);
      }

      await sleep(5000);
    } catch (error: any) {
      if (error.message?.includes('generation failed')) throw error;
      console.error('[KIE] Poll error:', error.message);
      await sleep(5000);
    }
  }

  throw new Error('KIE.ai generation timed out after 5 minutes');
}

// --- Download result to local file ---
async function downloadResult(url: string, outputPath: string): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}

// --- Public API functions ---

// Text-to-Video: generate B-Roll from prompt
export async function generateVideo(
  prompt: string,
  model: string,
  duration: number,
  outputPath: string,
  negativePrompt?: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Generating video: "${prompt.slice(0, 50)}..." model=${model} duration=${duration}s`);
    const startTime = Date.now();

    const payload: Record<string, unknown> = {
      prompt,
      model,
      duration,
      aspect_ratio: '16:9',
    };

    if (negativePrompt) {
      payload.negative_prompt = negativePrompt;
    }

    const { task_id } = await kieRequest('/generate/video', payload);

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);

    console.log(`[KIE] Video generated in ${((Date.now() - startTime) / 1000).toFixed(1)}s → ${outputPath}`);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Video-to-Video: restyle existing video
export async function videoToVideo(
  sourceVideoPath: string,
  stylePrompt: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Video-to-video: "${stylePrompt.slice(0, 50)}..."`);
    const videoBase64 = fs.readFileSync(sourceVideoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/video-to-video', {
      video: videoBase64,
      prompt: stylePrompt,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Generative Extend: add frames to short clip
export async function generativeExtend(
  videoPath: string,
  extraSeconds: number,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Generative extend: +${extraSeconds}s`);
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/extend', {
      video: videoBase64,
      duration: extraSeconds,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Animate Replace: swap character in video with image
export async function animateReplace(
  videoPath: string,
  characterImagePath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Animate replace');
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');
    const imageBase64 = fs.readFileSync(characterImagePath).toString('base64');

    const { task_id } = await kieRequest('/generate/animate-replace', {
      video: videoBase64,
      reference_image: imageBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Motion Transfer: animate image using motion from video
export async function motionTransfer(
  imagePath: string,
  motionVideoPath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Motion transfer');
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');
    const videoBase64 = fs.readFileSync(motionVideoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/animate-move', {
      image: imageBase64,
      motion_video: videoBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Face Swap: replace face in video
export async function faceSwap(
  videoPath: string,
  faceImagePath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Face swap');
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');
    const faceBase64 = fs.readFileSync(faceImagePath).toString('base64');

    const { task_id } = await kieRequest('/generate/face-swap', {
      video: videoBase64,
      face_image: faceBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Lipsync: sync lips to new audio
export async function lipsync(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Lipsync');
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');
    const audioBase64 = fs.readFileSync(audioPath).toString('base64');

    const { task_id } = await kieRequest('/generate/lipsync', {
      video: videoBase64,
      audio: audioBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Motion Control: paint motion on frame
export async function motionControl(
  imagePath: string,
  motionData: any,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Motion control');
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');

    const { task_id } = await kieRequest('/generate/motion-control', {
      image: imageBase64,
      motion_map: motionData,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Multi-Shot Sequences: multiple shots in one generation
export async function multiShotSequence(
  prompt: string,
  shotCount: number,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Multi-shot sequence: ${shotCount} shots`);
    const { task_id } = await kieRequest('/generate/multi-shot', {
      prompt,
      shots: shotCount,
      duration: 15,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// First-Last Frame: define start/end, AI fills motion
export async function firstLastFrame(
  startFramePath: string,
  endFramePath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] First-last frame interpolation');
    const startBase64 = fs.readFileSync(startFramePath).toString('base64');
    const endBase64 = fs.readFileSync(endFramePath).toString('base64');

    const { task_id } = await kieRequest('/generate/first-last-frame', {
      first_frame: startBase64,
      last_frame: endBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Text-to-VFX: "add fire", "add rain" on clip
export async function textToVFX(
  videoPath: string,
  vfxPrompt: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Text-to-VFX: "${vfxPrompt.slice(0, 50)}..."`);
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/video-to-video', {
      video: videoBase64,
      prompt: vfxPrompt,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// AI Object Add/Replace: "add boat", "replace tree with car"
export async function objectAddReplace(
  videoPath: string,
  prompt: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Object add/replace: "${prompt.slice(0, 50)}..."`);
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/edit', {
      video: videoBase64,
      prompt,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Talking Photo: still image speaks with lip-sync
export async function talkingPhoto(
  imagePath: string,
  audioPath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Talking photo');
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');
    const audioBase64 = fs.readFileSync(audioPath).toString('base64');

    const { task_id } = await kieRequest('/generate/talking-head', {
      image: imageBase64,
      audio: audioBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Eye Contact Correction
export async function eyeContactCorrection(
  videoPath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Eye contact correction');
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/eye-contact', {
      video: videoBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Upscale HD to 4K
export async function upscale(
  videoPath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Upscaling to 4K');
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/upscale', {
      video: videoBase64,
      target: '4k',
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Background Removal (for presenter separation)
export async function backgroundRemoval(
  videoPath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Background removal');
    const videoBase64 = fs.readFileSync(videoPath).toString('base64');

    const { task_id } = await kieRequest('/generate/background-remove', {
      video: videoBase64,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Generate Image (for thumbnails, backgrounds)
export async function generateImage(
  prompt: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Generating image: "${prompt.slice(0, 50)}..."`);
    const { task_id } = await kieRequest('/generate/image', {
      prompt,
      aspect_ratio: '16:9',
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Camera Controls in AI video
export async function generateWithCamera(
  prompt: string,
  cameraMovement: string,
  duration: number,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log(`[KIE] Generate with camera: ${cameraMovement}`);
    const { task_id } = await kieRequest('/generate/video', {
      prompt,
      duration,
      camera_movement: cameraMovement,
    });

    const resultUrl = await pollUntilDone(task_id);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}
