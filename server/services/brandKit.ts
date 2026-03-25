import fs from 'fs';
import path from 'path';
import type { BrandKit } from '../types.js';

const BRAND_KIT_DIR = 'data/brand-kits';

// Save brand kit to disk
export function saveBrandKit(userId: string, kit: BrandKit): BrandKit {
  fs.mkdirSync(BRAND_KIT_DIR, { recursive: true });
  const filePath = path.join(BRAND_KIT_DIR, `${userId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(kit, null, 2));
  console.log(`[Brand Kit] Saved for user ${userId}`);
  return kit;
}

// Load brand kit from disk
export function loadBrandKit(userId: string): BrandKit | null {
  const filePath = path.join(BRAND_KIT_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Apply brand kit to execution plan
export function applyBrandKitToPlan(plan: any, kit: BrandKit): void {
  if (!kit.enabled) return;

  // Set theme colors
  if (plan.export) {
    plan.export.customTheme = true;
    plan.export.themeColors = {
      primary: kit.primaryColor,
      secondary: kit.secondaryColor,
    };
    plan.export.themeFont = kit.font;
  }

  // Set logo
  if (kit.logoFile && plan.edit) {
    plan.edit.logoWatermark = true;
    plan.edit.logoFile = kit.logoFile;
  }
}

// Generate brand-aware prompt prefix
export function getBrandPromptPrefix(kit: BrandKit): string {
  if (!kit.enabled) return '';
  return `Brand style: professional, using colors ${kit.primaryColor} and ${kit.secondaryColor}, ${kit.font} font. `;
}
