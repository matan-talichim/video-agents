// server/tests/fullDiagnostic.ts
// Full system diagnostic — verifies environment, Brain knowledge, Claude API, FFmpeg, and services.

import { assembleMasterBrainPrompt, countBrainRules } from '../services/masterBrain.js';
import { checkEnvironment } from '../checkEnv.js';
import { askClaude } from '../services/claude.js';
import { runFFmpeg } from '../services/ffmpeg.js';
import fs from 'fs';

interface DiagnosticResult {
  timestamp: string;
  overall: 'PASS' | 'FAIL' | 'PARTIAL';
  score: number;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  sections: DiagnosticSection[];
}

interface DiagnosticSection {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  tests: Array<{ test: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string }>;
}

function buildResult(sections: DiagnosticSection[]): DiagnosticResult {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const section of sections) {
    for (const test of section.tests) {
      totalTests++;
      if (test.status === 'PASS') passed++;
      else if (test.status === 'FAIL') failed++;
      else warnings++;
    }
  }

  const score = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;
  const overall = failed === 0 ? (warnings === 0 ? 'PASS' : 'PARTIAL') : 'FAIL';

  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    overall,
    score,
    totalTests,
    passed,
    failed,
    warnings,
    sections,
  };

  // Print report
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         DIAGNOSTIC REPORT                ║');
  console.log('╚══════════════════════════════════════════╝');

  for (const section of sections) {
    const icon = section.status === 'PASS' ? '✅' : section.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`\n${icon} ${section.name}`);
    for (const test of section.tests) {
      const tIcon = test.status === 'PASS' ? '  ✅' : test.status === 'FAIL' ? '  ❌' : '  ⚠️';
      console.log(`${tIcon} ${test.test} — ${test.detail}`);
    }
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  SCORE: ${score}% (${passed}/${totalTests} passed, ${failed} failed, ${warnings} warnings)`);
  console.log(`║  STATUS: ${overall}`);
  console.log('╚══════════════════════════════════════════╝\n');

  // Save report to file
  try {
    const reportDir = 'data';
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = `${reportDir}/diagnostic_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`Report saved to: ${reportPath}`);

    // Also save latest report
    fs.writeFileSync(`${reportDir}/diagnostic_latest.json`, JSON.stringify(result, null, 2));
  } catch {}

  return result;
}

