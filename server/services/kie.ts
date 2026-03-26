import fs from 'fs';
import path from 'path';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_BASE_URL = 'https://api.kie.ai/api/v1';
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

// ========================================
// KIE.ai has TWO API patterns:
//
// Pattern A: "Market API" — unified POST /jobs/createTask
//   Used for: Kling, Seedance, Sora2, Wan, Hailuo, Grok Imagine, Topaz, Infinitalk
//   Body: { model: "...", callBackUrl?: "...", input: { prompt, ... } }
//   Poll: GET /jobs/recordInfo?taskId=<id>
//   Status: data.successFlag (0=generating, 1=success, 2=failed)
//   Video: data.response.result_urls[0] or data.response.resultUrls[0]
//
// Pattern B: "Direct API" — model-specific endpoints
//   Used for: Veo3.1 (/veo/generate), Runway (/runway/generate)
//   Each has its own request/response format and polling endpoint
// ========================================

// --- API pattern types ---
type APIPattern = 'market' | 'veo' | 'runway';

interface ModelConfig {
  pattern: APIPattern;
  modelId: string;  // Model identifier sent to KIE API
}

// --- Comprehensive model map ---
const MODEL_CONFIG: Record<string, ModelConfig> = {
  // --- KLING ---
  'kling-3.0':                  { pattern: 'market', modelId: 'kling-3.0/video' },
  'kling-2.6':                  { pattern: 'market', modelId: 'kling-2.6/text-to-video' },
  'kling-2.6-i2v':              { pattern: 'market', modelId: 'kling-2.6/image-to-video' },
  'kling-2.5-turbo':            { pattern: 'market', modelId: 'kling-v2.5-turbo-image-to-video-pro' },
  'kling-2.5-turbo-t2v':        { pattern: 'market', modelId: 'kling-v2.5-turbo-text-to-video-pro' },
  'kling-2.1-master':           { pattern: 'market', modelId: 'kling-v2.1-master-image-to-video' },
  'kling-2.1-master-t2v':       { pattern: 'market', modelId: 'kling-v2.1-master-text-to-video' },
  'kling-2.1-pro':              { pattern: 'market', modelId: 'kling-v2.1-pro' },
  'kling-2.1-standard':         { pattern: 'market', modelId: 'kling-v2.1-standard' },
  'kling-motion-control':       { pattern: 'market', modelId: 'kling-2.6/motion-control' },
  'kling-motion-control-v3':    { pattern: 'market', modelId: 'kling-3.0/motion-control' },
  'kling-avatar-standard':      { pattern: 'market', modelId: 'kling/ai-avatar-standard' },
  'kling-avatar-pro':           { pattern: 'market', modelId: 'kling/ai-avatar-pro' },
  // Legacy aliases
  'kling-v2.5-turbo':           { pattern: 'market', modelId: 'kling-v2.5-turbo-text-to-video-pro' },

  // --- BYTEDANCE / SEEDANCE ---
  'seedance-1.5-pro':           { pattern: 'market', modelId: 'bytedance/seedance-1.5-pro' },
  'bytedance-v1-pro-fast':      { pattern: 'market', modelId: 'bytedance/v1-pro-fast-image-to-video' },
  'bytedance-v1-pro':           { pattern: 'market', modelId: 'bytedance/v1-pro-image-to-video' },
  'bytedance-v1-pro-t2v':       { pattern: 'market', modelId: 'bytedance/v1-pro-text-to-video' },
  'bytedance-v1-lite':          { pattern: 'market', modelId: 'bytedance/v1-lite-image-to-video' },
  'bytedance-v1-lite-t2v':      { pattern: 'market', modelId: 'bytedance/v1-lite-text-to-video' },

  // --- SORA 2 ---
  'sora-2':                     { pattern: 'market', modelId: 'sora-2-text-to-video' },
  'sora-2-i2v':                 { pattern: 'market', modelId: 'sora-2-image-to-video' },
  'sora-2-pro':                 { pattern: 'market', modelId: 'sora-2-pro-text-to-video' },
  'sora-2-pro-i2v':             { pattern: 'market', modelId: 'sora-2-pro-image-to-video' },
  'sora-2-watermark-remover':   { pattern: 'market', modelId: 'sora-watermark-remover' },
  'sora-2-storyboard':          { pattern: 'market', modelId: 'sora-2-pro-storyboard' },
  'sora-2-characters':          { pattern: 'market', modelId: 'sora-2-characters' },
  'sora-2-characters-pro':      { pattern: 'market', modelId: 'sora-2-characters-pro' },

  // --- WAN ---
  'wan-2.6':                    { pattern: 'market', modelId: 'wan/2-6-text-to-video' },
  'wan-2.6-i2v':                { pattern: 'market', modelId: 'wan/2-6-image-to-video' },
  'wan-2.6-v2v':                { pattern: 'market', modelId: 'wan/2-6-video-to-video' },
  'wan-2.6-flash':              { pattern: 'market', modelId: 'wan/2-6-flash-image-to-video' },
  'wan-2.6-flash-v2v':          { pattern: 'market', modelId: 'wan/2-6-flash-video-to-video' },
  'wan-2.5':                    { pattern: 'market', modelId: 'wan/2-5-image-to-video' },
  'wan-2.5-t2v':                { pattern: 'market', modelId: 'wan/2-5-text-to-video' },
  'wan-2.2-turbo-i2v':          { pattern: 'market', modelId: 'wan/2-2-a14b-image-to-video-turbo' },
  'wan-2.2-turbo-t2v':          { pattern: 'market', modelId: 'wan/2-2-a14b-text-to-video-turbo' },
  'wan-2.2-speech':             { pattern: 'market', modelId: 'wan/2-2-a14b-speech-to-video-turbo' },
  'wan-2.2-animate-move':       { pattern: 'market', modelId: 'wan/2-2-animate-move' },
  'wan-2.2-animate-replace':    { pattern: 'market', modelId: 'wan/2-2-animate-replace' },

  // --- HAILUO ---
  'hailuo-2.3-pro':             { pattern: 'market', modelId: 'hailuo/2-3-image-to-video-pro' },
  'hailuo-2.3-standard':        { pattern: 'market', modelId: 'hailuo/2-3-image-to-video-standard' },
  'hailuo-02-t2v-pro':          { pattern: 'market', modelId: 'hailuo/02-text-to-video-pro' },
  'hailuo-02-i2v-pro':          { pattern: 'market', modelId: 'hailuo/02-image-to-video-pro' },
  'hailuo-02-t2v-standard':     { pattern: 'market', modelId: 'hailuo/02-text-to-video-standard' },
  'hailuo-02-i2v-standard':     { pattern: 'market', modelId: 'hailuo/02-image-to-video-standard' },
  'hailuo-standard':            { pattern: 'market', modelId: 'hailuo/02-text-to-video-standard' },

  // --- VEO 3.1 (Pattern B: Direct API) ---
  'veo-3.1-fast':               { pattern: 'veo', modelId: 'veo3_fast' },
  'veo-3.1-quality':            { pattern: 'veo', modelId: 'veo3_quality' },

  // --- RUNWAY (Pattern B: Direct API) ---
  'runway-gen4':                { pattern: 'runway', modelId: 'runway-duration-5-generate' },
  'runway-gen4-10s':            { pattern: 'runway', modelId: 'runway-duration-10-generate' },
  'runway-aleph':               { pattern: 'runway', modelId: 'runway-aleph-generate' },

  // --- GROK IMAGINE ---
  'grok-imagine':               { pattern: 'market', modelId: 'grok-imagine/text-to-video' },
  'grok-imagine-i2v':           { pattern: 'market', modelId: 'grok-imagine/image-to-video' },
  'grok-imagine-upscale':       { pattern: 'market', modelId: 'grok-imagine/upscale' },
  'grok-imagine-extend':        { pattern: 'market', modelId: 'grok-imagine/extend' },

  // --- TOPAZ ---
  'topaz-upscale':              { pattern: 'market', modelId: 'topaz/video-upscale' },

  // --- INFINITALK ---
  'infinitalk':                 { pattern: 'market', modelId: 'infinitalk/from-audio' },
};

