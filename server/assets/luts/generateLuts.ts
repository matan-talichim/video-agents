import fs from 'fs';
import path from 'path';

function generateLUT(name: string, transform: (r: number, g: number, b: number) => [number, number, number]): string {
  let content = `TITLE "${name}"\nLUT_3D_SIZE 17\n`;
  for (let b = 0; b < 17; b++) {
    for (let g = 0; g < 17; g++) {
      for (let r = 0; r < 17; r++) {
        const [ro, go, bo] = transform(r / 16, g / 16, b / 16);
        content += `${ro.toFixed(6)} ${go.toFixed(6)} ${bo.toFixed(6)}\n`;
      }
    }
  }
  return content;
}

// Cinematic: warm shadows, teal highlights
const cinematic = generateLUT('Cinematic', (r, g, b) => [
  Math.min(1, r * 1.1 + 0.02),
  Math.min(1, g * 0.95),
  Math.min(1, b * 0.9 + 0.05),
]);

// Bright: lifted shadows, vibrant
const bright = generateLUT('Bright', (r, g, b) => [
  Math.min(1, r * 1.1 + 0.05),
  Math.min(1, g * 1.1 + 0.05),
  Math.min(1, b * 1.05 + 0.05),
]);

// Moody: crushed blacks, desaturated
const moody = generateLUT('Moody', (r, g, b) => [
  Math.min(1, Math.max(0.05, r * 0.85)),
  Math.min(1, Math.max(0.05, g * 0.8)),
  Math.min(1, Math.max(0.05, b * 0.85)),
]);

// Vintage: faded, warm tones
const vintage = generateLUT('Vintage', (r, g, b) => [
  Math.min(1, r * 0.9 + 0.1),
  Math.min(1, g * 0.85 + 0.08),
  Math.min(1, b * 0.75 + 0.06),
]);

// Clean: neutral, balanced
const clean = generateLUT('Clean', (r, g, b) => [r, g, b]);

const lutsDir = path.dirname(new URL(import.meta.url).pathname);
fs.writeFileSync(path.join(lutsDir, 'cinematic.cube'), cinematic);
fs.writeFileSync(path.join(lutsDir, 'bright.cube'), bright);
fs.writeFileSync(path.join(lutsDir, 'moody.cube'), moody);
fs.writeFileSync(path.join(lutsDir, 'vintage.cube'), vintage);
fs.writeFileSync(path.join(lutsDir, 'clean.cube'), clean);

console.log('LUT files generated successfully in', lutsDir);
