console.log('STEP 1: imports starting');
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// Lightweight imports — no heavy transitive deps
import modelsRouter from './routes/models.js';
import effectsRouter from './routes/effects.js';
import brandKitRouter from './routes/brandKit.js';
import chatEditorRouter from './routes/chatEditor.js';
import visualDNARouter from './routes/visualDNA.js';
import { startCleanupSchedule } from './services/cleanup.js';
import { checkEnvironment } from './checkEnv.js';

console.log('STEP 2: imports done');

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('STEP 3: before express');
const app = express();
const PORT = 3001;

// Prevent duplicate startup from tsx watch hot-reload
let serverStarted = false;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from output directory
app.use('/output', express.static(path.join(rootDir, 'output')));

// Create required directories on startup
const dirs = ['uploads', 'uploads/logos', 'output', 'temp', 'data/brand-kits'];
for (const dir of dirs) {
  const dirPath = path.join(rootDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Lightweight routes (no heavy deps)
app.use('/api/models', modelsRouter);
app.use('/api', effectsRouter);
app.use('/api/brand-kit', brandKitRouter);
app.use('/api/jobs', chatEditorRouter);
app.use('/api/visual-dna', visualDNARouter);

// Load heavy routes via top-level await BEFORE server starts listening.
// Dynamic import() inside app.listen() callback deadlocks in Node ESM,
// so we must resolve these imports at the module top level.
console.log('[Server] Loading heavy modules (orchestrator, brain, agents)...');
const [jobsMod, previewMod, masterBrainMod, masterPromptMod, editorBrainMod] = await Promise.all([
  import('./routes/jobs.js'),
  import('./routes/preview.js'),
  import('./services/masterBrain.js'),
  import('./services/masterPromptOptimizer.js'),
  import('./services/editorBrain.js'),
]);
console.log('[Server] Heavy modules loaded');

const jobsRouter = jobsMod.default;
const previewRouter = previewMod.default;
const { countBrainRules } = masterBrainMod;
const { getMasterPromptContext } = masterPromptMod;
const { loadMemory } = editorBrainMod;

app.use('/api/jobs', jobsRouter);
app.use('/api/jobs', previewRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: 95,
  });
});

// System test endpoint
app.get('/api/system-test', async (_req, res) => {
  try {
    const { runSystemTest } = await import('./tests/systemTest.js');
    const results = await runSystemTest();
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Full diagnostic endpoint — tests Brain, Claude API, FFmpeg, and all services
app.get('/api/diagnostic', async (_req, res) => {
  try {
    const { runFullDiagnostic } = await import('./tests/fullDiagnostic.js');
    const result = await runFullDiagnostic();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Brain status endpoint
app.get('/api/brain-status', (_req, res) => {
  const brainRules = countBrainRules();
  const masterContext = getMasterPromptContext();
  let memories: any[] = [];
  try {
    memories = loadMemory();
  } catch {
    // No memory file yet — that's fine
  }

  res.json({
    ruleCategories: brainRules.categories,
    totalRules: brainRules.totalPrompts,
    totalKnowledgeChars: brainRules.totalCharacters,
    estimatedTokens: Math.round(brainRules.totalCharacters / 4),
    hasLearningData: !!masterContext,
    projectMemories: memories.length,
    missingRules: brainRules.missing,
    status: brainRules.totalPrompts >= 10 ? 'healthy' : 'incomplete',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'נתיב לא נמצא' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'שגיאת שרת פנימית' });
});

// Health check function — runs on startup
async function healthCheck(): Promise<void> {
  const checks: Record<string, boolean> = {};

  // Check API keys exist
  checks['ANTHROPIC_API_KEY'] = !!process.env.ANTHROPIC_API_KEY;
  checks['DEEPGRAM_API_KEY'] = !!process.env.DEEPGRAM_API_KEY;
  checks['KIE_API_KEY'] = !!process.env.KIE_API_KEY;
  checks['ELEVENLABS_API_KEY'] = !!process.env.ELEVENLABS_API_KEY;
  checks['PEXELS_API_KEY'] = !!process.env.PEXELS_API_KEY;

  // Check FFmpeg
  try {
    await execAsync('ffmpeg -version', { timeout: 10000 });
    checks['ffmpeg'] = true;
  } catch {
    checks['ffmpeg'] = false;
    console.warn('FFmpeg not found — video processing will fail');
  }

  // Check directories
  for (const dir of ['uploads', 'output', 'temp']) {
    fs.mkdirSync(path.join(rootDir, dir), { recursive: true });
    checks[`dir_${dir}`] = true;
  }

  console.log('Health check results:');
  for (const [key, value] of Object.entries(checks)) {
    console.log(`  ${value ? 'OK' : 'MISSING'} ${key}`);
  }

  // Check Python dependencies for speaker detection
  const pythonDeps = ['onnxruntime', 'numpy', 'mediapipe', 'cv2'];
  for (const dep of pythonDeps) {
    try {
      await execAsync(`python3 -c "import ${dep}" 2>&1`, { timeout: 10000 });
      checks[`python_${dep}`] = true;
    } catch {
      checks[`python_${dep}`] = false;
    }
  }

  const missing = Object.entries(checks).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    console.warn(`Missing: ${missing.join(', ')} — some features may not work`);
  }

  const missingPython = missing.filter(k => k.startsWith('python_'));
  if (missingPython.length > 0) {
    const pkgNames = missingPython.map(k => k.replace('python_', '').replace('cv2', 'opencv-python'));
    console.warn(`\nTo install missing Python deps: pip3 install ${pkgNames.join(' ')}`);
    console.warn('Or run: npm run setup\n');
  }
}

// Run environment check before starting
const envCheck = checkEnvironment();
if (!envCheck.valid) {
  console.error(`Missing required environment variables: ${envCheck.missing.join(', ')}`);
  console.error('Create a .env file based on .env.example');
}

app.listen(PORT, () => {
  if (serverStarted) {
    console.log(`[Hot-reload] Server restarted on port ${PORT}`);
    return;
  }
  serverStarted = true;

  console.log(`Video Agents server running on http://localhost:${PORT}`);
  console.log(`Uploads: ${path.join(rootDir, 'uploads')}`);
  console.log(`Output: ${path.join(rootDir, 'output')}`);
  console.log(`Temp: ${path.join(rootDir, 'temp')}`);

  // Run health check (includes Python dependency check)
  healthCheck();

  // Verify Brain knowledge base at startup
  try {
    const brainCheck = countBrainRules();
    if (brainCheck.totalPrompts < 10) {
      console.warn(`Brain only has ${brainCheck.totalPrompts} rule sets — expected 15+. Some prompts may be undefined.`);
    }
    if (brainCheck.missing.length > 0) {
      console.warn(`Missing brain rules: ${brainCheck.missing.join(', ')}`);
    }
  } catch (error: any) {
    console.warn('Brain knowledge check failed (non-critical):', error.message);
  }

  // Start hourly cleanup of old jobs and temp files
  startCleanupSchedule();
});

export default app;
