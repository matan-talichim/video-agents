// server/services/masterPromptOptimizer.ts
// Analytics-driven optimization — learns from past projects to improve Brain prompts.

import { loadMemory } from './editorBrain.js';
import fs from 'fs';

const MASTER_PROMPT_PATH = 'data/master_prompt.json';

interface MasterPromptInsights {
  bestHookTypes: Record<string, number>;
  bestPaceModes: Record<string, number>;
  bestSubtitleStyles: Record<string, number>;
  avgCutsPerMinute: number;
  avgBrollRatio: number;
  topLessons: string[];
  lastUpdated: string;
}

export function optimizeMasterPrompt(): MasterPromptInsights {
  const memories = loadMemory();
  const withPerformance = memories.filter(m => m.actualPerformance);

  if (withPerformance.length < 3) {
    return getDefaults();
  }

  // Analyze what works best
  const goodProjects = withPerformance.filter(m => (m.actualPerformance?.engagementRate || 0) > 3);

  // Count best hook types
  const hookTypes: Record<string, number[]> = {};
  for (const p of withPerformance) {
    const ht = p.editingChoices.hookType;
    if (!hookTypes[ht]) hookTypes[ht] = [];
    hookTypes[ht].push(p.actualPerformance?.engagementRate || 0);
  }
  const bestHookTypes: Record<string, number> = {};
  for (const [type, rates] of Object.entries(hookTypes)) {
    bestHookTypes[type] = rates.reduce((a, b) => a + b) / rates.length;
  }

  // Count best pace modes
  const paceModes: Record<string, number[]> = {};
  for (const p of withPerformance) {
    if (!paceModes[p.paceMode]) paceModes[p.paceMode] = [];
    paceModes[p.paceMode].push(p.actualPerformance?.engagementRate || 0);
  }
  const bestPaceModes: Record<string, number> = {};
  for (const [mode, rates] of Object.entries(paceModes)) {
    bestPaceModes[mode] = rates.reduce((a, b) => a + b) / rates.length;
  }

  // Best subtitle styles
  const subtitleStyles: Record<string, number[]> = {};
  for (const p of withPerformance) {
    const ss = p.editingChoices.subtitleStyle;
    if (!subtitleStyles[ss]) subtitleStyles[ss] = [];
    subtitleStyles[ss].push(p.actualPerformance?.engagementRate || 0);
  }
  const bestSubtitleStyles: Record<string, number> = {};
  for (const [style, rates] of Object.entries(subtitleStyles)) {
    bestSubtitleStyles[style] = rates.reduce((a, b) => a + b) / rates.length;
  }

  // Average stats from good projects
  const avgCuts = goodProjects.length > 0
    ? goodProjects.reduce((sum, p) => sum + (p.editingChoices.cutsCount / Math.max(p.duration / 60, 1)), 0) / goodProjects.length
    : 12;

  const avgBroll = goodProjects.length > 0
    ? goodProjects.reduce((sum, p) => sum + p.editingChoices.brollRatio, 0) / goodProjects.length
    : 4;

  // Collect lessons
  const allLessons = withPerformance.flatMap(p => p.lessons).filter(l => l.length > 0);
  const topLessons = allLessons.slice(-10);

  const insights: MasterPromptInsights = {
    bestHookTypes,
    bestPaceModes,
    bestSubtitleStyles,
    avgCutsPerMinute: avgCuts,
    avgBrollRatio: avgBroll,
    topLessons,
    lastUpdated: new Date().toISOString(),
  };

  // Save insights
  const dir = 'data';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MASTER_PROMPT_PATH, JSON.stringify(insights, null, 2));

  console.log(`[MasterPrompt] Optimized from ${withPerformance.length} projects with performance data`);

  return insights;
}

// Generate a context string to inject into Brain prompts
export function getMasterPromptContext(): string {
  try {
    if (fs.existsSync(MASTER_PROMPT_PATH)) {
      const insights: MasterPromptInsights = JSON.parse(fs.readFileSync(MASTER_PROMPT_PATH, 'utf-8'));

      const bestHook = Object.entries(insights.bestHookTypes).sort(([,a], [,b]) => b - a)[0];
      const bestPace = Object.entries(insights.bestPaceModes).sort(([,a], [,b]) => b - a)[0];

      return `MASTER PROMPT INSIGHTS (from ${insights.topLessons.length > 0 ? 'real performance data' : 'quality predictions'}):
- Best hook type: "${bestHook?.[0] || 'curiosity-gap'}" (avg ${bestHook?.[1]?.toFixed(1) || '?'}% engagement)
- Best pace mode: "${bestPace?.[0] || 'normal'}" (avg ${bestPace?.[1]?.toFixed(1) || '?'}% engagement)
- Optimal cuts: ${insights.avgCutsPerMinute.toFixed(0)} per minute
- Recent lessons: ${insights.topLessons.slice(-3).join('; ')}
Apply these learnings to this project.`;
    }
  } catch {}
  return '';
}

function getDefaults(): MasterPromptInsights {
  return {
    bestHookTypes: { 'curiosity-gap': 4.5, 'statistic': 4.0, 'bold-claim': 3.8 },
    bestPaceModes: { 'fast': 5.0, 'normal': 3.8, 'calm': 3.2 },
    bestSubtitleStyles: { 'word-highlight': 4.5, 'bold-center': 4.2, 'sentence': 3.5 },
    avgCutsPerMinute: 12,
    avgBrollRatio: 4,
    topLessons: [],
    lastUpdated: new Date().toISOString(),
  };
}