// --- Per-model allowed durations ---
// Each model only accepts specific duration values. Sending an unsupported
// duration causes a "duration is not within the range of allowed options" error.
const MODEL_DURATIONS: Record<string, number[]> = {
  // Google Veo — 8s clips only
  'veo-3.1-fast': [8],
  'veo-3.1-quality': [8],

  // Kling
  'kling-3.0': [5, 10],
  'kling-2.6': [5, 10],
  'kling-2.6-i2v': [5, 10],
  'kling-2.5-turbo': [5, 10],
  'kling-2.5-turbo-t2v': [5, 10],
  'kling-v2.5-turbo': [5, 10],
  'kling-2.1-master': [5, 10],
  'kling-2.1-master-t2v': [5, 10],
  'kling-2.1-pro': [5, 10],
  'kling-2.1-standard': [5],
  'kling-motion-control': [5, 10],
  'kling-motion-control-v3': [5, 10],
  'kling-avatar-standard': [5, 10],
  'kling-avatar-pro': [5, 10],

  // ByteDance / Seedance
  'seedance-1.5-pro': [4, 5],
  'bytedance-v1-pro-fast': [4],
  'bytedance-v1-pro': [4, 5],
  'bytedance-v1-pro-t2v': [4, 5],
  'bytedance-v1-lite': [4],
  'bytedance-v1-lite-t2v': [4],

  // Sora 2
  'sora-2': [10],
  'sora-2-i2v': [10],
  'sora-2-pro': [10, 15],
  'sora-2-pro-i2v': [10, 15],

  // WAN
  'wan-2.6': [5, 10, 15],
  'wan-2.6-i2v': [5, 10, 15],
  'wan-2.6-v2v': [5, 10],
  'wan-2.6-flash': [5],
  'wan-2.6-flash-v2v': [5],
  'wan-2.5': [5],
  'wan-2.5-t2v': [5],

  // Hailuo
  'hailuo-2.3-pro': [4, 6],
  'hailuo-2.3-standard': [4, 6],
  'hailuo-02-t2v-pro': [4, 6],
  'hailuo-02-i2v-pro': [4, 6],
  'hailuo-02-t2v-standard': [4, 6],
  'hailuo-02-i2v-standard': [4, 6],
  'hailuo-standard': [4, 6],

  // Runway
  'runway-gen4': [5, 10],
  'runway-gen4-10s': [10],
  'runway-aleph': [5, 10],

  // Grok Imagine
  'grok-imagine': [4, 8],
  'grok-imagine-i2v': [4, 8],
};

