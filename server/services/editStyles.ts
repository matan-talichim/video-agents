import type { ExecutionPlan, EditStyle } from '../types.js';

export interface EditStylePreset {
  name: string;
  nameHebrew: string;
  pacing: 'fast' | 'normal' | 'calm';
  colorGradingStyle: string;
  zoomStyle: string;
  musicMood: string;
  transitions: string;
  beatSync: boolean;
  musicSync: boolean;
  vfxTypes: string[];
  subtitleStyle: string;
}

export const EDIT_STYLES: Record<string, EditStylePreset> = {
  cinematic: {
    name: 'cinematic',
    nameHebrew: 'סינמטי',
    pacing: 'calm',
    colorGradingStyle: 'cinematic',
    zoomStyle: 'ken-burns',
    musicMood: 'dramatic',
    transitions: 'crossfade',
    beatSync: false,
    musicSync: false,
    vfxTypes: [],
    subtitleStyle: 'simple',
  },
  energetic: {
    name: 'energetic',
    nameHebrew: 'אנרגטי',
    pacing: 'fast',
    colorGradingStyle: 'bright',
    zoomStyle: 'punch',
    musicMood: 'energetic',
    transitions: 'cut',
    beatSync: true,
    musicSync: true,
    vfxTypes: ['camera-shake'],
    subtitleStyle: 'animated',
  },
  minimal: {
    name: 'minimal',
    nameHebrew: 'מינימלי',
    pacing: 'normal',
    colorGradingStyle: 'clean',
    zoomStyle: 'subtle',
    musicMood: 'calm',
    transitions: 'fade',
    beatSync: false,
    musicSync: false,
    vfxTypes: [],
    subtitleStyle: 'simple',
  },
  trendy: {
    name: 'trendy',
    nameHebrew: 'טרנדי',
    pacing: 'fast',
    colorGradingStyle: 'vintage',
    zoomStyle: 'punch',
    musicMood: 'trendy',
    transitions: 'glitch',
    beatSync: true,
    musicSync: true,
    vfxTypes: ['glitch', 'film-burn'],
    subtitleStyle: 'karaoke',
  },
};

/** Apply edit style preset to ExecutionPlan — overrides relevant fields */
export function applyEditStyle(plan: ExecutionPlan, styleName: string): ExecutionPlan {
  const style = EDIT_STYLES[styleName];
  if (!style) return plan;

  return {
    ...plan,
    edit: {
      ...plan.edit,
      pacing: style.pacing,
      colorGradingStyle: style.colorGradingStyle as any,
      zoomStyle: style.zoomStyle as any,
      beatSyncCuts: style.beatSync,
      musicSync: style.musicSync,
      vfxAuto: style.vfxTypes.length > 0,
      vfxTypes: style.vfxTypes as any[],
      subtitleStyle: style.subtitleStyle as any,
    },
    generate: {
      ...plan.generate,
      musicMood: style.musicMood as any,
    },
  };
}
