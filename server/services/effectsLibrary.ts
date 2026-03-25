export interface EffectPreset {
  id: string;
  name: string;
  nameHebrew: string;
  category: 'looks' | 'transitions' | 'shakes' | 'overlays' | 'text-effects';
  ffmpegFilter: string;
  thumbnailDescription: string;
}

export const EFFECTS_LIBRARY: EffectPreset[] = [
  // Looks
  { id: 'look_cinematic', name: 'Cinematic', nameHebrew: 'סינמטי', category: 'looks', ffmpegFilter: "lut3d='server/assets/luts/cinematic.cube'", thumbnailDescription: 'Warm shadows, teal highlights' },
  { id: 'look_bright', name: 'Bright', nameHebrew: 'בהיר', category: 'looks', ffmpegFilter: "lut3d='server/assets/luts/bright.cube'", thumbnailDescription: 'Lifted shadows, vibrant colors' },
  { id: 'look_moody', name: 'Moody', nameHebrew: 'מודי', category: 'looks', ffmpegFilter: "lut3d='server/assets/luts/moody.cube'", thumbnailDescription: 'Crushed blacks, desaturated' },
  { id: 'look_vintage', name: 'Vintage', nameHebrew: 'וינטג׳', category: 'looks', ffmpegFilter: "lut3d='server/assets/luts/vintage.cube'", thumbnailDescription: 'Faded, warm tones' },
  { id: 'look_bw', name: 'Black & White', nameHebrew: 'שחור לבן', category: 'looks', ffmpegFilter: "hue=s=0", thumbnailDescription: 'Classic monochrome' },

  // Transitions
  { id: 'trans_fade', name: 'Fade', nameHebrew: 'דעיכה', category: 'transitions', ffmpegFilter: 'fade=t=out:st=DURATION-1:d=1', thumbnailDescription: 'Smooth fade to black' },
  { id: 'trans_flash', name: 'Flash', nameHebrew: 'הבזק', category: 'transitions', ffmpegFilter: "geq=lum='if(between(t,TIMESTAMP,TIMESTAMP+0.1),255,lum(X,Y))'", thumbnailDescription: 'White flash between cuts' },

  // Shakes
  { id: 'shake_subtle', name: 'Subtle Shake', nameHebrew: 'רעידה עדינה', category: 'shakes', ffmpegFilter: "crop=iw-10:ih-10:5+random(0)*5:5+random(1)*5", thumbnailDescription: 'Gentle camera movement' },
  { id: 'shake_strong', name: 'Strong Shake', nameHebrew: 'רעידה חזקה', category: 'shakes', ffmpegFilter: "crop=iw-20:ih-20:10+random(0)*10:10+random(1)*10", thumbnailDescription: 'Intense camera shake' },

  // Overlays
  { id: 'overlay_grain', name: 'Film Grain', nameHebrew: 'גרעיניות', category: 'overlays', ffmpegFilter: "noise=alls=15:allf=t", thumbnailDescription: 'Analog film texture' },
  { id: 'overlay_crt', name: 'CRT/Retro', nameHebrew: 'רטרו', category: 'overlays', ffmpegFilter: "rgbashift=rh=-2:bh=2,noise=alls=12:allf=t,curves=vintage", thumbnailDescription: 'Old TV screen look' },
  { id: 'overlay_glitch', name: 'Glitch', nameHebrew: 'גליץ׳', category: 'overlays', ffmpegFilter: "rgbashift=rh=-5:rv=3:bh=5:bv=-3,noise=alls=20:allf=t", thumbnailDescription: 'Digital distortion' },
  { id: 'overlay_vignette', name: 'Vignette', nameHebrew: 'ויניטה', category: 'overlays', ffmpegFilter: "vignette=PI/4", thumbnailDescription: 'Dark edges, bright center' },
];

// Get effects by category
export function getEffectsByCategory(category: string): EffectPreset[] {
  return EFFECTS_LIBRARY.filter(e => e.category === category);
}

// Get all effects for API
export function getAllEffects(): EffectPreset[] {
  return EFFECTS_LIBRARY;
}

// Apply an effect to a video
export function getEffectCommand(effectId: string, inputPath: string, outputPath: string): string | null {
  const effect = EFFECTS_LIBRARY.find(e => e.id === effectId);
  if (!effect) return null;

  return `ffmpeg -i "${inputPath}" -vf "${effect.ffmpegFilter}" -c:a copy -y "${outputPath}"`;
}