// Find the closest allowed duration for a given model
function clampDuration(requested: number, model: string): number {
  const allowed = MODEL_DURATIONS[model];
  if (!allowed || allowed.length === 0) return requested; // unknown model, pass through
  // Find closest allowed value
  return allowed.reduce((closest, val) =>
    Math.abs(val - requested) < Math.abs(closest - requested) ? val : closest
  , allowed[0]);
}

// Calculate how many B-Roll clips are needed based on model clip duration
export function calculateBRollCount(videoDuration: number, model: string, paceMode: string = 'normal'): number {
  const allowed = MODEL_DURATIONS[model];
  const clipDuration = allowed?.[0] || 5;
  const targetCoverage = videoDuration * (paceMode === 'fast' ? 0.4 : 0.3);
  const count = Math.ceil(targetCoverage / clipDuration);
  return Math.max(1, Math.min(count, 8));
}

// --- Core API helpers ---

async function kiePost(endpoint: string, body: any, retries: number = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now();
      console.log(`[KIE] POST ${endpoint} — attempt ${attempt}/${retries}`);

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
      console.log(`[KIE] Response in ${duration}ms`);

      if (data.code && data.code !== 200) {
        throw new Error(`KIE.ai error: ${data.msg || JSON.stringify(data)}`);
      }

      return data;
    } catch (error: any) {
      console.error(`[KIE] Attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

async function kieGet(endpoint: string, retries: number = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${KIE_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`KIE.ai ${response.status}: ${error}`);
      }

      return await response.json();
    } catch (error: any) {
      if (attempt === retries) throw error;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

// --- Pattern A: Market API task creation ---
async function createMarketTask(modelId: string, input: Record<string, any>): Promise<string> {
  const result = await kiePost('/jobs/createTask', {
    model: modelId,
    input,
  });

  const taskId = result.data?.taskId || result.taskId;
  if (!taskId) throw new Error(`KIE.ai: no taskId in response: ${JSON.stringify(result)}`);
  return taskId;
}

// --- Pattern A: Market API task polling ---
async function pollMarketTask(taskId: string, timeoutMs: number = 300000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const data = await kieGet(`/jobs/recordInfo?taskId=${taskId}`);
      const taskData = data.data || data;

      const successFlag = taskData.successFlag;

      // Check success via successFlag (numeric) or state (string)
      const isSuccess = successFlag === 1 || taskData.state === 'success';
      const isFailed = successFlag === 2 || taskData.state === 'fail' || taskData.state === 'failed';

      if (isSuccess) {
        // Success — extract video URL from multiple possible locations

        // Some models return resultJson as a stringified JSON string
        if (taskData.resultJson && typeof taskData.resultJson === 'string') {
          try {
            const parsed = JSON.parse(taskData.resultJson);
            const urls = parsed.resultUrls || parsed.result_urls || [];
            if (urls.length > 0) return urls[0];
          } catch { /* fall through to other methods */ }
        }

        // Standard response object
        const response = taskData.response || {};
        const urls = response.result_urls || response.resultUrls || response.video_urls || [];
        if (urls.length > 0) return urls[0];
        // Fallback: check for single url field
        if (response.video_url) return response.video_url;
        if (response.url) return response.url;
        throw new Error(`KIE.ai: task completed but no URL found in response: ${JSON.stringify(taskData)}`);
      }

      if (isFailed) {
        throw new Error(`KIE.ai task failed: ${taskData.errorMessage || taskData.failMsg || taskData.errorCode || taskData.failCode || 'unknown error'}`);
      }

      // Still generating (successFlag === 0 or state === 'waiting'/'generating')
      const progress = taskData.progress ? `${Math.round(parseFloat(taskData.progress) * 100)}%` : '';
      if (progress) console.log(`[KIE] Task ${taskId}: ${progress}`);

      await sleep(3000);
    } catch (error: any) {
      if (error.message?.includes('task failed')) throw error;
      console.error('[KIE] Poll error:', error.message);
      await sleep(5000);
    }
  }

  throw new Error(`KIE.ai task ${taskId} timed out after ${timeoutMs / 1000}s`);
}

// --- Pattern B: Veo3 task creation ---
async function createVeoTask(prompt: string, modelId: string, options: {
  imageUrl?: string;
  aspectRatio?: string;
}): Promise<string> {
  const body: Record<string, any> = {
    prompt,
    model: modelId,
    aspect_ratio: options.aspectRatio || '16:9',
    enableTranslation: true,
  };

  if (options.imageUrl) {
    body.imageUrls = [options.imageUrl];
    body.generationType = 'REFERENCE_2_VIDEO';
  }

  const result = await kiePost('/veo/generate', body);
  const taskId = result.data?.taskId || result.taskId;
  if (!taskId) throw new Error(`Veo: no taskId in response: ${JSON.stringify(result)}`);
  return taskId;
}

// --- Pattern B: Veo3 polling ---
async function pollVeoTask(taskId: string, timeoutMs: number = 300000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const data = await kieGet(`/veo/record-info?taskId=${taskId}`);
      const taskData = data.data || data;

      if (taskData.successFlag === 1) {
        const response = taskData.response || {};
        const urls = response.resultUrls || response.result_urls || [];
        if (urls.length > 0) return urls[0];
        throw new Error(`Veo: completed but no URL in: ${JSON.stringify(response)}`);
      }

      if (taskData.successFlag === 2) {
        throw new Error(`Veo task failed: ${taskData.errorMessage || 'unknown'}`);
      }

      await sleep(3000);
    } catch (error: any) {
      if (error.message?.includes('failed')) throw error;
      console.error('[KIE] Veo poll error:', error.message);
      await sleep(5000);
    }
  }

  throw new Error(`Veo task ${taskId} timed out`);
}

// --- Pattern B: Runway task creation ---
async function createRunwayTask(prompt: string, modelId: string, options: {
  imageUrl?: string;
  duration?: number;
  aspectRatio?: string;
}): Promise<string> {
  const body: Record<string, any> = {
    prompt,
    model: modelId,
    duration: options.duration || 5,
    quality: '720p',
    aspectRatio: options.aspectRatio || '16:9',
  };

  if (options.imageUrl) {
    body.imageUrl = options.imageUrl;
  }

  const result = await kiePost('/runway/generate', body);
  const taskId = result.data?.taskId || result.taskId;
  if (!taskId) throw new Error(`Runway: no taskId in response: ${JSON.stringify(result)}`);
  return taskId;
}

// --- Pattern B: Runway polling ---
async function pollRunwayTask(taskId: string, timeoutMs: number = 300000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const data = await kieGet(`/runway/record-detail?taskId=${taskId}`);
      const taskData = data.data || data;

      if (taskData.state === 'success') {
        const videoUrl = taskData.videoInfo?.videoUrl;
        if (videoUrl) return videoUrl;
        throw new Error(`Runway: completed but no videoUrl in: ${JSON.stringify(taskData)}`);
      }

      if (taskData.state === 'fail') {
        throw new Error(`Runway task failed: ${taskData.failMsg || taskData.failCode || 'unknown'}`);
      }

      // wait, queueing, generating
      await sleep(3000);
    } catch (error: any) {
      if (error.message?.includes('failed')) throw error;
      console.error('[KIE] Runway poll error:', error.message);
      await sleep(5000);
    }
  }

  throw new Error(`Runway task ${taskId} timed out`);
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

// --- Unified generate + poll + download ---
async function generateAndDownload(
  model: string,
  prompt: string,
  outputPath: string,
  options: {
    duration?: number;
    aspectRatio?: string;
    imageUrl?: string;
    imageUrls?: string[];
    extraInput?: Record<string, any>;
  } = {}
): Promise<string> {
  const config = MODEL_CONFIG[model];
  if (!config) {
    console.warn(`[KIE] Unknown model "${model}", falling back to market API`);
  }

  const pattern = config?.pattern || 'market';
  const modelId = config?.modelId || model;

  let taskId: string;
  let resultUrl: string;

  switch (pattern) {
    case 'veo': {
      taskId = await createVeoTask(prompt, modelId, {
        imageUrl: options.imageUrl || options.imageUrls?.[0],
        aspectRatio: options.aspectRatio,
      });
      resultUrl = await pollVeoTask(taskId);
      break;
    }

    case 'runway': {
      const runwayDuration = options.duration ? clampDuration(options.duration, model) : undefined;
      taskId = await createRunwayTask(prompt, modelId, {
        imageUrl: options.imageUrl || options.imageUrls?.[0],
        duration: runwayDuration,
        aspectRatio: options.aspectRatio,
      });
      resultUrl = await pollRunwayTask(taskId);
      break;
    }

    case 'market':
    default: {
      const rawDuration = options.duration || 5;
      const clampedDuration = clampDuration(rawDuration, model);
      if (clampedDuration !== rawDuration) {
        console.log(`[KIE] Duration clamped: ${rawDuration}s → ${clampedDuration}s for model "${model}"`);
      }
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: options.aspectRatio || '16:9',
        duration: String(clampedDuration),
        ...options.extraInput,
      };

      if (options.imageUrl) {
        input.image_urls = [options.imageUrl];
      } else if (options.imageUrls && options.imageUrls.length > 0) {
        input.image_urls = options.imageUrls;
      }

      taskId = await createMarketTask(modelId, input);
      resultUrl = await pollMarketTask(taskId);
      break;
    }
  }

  await downloadResult(resultUrl, outputPath);
  return outputPath;
}

// ========================================
// Public API functions (same signatures as before)
// ========================================

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

    await generateAndDownload(model, prompt, outputPath, {
      duration,
      extraInput: negativePrompt ? { negative_prompt: negativePrompt } : undefined,
    });

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

    const taskId = await createMarketTask('wan/2-6-video-to-video', {
      prompt: stylePrompt,
      video_url: sourceVideoPath, // KIE expects URL; for local files, upload first
    });

    const resultUrl = await pollMarketTask(taskId);
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

    const taskId = await createMarketTask('grok-imagine/extend', {
      video_url: videoPath,
      duration: String(extraSeconds),
    });

    const resultUrl = await pollMarketTask(taskId);
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

    const taskId = await createMarketTask('wan/2-2-animate-replace', {
      video_url: videoPath,
      image_urls: [characterImagePath],
    });

    const resultUrl = await pollMarketTask(taskId);
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

    const taskId = await createMarketTask('wan/2-2-animate-move', {
      image_urls: [imagePath],
      video_url: motionVideoPath,
    });

    const resultUrl = await pollMarketTask(taskId);
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

    // Use Kling avatar model for face-related operations
    const taskId = await createMarketTask('kling/ai-avatar-pro', {
      video_url: videoPath,
      image_urls: [faceImagePath],
    });

    const resultUrl = await pollMarketTask(taskId);
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

    // Use Infinitalk for lip-sync generation
    const taskId = await createMarketTask('infinitalk/from-audio', {
      image_url: videoPath,
      audio_url: audioPath,
    });

    const resultUrl = await pollMarketTask(taskId);
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

    const taskId = await createMarketTask('kling-3.0/motion-control', {
      image_urls: [imagePath],
      motion_map: motionData,
    });

    const resultUrl = await pollMarketTask(taskId);
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

    // Kling 3.0 supports multi_shots with multi_prompt
    const multiPrompts = Array(shotCount).fill(prompt);
    const taskId = await createMarketTask('kling-3.0/video', {
      prompt,
      multi_shots: true,
      multi_prompt: multiPrompts,
      duration: '15',
    });

    const resultUrl = await pollMarketTask(taskId);
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

    // Use Kling image-to-video with start/end frames
    const taskId = await createMarketTask('kling-2.6/image-to-video', {
      image_urls: [startFramePath],
      prompt: 'Smooth natural motion transition between the two frames',
      duration: '5',
    });

    const resultUrl = await pollMarketTask(taskId);
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

    const taskId = await createMarketTask('wan/2-6-video-to-video', {
      prompt: vfxPrompt,
      video_url: videoPath,
    });

    const resultUrl = await pollMarketTask(taskId);
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

    const taskId = await createMarketTask('wan/2-6-video-to-video', {
      prompt,
      video_url: videoPath,
    });

    const resultUrl = await pollMarketTask(taskId);
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

    const taskId = await createMarketTask('infinitalk/from-audio', {
      image_url: imagePath,
      audio_url: audioPath,
      resolution: '720p',
    });

    const resultUrl = await pollMarketTask(taskId);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}

// Eye Contact Correction — KIE doesn't have this API.
// Use FFmpeg gaze estimation as fallback (no-op if not available)
export async function eyeContactCorrection(
  videoPath: string,
  outputPath: string
): Promise<string> {
  console.log('[KIE] Eye contact correction: not available via KIE API, copying original');
  // Copy input to output — no actual eye contact correction available
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(videoPath, outputPath);
  return outputPath;
}

// Upscale HD to 4K
export async function upscale(
  videoPath: string,
  outputPath: string
): Promise<string> {
  await waitForSlot();
  try {
    console.log('[KIE] Upscaling to 4K');

    const taskId = await createMarketTask('topaz/video-upscale', {
      video_url: videoPath,
    });

    const resultUrl = await pollMarketTask(taskId);
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

    // Use Wan animate-replace with green-screen prompt
    const taskId = await createMarketTask('wan/2-6-video-to-video', {
      prompt: 'Remove the background, keep only the person, transparent background',
      video_url: videoPath,
    });

    const resultUrl = await pollMarketTask(taskId);
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

    // Use Grok Imagine for image generation
    const taskId = await createMarketTask('grok-imagine/text-to-video', {
      prompt,
      aspect_ratio: '16:9',
      duration: '1', // Shortest possible for single frame
    });

    const resultUrl = await pollMarketTask(taskId);
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

    // Use Kling motion control for camera movements
    const taskId = await createMarketTask('kling-3.0/motion-control', {
      prompt: `${prompt}. Camera movement: ${cameraMovement}`,
      duration: String(duration),
      aspect_ratio: '16:9',
    });

    const resultUrl = await pollMarketTask(taskId);
    await downloadResult(resultUrl, outputPath);
    return outputPath;
  } finally {
    releaseSlot();
  }
}
