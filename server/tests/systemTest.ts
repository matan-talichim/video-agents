// server/tests/systemTest.ts — Full system verification
// Tests environment, external tools, API connectivity, and file system access.

import { checkEnvironment } from '../checkEnv.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
}

export async function runSystemTest(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // Test 1: Environment variables
  try {
    const env = checkEnvironment();
    results.push({
      test: 'Environment variables',
      passed: env.valid,
      error: env.valid ? undefined : `Missing: ${env.missing.join(', ')}`,
    });
  } catch (e: any) {
    results.push({ test: 'Environment variables', passed: false, error: e.message });
  }

  // Test 2: FFmpeg available
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    results.push({ test: 'FFmpeg installed', passed: true });
  } catch {
    results.push({ test: 'FFmpeg installed', passed: false, error: 'ffmpeg not found in PATH' });
  }

  // Test 3: Claude API connectivity
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      results.push({ test: 'Claude API', passed: false, error: 'ANTHROPIC_API_KEY not set' });
    } else {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      });
      results.push({
        test: 'Claude API',
        passed: response.ok,
        error: response.ok ? undefined : `Status: ${response.status}`,
      });
    }
  } catch (e: any) {
    results.push({ test: 'Claude API', passed: false, error: e.message });
  }

  // Test 4: Deepgram API connectivity
  try {
    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) {
      results.push({ test: 'Deepgram API', passed: false, error: 'DEEPGRAM_API_KEY not set' });
    } else {
      const response = await fetch('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${key}` },
      });
      results.push({
        test: 'Deepgram API',
        passed: response.ok,
        error: response.ok ? undefined : `Status: ${response.status}`,
      });
    }
  } catch (e: any) {
    results.push({ test: 'Deepgram API', passed: false, error: e.message });
  }

  // Test 5: KIE.ai API key
  try {
    const hasKey = !!process.env.KIE_API_KEY;
    results.push({
      test: 'KIE.ai API key',
      passed: hasKey,
      error: hasKey ? undefined : 'KIE_API_KEY not set',
    });
  } catch (e: any) {
    results.push({ test: 'KIE.ai API key', passed: false, error: e.message });
  }

  // Test 6: temp directory writable
  try {
    const tempDir = path.join(rootDir, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    results.push({ test: 'Temp directory writable', passed: true });
  } catch (e: any) {
    results.push({ test: 'Temp directory writable', passed: false, error: e.message });
  }

  // Test 7: output directory writable
  try {
    const outputDir = path.join(rootDir, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const testFile = path.join(outputDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    results.push({ test: 'Output directory writable', passed: true });
  } catch (e: any) {
    results.push({ test: 'Output directory writable', passed: false, error: e.message });
  }

  // Test 8: uploads directory writable
  try {
    const uploadsDir = path.join(rootDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const testFile = path.join(uploadsDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    results.push({ test: 'Uploads directory writable', passed: true });
  } catch (e: any) {
    results.push({ test: 'Uploads directory writable', passed: false, error: e.message });
  }

  // Test 9: ElevenLabs (optional)
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      });
      results.push({
        test: 'ElevenLabs API',
        passed: response.ok,
        error: response.ok ? undefined : `Status: ${response.status}`,
      });
    } catch {
      results.push({ test: 'ElevenLabs API', passed: false, error: 'Connection failed' });
    }
  }

  // Test 10: Pexels (optional)
  if (process.env.PEXELS_API_KEY) {
    try {
      const response = await fetch('https://api.pexels.com/v1/search?query=test&per_page=1', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
      });
      results.push({
        test: 'Pexels API',
        passed: response.ok,
        error: response.ok ? undefined : `Status: ${response.status}`,
      });
    } catch {
      results.push({ test: 'Pexels API', passed: false, error: 'Connection failed' });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n=== System Test Results ===');
  for (const r of results) {
    console.log(`  ${r.passed ? 'PASS' : 'FAIL'} ${r.test}${r.error ? ` — ${r.error}` : ''}`);
  }
  console.log(`\n${passed}/${results.length} passed, ${failed} failed`);
  console.log('==========================\n');

  return { passed, failed, results };
}