export async function runFullDiagnostic(): Promise<DiagnosticResult> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   VIDEO AGENTS — FULL SYSTEM DIAGNOSTIC   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const sections: DiagnosticSection[] = [];

  // ═══════════════════════════════════════════
  // SECTION 1: ENVIRONMENT & APIs
  // ═══════════════════════════════════════════
  const envSection: DiagnosticSection = { name: '1. Environment & API Keys', status: 'PASS', tests: [] };

  const envCheck = checkEnvironment();
  envSection.tests.push({
    test: 'Required API keys present',
    status: envCheck.valid ? 'PASS' : 'FAIL',
    detail: envCheck.valid ? 'All required keys found' : `Missing: ${envCheck.missing.join(', ')}`,
  });

  for (const key of ['ANTHROPIC_API_KEY', 'DEEPGRAM_API_KEY', 'KIE_API_KEY']) {
    const exists = !!process.env[key];
    envSection.tests.push({ test: key, status: exists ? 'PASS' : 'FAIL', detail: exists ? 'Set' : 'MISSING — REQUIRED' });
  }

  for (const key of ['ELEVENLABS_API_KEY', 'SUNO_API_KEY', 'PEXELS_API_KEY', 'FAL_API_KEY', 'GEMINI_API_KEY']) {
    const exists = !!process.env[key];
    envSection.tests.push({ test: key, status: exists ? 'PASS' : 'WARN', detail: exists ? 'Set' : 'Missing (optional)' });
  }

  if (envSection.tests.some(t => t.status === 'FAIL')) envSection.status = 'FAIL';
  else if (envSection.tests.some(t => t.status === 'WARN')) envSection.status = 'WARN';
  sections.push(envSection);

  // ═══════════════════════════════════════════
  // SECTION 2: FFmpeg
  // ═══════════════════════════════════════════
  const ffmpegSection: DiagnosticSection = { name: '2. FFmpeg', status: 'PASS', tests: [] };

  try {
    const { stdout, stderr } = await runFFmpeg('ffmpeg -version');
    const output = stdout || stderr || '';
    const versionMatch = output.match(/ffmpeg version (\S+)/);
    ffmpegSection.tests.push({ test: 'FFmpeg installed', status: 'PASS', detail: `Version: ${versionMatch?.[1] || 'unknown'}` });
  } catch {
    ffmpegSection.tests.push({ test: 'FFmpeg installed', status: 'FAIL', detail: 'ffmpeg not found — CRITICAL' });
    ffmpegSection.status = 'FAIL';
  }

  try {
    await runFFmpeg('ffprobe -version');
    ffmpegSection.tests.push({ test: 'FFprobe installed', status: 'PASS', detail: 'Available' });
  } catch {
    ffmpegSection.tests.push({ test: 'FFprobe installed', status: 'FAIL', detail: 'ffprobe not found' });
    ffmpegSection.status = 'FAIL';
  }

  // Test key FFmpeg filters
  try {
    const { stdout, stderr } = await runFFmpeg('ffmpeg -filters 2>&1');
    const filterOutput = stdout || stderr || '';
    const requiredFilters = ['blackdetect', 'cropdetect', 'loudnorm', 'drawtext', 'scale'];
    for (const filter of requiredFilters) {
      const has = filterOutput.includes(filter);
      ffmpegSection.tests.push({
        test: `Filter: ${filter}`,
        status: has ? 'PASS' : 'WARN',
        detail: has ? 'Available' : 'Not found — some features disabled',
      });
    }
  } catch {
    ffmpegSection.tests.push({ test: 'Filter check', status: 'WARN', detail: 'Could not enumerate filters' });
  }

  if (ffmpegSection.tests.some(t => t.status === 'FAIL')) ffmpegSection.status = 'FAIL';
  else if (ffmpegSection.tests.some(t => t.status === 'WARN')) ffmpegSection.status = 'WARN';
  sections.push(ffmpegSection);

  // ═══════════════════════════════════════════
  // SECTION 3: BRAIN KNOWLEDGE BASE
  // ═══════════════════════════════════════════
  const brainSection: DiagnosticSection = { name: '3. Brain Knowledge Base', status: 'PASS', tests: [] };

  const brainRules = countBrainRules();
  brainSection.tests.push({
    test: 'Total rule categories',
    status: brainRules.totalPrompts >= 15 ? 'PASS' : brainRules.totalPrompts >= 10 ? 'WARN' : 'FAIL',
    detail: `${brainRules.totalPrompts} categories (expected 15+)`,
  });

  brainSection.tests.push({
    test: 'Knowledge base size',
    status: brainRules.totalCharacters > 5000 ? 'PASS' : 'WARN',
    detail: `${brainRules.totalCharacters} chars (~${Math.round(brainRules.totalCharacters / 4)} tokens)`,
  });

  // Check each category is present
  for (const cat of brainRules.categories) {
    brainSection.tests.push({
      test: `Rule: ${cat}`,
      status: 'PASS',
      detail: 'Defined and loaded',
    });
  }

  for (const missing of brainRules.missing) {
    brainSection.tests.push({
      test: `Rule: ${missing}`,
      status: 'FAIL',
      detail: 'MISSING — Brain does not know this rule!',
    });
  }

  if (brainSection.tests.some(t => t.status === 'FAIL')) brainSection.status = 'FAIL';
  sections.push(brainSection);

  // ═══════════════════════════════════════════
  // SECTION 4: MASTER BRAIN PROMPT ASSEMBLY
  // ═══════════════════════════════════════════
  const assemblySection: DiagnosticSection = { name: '4. Master Brain Prompt Assembly', status: 'PASS', tests: [] };

  try {
    const masterPrompt = assembleMasterBrainPrompt('real-estate', 'instagram-reels', 'normal', 'normal', true, 1);

    assemblySection.tests.push({
      test: 'Prompt assembles without error',
      status: 'PASS',
      detail: `${masterPrompt.length} chars assembled`,
    });

    // Check that key sections are present in assembled prompt
    const mustContain = [
      { keyword: 'Murch', section: 'Murch Rules' },
      { keyword: 'emotional arc', section: 'Emotional Arc' },
      { keyword: 'speed ramp', section: 'Speed Ramping' },
      { keyword: 'pattern interrupt', section: 'Pattern Interrupts' },
      { keyword: 'strategic silence', section: 'Strategic Silence' },
      { keyword: 'B-Roll', section: 'B-Roll Precision' },
      { keyword: 'cinematic', section: 'Cinematic Prompting' },
      { keyword: 'platform', section: 'Platform Strategy' },
      { keyword: 'zoom', section: 'Smart Zoom' },
      { keyword: 'color', section: 'Color Story' },
      { keyword: 'background', section: 'Background Quality' },
      { keyword: 'lighting', section: 'Lighting Quality' },
    ];

    for (const check of mustContain) {
      const found = masterPrompt.toLowerCase().includes(check.keyword.toLowerCase());
      assemblySection.tests.push({
        test: `Contains: ${check.section}`,
        status: found ? 'PASS' : 'FAIL',
        detail: found ? `"${check.keyword}" found in prompt` : `"${check.keyword}" NOT FOUND — Brain will not use ${check.section}!`,
      });
    }

    // Check that the prompt asks for all output categories
    const outputCategories = ['cuts', 'zooms', 'speedRamps', 'patternInterrupts', 'emotionalArc', 'brollInsertions', 'soundDesign', 'backgroundPlan', 'lightingPlan', 'colorStory'];
    for (const cat of outputCategories) {
      const found = masterPrompt.includes(cat);
      assemblySection.tests.push({
        test: `Requests output: ${cat}`,
        status: found ? 'PASS' : 'WARN',
        detail: found ? 'Brain asked to generate this' : `Brain NOT asked to generate ${cat}`,
      });
    }

  } catch (err: any) {
    assemblySection.tests.push({ test: 'Prompt assembly', status: 'FAIL', detail: `Error: ${err.message}` });
    assemblySection.status = 'FAIL';
  }

  if (assemblySection.tests.some(t => t.status === 'FAIL')) assemblySection.status = 'FAIL';
  else if (assemblySection.tests.some(t => t.status === 'WARN')) assemblySection.status = 'WARN';
  sections.push(assemblySection);

  // ═══════════════════════════════════════════
  // SECTION 5: CLAUDE API — LIVE TEST
  // ═══════════════════════════════════════════
  const claudeSection: DiagnosticSection = { name: '5. Claude API — Live Test', status: 'PASS', tests: [] };

  if (!process.env.ANTHROPIC_API_KEY) {
    claudeSection.tests.push({ test: 'Claude API connection', status: 'FAIL', detail: 'ANTHROPIC_API_KEY not set — cannot test' });
    claudeSection.status = 'FAIL';
    sections.push(claudeSection);
    return buildResult(sections);
  }

  try {
    const basicResponse = await askClaude(
      'You are a test assistant. Respond with exactly: {"status":"ok"}',
      'Return {"status":"ok"} and nothing else.'
    );
    const cleaned = basicResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const basicParsed = JSON.parse(cleaned);
    claudeSection.tests.push({
      test: 'Claude API connection',
      status: basicParsed.status === 'ok' ? 'PASS' : 'WARN',
      detail: `Response: ${basicResponse.slice(0, 50)}`,
    });
  } catch (err: any) {
    claudeSection.tests.push({ test: 'Claude API connection', status: 'FAIL', detail: `Error: ${err.message}` });
    claudeSection.status = 'FAIL';
    sections.push(claudeSection);
    return buildResult(sections);
  }

  // Test: Brain produces valid editing blueprint from a sample transcript
  try {
    const sampleTranscript = 'שלום, אני יוסי ואני רוצה להראות לכם את הפרויקט החדש שלנו. הפרויקט נמצא 5 דקות מהחוף בחיפה. יש כאן 3 חדרי שינה, מרפסת ענקית עם נוף לים, וחניה פרטית. המחיר? ₪1,890,000 בלבד. רק 5 דירות נותרו. תתקשרו עכשיו.';

    const masterPrompt = assembleMasterBrainPrompt('real-estate', 'instagram-reels', 'normal', 'normal', true, 1);

    const blueprintResponse = await askClaude(
      masterPrompt,
      `DIAGNOSTIC TEST — Generate a sample editing blueprint for this transcript:
"${sampleTranscript}"

Duration: 35 seconds
Format: 9:16
Platform: Instagram Reels

Return VALID JSON with ALL these categories:
{
  "cuts": [...],
  "zooms": [...],
  "speedRamps": [...],
  "patternInterrupts": [...],
  "emotionalArc": [...],
  "protectedSilences": [...],
  "brollInsertions": [...],
  "soundDesign": { "sfx": [...], "musicDucking": [...] },
  "backgroundPlan": {...},
  "lightingPlan": {...},
  "colorStory": {...}
}

This is a diagnostic test. Generate realistic editing decisions based on the transcript and ALL your editing rules.`
    );

    // Try to parse the response
    let blueprint;
    try {
      const cleaned = blueprintResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      blueprint = JSON.parse(cleaned);
    } catch {
      claudeSection.tests.push({
        test: 'Blueprint JSON parsing',
        status: 'FAIL',
        detail: `Response is not valid JSON. First 200 chars: ${blueprintResponse.slice(0, 200)}`,
      });
      claudeSection.status = 'FAIL';
      sections.push(claudeSection);
      return buildResult(sections);
    }

    claudeSection.tests.push({ test: 'Blueprint JSON parsing', status: 'PASS', detail: 'Valid JSON returned' });

    // Check each category exists
    const categories = [
      { key: 'cuts', minItems: 2, description: 'Cut points' },
      { key: 'zooms', minItems: 1, description: 'Zoom events' },
      { key: 'speedRamps', minItems: 0, description: 'Speed changes' },
      { key: 'patternInterrupts', minItems: 1, description: 'Attention resets' },
      { key: 'emotionalArc', minItems: 2, description: 'Energy levels' },
      { key: 'protectedSilences', minItems: 0, description: 'Strategic pauses' },
      { key: 'brollInsertions', minItems: 1, description: 'B-Roll placements' },
      { key: 'soundDesign', minItems: 0, description: 'SFX + Music ducking' },
      { key: 'backgroundPlan', minItems: 0, description: 'Background quality' },
      { key: 'lightingPlan', minItems: 0, description: 'Lighting fixes' },
      { key: 'colorStory', minItems: 0, description: 'Color grading' },
    ];

    for (const cat of categories) {
      const value = blueprint[cat.key];
      const isArray = Array.isArray(value);
      const isObject = typeof value === 'object' && value !== null;
      const exists = value !== undefined && value !== null;

      if (!exists) {
        claudeSection.tests.push({
          test: `Blueprint: ${cat.key}`,
          status: cat.minItems > 0 ? 'FAIL' : 'WARN',
          detail: `MISSING from blueprint — Brain did not generate ${cat.description}`,
        });
      } else if (isArray) {
        claudeSection.tests.push({
          test: `Blueprint: ${cat.key}`,
          status: value.length >= cat.minItems ? 'PASS' : 'WARN',
          detail: `${value.length} items generated`,
        });
      } else if (isObject) {
        claudeSection.tests.push({
          test: `Blueprint: ${cat.key}`,
          status: 'PASS',
          detail: `Object with ${Object.keys(value).length} properties`,
        });
      }
    }

    // Check if B-Roll prompts are cinematic (not basic)
    if (blueprint.brollInsertions && blueprint.brollInsertions.length > 0) {
      const firstBroll = blueprint.brollInsertions[0];
      const prompt = firstBroll.prompt || firstBroll.brollPrompt || firstBroll.cinematicPrompt || '';
      const isCinematic = prompt.length > 50 && (
        prompt.toLowerCase().includes('shot') ||
        prompt.toLowerCase().includes('cinematic') ||
        prompt.toLowerCase().includes('camera') ||
        prompt.toLowerCase().includes('light') ||
        prompt.toLowerCase().includes('aerial') ||
        prompt.toLowerCase().includes('dolly')
      );

      claudeSection.tests.push({
        test: 'B-Roll prompt quality',
        status: isCinematic ? 'PASS' : 'WARN',
        detail: isCinematic
          ? `Cinematic prompt: "${prompt.slice(0, 80)}..."`
          : `Basic prompt: "${prompt.slice(0, 80)}..." — Expected cinematic detail`,
      });
    }

    // Check if emotional arc has energy variation (not flat)
    if (blueprint.emotionalArc && blueprint.emotionalArc.length > 1) {
      const energies = blueprint.emotionalArc.map((e: any) => e.energy || 0);
      const maxEnergy = Math.max(...energies);
      const minEnergy = Math.min(...energies);
      const variation = maxEnergy - minEnergy;

      claudeSection.tests.push({
        test: 'Emotional arc variation',
        status: variation >= 4 ? 'PASS' : variation >= 2 ? 'WARN' : 'FAIL',
        detail: `Energy range: ${minEnergy}-${maxEnergy} (variation: ${variation}). ${variation >= 4 ? 'Good rollercoaster' : 'Too flat — needs more contrast'}`,
      });
    }

    // Check if cuts have Murch scores
    if (blueprint.cuts && blueprint.cuts.length > 0) {
      const hasMurch = blueprint.cuts.some((c: any) => c.murchScore !== undefined || c.murch !== undefined);
      claudeSection.tests.push({
        test: 'Murch scores on cuts',
        status: hasMurch ? 'PASS' : 'WARN',
        detail: hasMurch ? 'Cuts include Murch Rule of Six scores' : 'No Murch scores found',
      });
    }

    // Check speed ramps
    claudeSection.tests.push({
      test: 'Speed ramping applied',
      status: (blueprint.speedRamps?.length || 0) > 0 ? 'PASS' : 'WARN',
      detail: `${blueprint.speedRamps?.length || 0} speed ramps planned`,
    });

    // Check pattern interrupt spacing
    if (blueprint.patternInterrupts && blueprint.patternInterrupts.length > 1) {
      const times = blueprint.patternInterrupts
        .map((p: any) => p.at || p.timestamp || p.time || 0)
        .sort((a: number, b: number) => a - b);
      const gaps = [];
      for (let i = 1; i < times.length; i++) {
        gaps.push(times[i] - times[i - 1]);
      }
      const avgGap = gaps.length > 0 ? gaps.reduce((a: number, b: number) => a + b) / gaps.length : 0;

      claudeSection.tests.push({
        test: 'Pattern interrupt spacing',
        status: avgGap >= 8 && avgGap <= 25 ? 'PASS' : 'WARN',
        detail: `Average gap: ${avgGap.toFixed(1)}s (expected 12-18s)`,
      });
    }

    // Check protected silences
    claudeSection.tests.push({
      test: 'Protected silences',
      status: (blueprint.protectedSilences?.length || 0) > 0 ? 'PASS' : 'WARN',
      detail: `${blueprint.protectedSilences?.length || 0} strategic pauses identified`,
    });

  } catch (err: any) {
    claudeSection.tests.push({ test: 'Blueprint generation', status: 'FAIL', detail: `Error: ${err.message}` });
    claudeSection.status = 'FAIL';
  }

  if (claudeSection.tests.some(t => t.status === 'FAIL')) claudeSection.status = 'FAIL';
  else if (claudeSection.tests.some(t => t.status === 'WARN')) claudeSection.status = 'WARN';
  sections.push(claudeSection);

  // ═══════════════════════════════════════════
  // SECTION 6: FILE SYSTEM & DIRECTORIES
  // ═══════════════════════════════════════════
  const fsSection: DiagnosticSection = { name: '6. File System', status: 'PASS', tests: [] };

  for (const dir of ['temp', 'output', 'data', 'uploads']) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(`${dir}/_test_write`, 'test');
      fs.unlinkSync(`${dir}/_test_write`);
      fsSection.tests.push({ test: `Directory: ${dir}`, status: 'PASS', detail: 'Writable' });
    } catch (err: any) {
      fsSection.tests.push({ test: `Directory: ${dir}`, status: 'FAIL', detail: `Not writable: ${err.message}` });
      fsSection.status = 'FAIL';
    }
  }

  sections.push(fsSection);

  // ═══════════════════════════════════════════
  // SECTION 7: SERVICES FILES EXISTENCE
  // ═══════════════════════════════════════════
  const servicesSection: DiagnosticSection = { name: '7. Services Files', status: 'PASS', tests: [] };

  const expectedServices = [
    'server/services/masterBrain.ts',
    'server/services/contentAnalyzer.ts',
    'server/services/contentSelector.ts',
    'server/services/editingRules.ts',
    'server/services/claude.ts',
    'server/services/ffmpeg.ts',
    'server/services/qualityCheck.ts',
    'server/services/hookGenerator.ts',
    'server/services/abTesting.ts',
    'server/services/retentionOptimizer.ts',
    'server/services/loopOptimizer.ts',
    'server/services/freshEyesReview.ts',
    'server/services/editorBrain.ts',
    'server/services/masterPromptOptimizer.ts',
    'server/orchestrator/orchestrator.ts',
    'server/brain/brain.ts',
  ];

  for (const service of expectedServices) {
    const exists = fs.existsSync(service);
    servicesSection.tests.push({
      test: service.split('/').pop() || service,
      status: exists ? 'PASS' : 'WARN',
      detail: exists ? 'File exists' : 'File not found',
    });
  }

  if (servicesSection.tests.some(t => t.status === 'FAIL')) servicesSection.status = 'FAIL';
  else if (servicesSection.tests.some(t => t.status === 'WARN')) servicesSection.status = 'WARN';
  sections.push(servicesSection);

  // ═══════════════════════════════════════════
  // BUILD FINAL REPORT
  // ═══════════════════════════════════════════
  return buildResult(sections);
}
