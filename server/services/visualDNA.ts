import fs from 'fs';
import { askClaudeVision } from './claude.js';

export interface VisualDNAProfile {
  id: string;
  name: string;
  colorPalette: string[];
  typography: string;
  mood: string;
  pacing: string;
  visualStyle: string;
  promptPrefix: string;
  createdAt: string;
}

const profiles: Map<string, VisualDNAProfile> = new Map();

// Analyze brand materials and create a Visual DNA profile
export async function createVisualDNA(
  name: string,
  materials: Array<{ type: 'image' | 'video' | 'text'; path?: string; content?: string }>
): Promise<VisualDNAProfile> {
  console.log(`[Visual DNA] Creating profile: "${name}" from ${materials.length} materials`);

  // Analyze visual materials with Claude Vision
  const analysisPrompts: any[] = [];

  for (const material of materials) {
    if (material.type === 'image' && material.path) {
      const imageBase64 = fs.readFileSync(material.path).toString('base64');
      analysisPrompts.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
      });
    }
    if (material.type === 'text' && material.content) {
      analysisPrompts.push({ type: 'text', text: `Brand text: ${material.content}` });
    }
  }

  analysisPrompts.push({
    type: 'text',
    text: `Analyze these brand materials and extract a Visual DNA profile. Return JSON:
{
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "typography": "modern/classic/bold/elegant/playful",
  "mood": "professional/energetic/calm/luxury/friendly",
  "pacing": "fast/normal/calm",
  "visualStyle": "cinematic/bright/moody/clean/vintage",
  "promptPrefix": "A 1-2 sentence description to prepend to every AI generation prompt to match this brand style"
}`,
  });

  let analysis;
  try {
    const response = await askClaudeVision(
      'You analyze brand visual identity and create style profiles.',
      analysisPrompts
    );
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    analysis = JSON.parse(cleaned);
  } catch {
    analysis = {
      colorPalette: ['#7c3aed', '#3B82F6', '#ffffff', '#1a1a2e'],
      typography: 'modern',
      mood: 'professional',
      pacing: 'normal',
      visualStyle: 'cinematic',
      promptPrefix: 'Professional, modern style with clean composition',
    };
  }

  const profile: VisualDNAProfile = {
    id: `vdna_${Date.now()}`,
    name,
    ...analysis,
    createdAt: new Date().toISOString(),
  };

  profiles.set(profile.id, profile);
  console.log(`[Visual DNA] Profile created: ${profile.id}`);
  return profile;
}

// Get the prompt prefix for a Visual DNA profile
export function getVisualDNAPromptPrefix(profileId: string): string {
  const profile = profiles.get(profileId);
  return profile?.promptPrefix || '';
}

// Apply Visual DNA to a B-Roll generation prompt
export function applyVisualDNA(prompt: string, profileId: string): string {
  const prefix = getVisualDNAPromptPrefix(profileId);
  if (!prefix) return prompt;
  return `${prefix}. ${prompt}`;
}

// List all profiles
export function listProfiles(): VisualDNAProfile[] {
  return Array.from(profiles.values());
}
