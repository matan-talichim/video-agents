import type { BrandKit } from '../types.js';

export interface VideoTheme {
  id: string;
  name: string;
  nameHebrew: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  subtitleStyle: {
    fontColor: string;
    backgroundColor: string;
    highlightColor: string;
    position: 'bottom' | 'center';
  };
  lowerThirdStyle: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
  ctaStyle: {
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
  };
  logoPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  logoOpacity: number;
}

export interface ThemeFFmpegParams {
  subtitleFontColor: string;
  subtitleBoxColor: string;
  subtitleHighlightColor: string;
  lowerThirdBgColor: string;
  lowerThirdTextColor: string;
  ctaBgColor: string;
  ctaTextColor: string;
  font: string;
  logoPosition: string;
  logoOpacity: number;
}

// Pre-built themes
export const BUILT_IN_THEMES: Record<string, VideoTheme> = {
  professional: {
    id: 'professional',
    name: 'professional',
    nameHebrew: 'מקצועי',
    primaryColor: '#1a1a2e',
    secondaryColor: '#7c3aed',
    font: 'Heebo',
    subtitleStyle: {
      fontColor: '#ffffff',
      backgroundColor: 'black@0.6',
      highlightColor: '#7c3aed',
      position: 'bottom',
    },
    lowerThirdStyle: {
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff',
      accentColor: '#7c3aed',
    },
    ctaStyle: {
      backgroundColor: '#7c3aed',
      textColor: '#ffffff',
      borderRadius: 8,
    },
    logoPosition: 'bottom-right',
    logoOpacity: 0.7,
  },
  bright: {
    id: 'bright',
    name: 'bright',
    nameHebrew: 'בהיר',
    primaryColor: '#ffffff',
    secondaryColor: '#3B82F6',
    font: 'Assistant',
    subtitleStyle: {
      fontColor: '#1a1a2e',
      backgroundColor: 'white@0.8',
      highlightColor: '#3B82F6',
      position: 'bottom',
    },
    lowerThirdStyle: {
      backgroundColor: '#ffffff',
      textColor: '#1a1a2e',
      accentColor: '#3B82F6',
    },
    ctaStyle: {
      backgroundColor: '#3B82F6',
      textColor: '#ffffff',
      borderRadius: 24,
    },
    logoPosition: 'top-right',
    logoOpacity: 0.8,
  },
  luxury: {
    id: 'luxury',
    name: 'luxury',
    nameHebrew: 'יוקרתי',
    primaryColor: '#0a0a0a',
    secondaryColor: '#D4AF37',
    font: 'Secular One',
    subtitleStyle: {
      fontColor: '#D4AF37',
      backgroundColor: 'black@0.7',
      highlightColor: '#FFD700',
      position: 'center',
    },
    lowerThirdStyle: {
      backgroundColor: '#0a0a0a',
      textColor: '#D4AF37',
      accentColor: '#FFD700',
    },
    ctaStyle: {
      backgroundColor: '#D4AF37',
      textColor: '#0a0a0a',
      borderRadius: 0,
    },
    logoPosition: 'bottom-left',
    logoOpacity: 0.9,
  },
  realestate: {
    id: 'realestate',
    name: 'realestate',
    nameHebrew: 'נדל"ן',
    primaryColor: '#1B2A4A',
    secondaryColor: '#4ECDC4',
    font: 'Rubik',
    subtitleStyle: {
      fontColor: '#ffffff',
      backgroundColor: '#1B2A4A@0.7',
      highlightColor: '#4ECDC4',
      position: 'bottom',
    },
    lowerThirdStyle: {
      backgroundColor: '#1B2A4A',
      textColor: '#ffffff',
      accentColor: '#4ECDC4',
    },
    ctaStyle: {
      backgroundColor: '#4ECDC4',
      textColor: '#1B2A4A',
      borderRadius: 12,
    },
    logoPosition: 'top-right',
    logoOpacity: 0.8,
  },
};

// Create custom theme from brand kit
export function createThemeFromBrandKit(brandKit: BrandKit): VideoTheme {
  return {
    id: 'custom',
    name: 'custom',
    nameHebrew: 'מותאם אישית',
    primaryColor: brandKit.primaryColor || '#1a1a2e',
    secondaryColor: brandKit.secondaryColor || '#7c3aed',
    font: brandKit.font || 'Heebo',
    subtitleStyle: {
      fontColor: '#ffffff',
      backgroundColor: `${brandKit.primaryColor || '#000000'}@0.6`,
      highlightColor: brandKit.secondaryColor || '#7c3aed',
      position: 'bottom',
    },
    lowerThirdStyle: {
      backgroundColor: brandKit.primaryColor || '#1a1a2e',
      textColor: '#ffffff',
      accentColor: brandKit.secondaryColor || '#7c3aed',
    },
    ctaStyle: {
      backgroundColor: brandKit.secondaryColor || '#7c3aed',
      textColor: '#ffffff',
      borderRadius: 8,
    },
    logoPosition: 'bottom-right',
    logoOpacity: 0.7,
  };
}

// Apply theme colors to FFmpeg subtitle/text commands
export function getThemeFFmpegParams(theme: VideoTheme): ThemeFFmpegParams {
  return {
    subtitleFontColor: theme.subtitleStyle.fontColor,
    subtitleBoxColor: theme.subtitleStyle.backgroundColor,
    subtitleHighlightColor: theme.subtitleStyle.highlightColor,
    lowerThirdBgColor: theme.lowerThirdStyle.backgroundColor,
    lowerThirdTextColor: theme.lowerThirdStyle.textColor,
    ctaBgColor: theme.ctaStyle.backgroundColor,
    ctaTextColor: theme.ctaStyle.textColor,
    font: theme.font,
    logoPosition: theme.logoPosition,
    logoOpacity: theme.logoOpacity,
  };
}
