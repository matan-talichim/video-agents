import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import jobsRouter from './routes/jobs.js';
import modelsRouter from './routes/models.js';
import effectsRouter from './routes/effects.js';
import brandKitRouter from './routes/brandKit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = 3001;

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
const dirs = ['uploads', 'output', 'temp'];
for (const dir of dirs) {
  const dirPath = path.join(rootDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/models', modelsRouter);
app.use('/api', effectsRouter);
app.use('/api/brand-kit', brandKitRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: 95,
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

app.listen(PORT, () => {
  console.log(`🚀 Video Agents server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads: ${path.join(rootDir, 'uploads')}`);
  console.log(`📁 Output: ${path.join(rootDir, 'output')}`);
  console.log(`📁 Temp: ${path.join(rootDir, 'temp')}`);
});

export default app;
