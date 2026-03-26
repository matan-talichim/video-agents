// server/services/editorBrain.ts
// "Editor Brain" learning — memory from past projects to improve future editing.

import fs from 'fs';

export interface ProjectMemory {
  projectId: string;
  date: string;
  category: string;
  platform: string;
  paceMode: string;
  duration: number;
  editingChoices: {
    cutsCount: number;
    speedRampsCount: number;
    patternInterruptsCount: number;
    brollRatio: number;
    hookType: string;
    subtitleStyle: string;
    musicGenre: string;
  };
  qualityScores: {
    qaScore: number;
    engagementPrediction: number;
    retentionPredicted: number;
    freshEyesConfidence: number;
  };
  actualPerformance?: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    engagementRate: number;
    avgRetention: number;
  };
  lessons: string[];
}

const MEMORY_PATH = 'data/editor_brain_memory.json';

export function loadMemory(): ProjectMemory[] {
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf-8'));
    }
  } catch {}
  return [];
}

export function saveMemory(memories: ProjectMemory[]): void {
  const dir = 'data';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memories, null, 2));
}

// After a project completes, save what worked
export function rememberProject(job: any): void {
  const memories = loadMemory();

  const memory: ProjectMemory = {
    projectId: job.id,
    date: new Date().toISOString(),
    category: job.videoIntelligence?.concept?.category || 'general',
    platform: job.plan?.export?.formats?.includes('9:16') ? 'tiktok' : 'youtube',
    paceMode: job.paceMode || 'normal',
    duration: job.result?.duration || 0,
    editingChoices: {
      cutsCount: job.editingBlueprint?.cuts?.length || 0,
      speedRampsCount: job.editingBlueprint?.speedRamps?.length || 0,
      patternInterruptsCount: job.editingBlueprint?.patternInterrupts?.length || 0,
      brollRatio: job.editingBlueprint?.brollInsertions?.length || 0,
      hookType: job.hookVariations?.[0]?.type || 'unknown',
      subtitleStyle: job.subtitleStylePlan?.selectedStyle || 'sentence',
      musicGenre: job.plan?.generate?.musicMood || 'unknown',
    },
    qualityScores: {
      qaScore: job.qaResult?.overallScore || 0,
      engagementPrediction: job.engagementPrediction?.overallScore || 0,
      retentionPredicted: job.retentionPlan?.predictedRetention || 0,
      freshEyesConfidence: job.freshEyesReview?.overallConfidence || 0,
    },
    lessons: [],
  };

  memories.push(memory);
  // Keep last 100 projects
  if (memories.length > 100) memories.splice(0, memories.length - 100);
  saveMemory(memories);
  console.log(`[Brain] Saved memory for project ${job.id}. Total memories: ${memories.length}`);
}

// Generate context from past projects for the Brain
export function getBrainContext(category: string, platform: string): string {
  const memories = loadMemory();
  const relevant = memories.filter(m => m.category === category || m.platform === platform);

  if (relevant.length === 0) return '';

  // Find best-performing projects
  const withPerformance = relevant.filter(m => m.actualPerformance);
  const bestProjects = withPerformance
    .sort((a, b) => (b.actualPerformance?.engagementRate || 0) - (a.actualPerformance?.engagementRate || 0))
    .slice(0, 3);

  if (bestProjects.length === 0) {
    // No performance data yet — use quality scores
    const bestQuality = relevant
      .sort((a, b) => b.qualityScores.engagementPrediction - a.qualityScores.engagementPrediction)
      .slice(0, 3);

    return `EDITOR MEMORY — top quality projects for ${category}/${platform}:
${bestQuality.map(p => `- Project ${p.projectId}: pace=${p.paceMode}, cuts=${p.editingChoices.cutsCount}, hook=${p.editingChoices.hookType}, predicted engagement=${p.qualityScores.engagementPrediction}/100`).join('\n')}
Use similar editing patterns for this project.`;
  }

  return `EDITOR MEMORY — best performing projects for ${category}/${platform}:
${bestProjects.map(p => `- Project ${p.projectId}: engagement=${p.actualPerformance!.engagementRate}%, retention=${p.actualPerformance!.avgRetention}%, pace=${p.paceMode}, cuts=${p.editingChoices.cutsCount}, hook=${p.editingChoices.hookType}, subtitle=${p.editingChoices.subtitleStyle}`).join('\n')}
Apply similar patterns — these ACTUALLY worked with real audiences.`;
}

// User reports back actual performance
export function updateProjectPerformance(
  projectId: string,
  performance: ProjectMemory['actualPerformance']
): boolean {
  const memories = loadMemory();
  const project = memories.find(m => m.projectId === projectId);
  if (!project || !performance) return false;

  project.actualPerformance = performance;

  // Generate lessons learned
  if (performance.engagementRate > 5) {
    project.lessons.push(`HIGH engagement (${performance.engagementRate.toFixed(1)}%) — editing pattern works well`);
  }
  if (performance.avgRetention > 70) {
    project.lessons.push(`HIGH retention (${performance.avgRetention}%) — pacing was excellent`);
  }
  if (performance.engagementRate < 2) {
    project.lessons.push(`LOW engagement (${performance.engagementRate.toFixed(1)}%) — try different approach`);
  }

  saveMemory(memories);
  console.log(`[Brain] Updated performance for ${projectId}: ${performance.engagementRate.toFixed(1)}% engagement`);
  return true;
}
