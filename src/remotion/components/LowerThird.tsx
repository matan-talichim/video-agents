import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { LowerThirdConfig, BrandKitConfig } from '../types';

interface Props {
  config: LowerThirdConfig;
  brandKit?: BrandKitConfig;
}

export const LowerThird: React.FC<Props> = ({ config, brandKit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = brandKit?.accentColor || config.accentColor || '#7c3aed';
  const fontFamily = brandKit?.fontFamily || 'Heebo, sans-serif';

  // Slide in animation
  const slideIn = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Slide out animation (last 15 frames)
  const slideOut = config.durationFrames - frame < 15
    ? interpolate(frame, [config.durationFrames - 15, config.durationFrames], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  const translateX = config.position === 'bottom-right'
    ? interpolate(slideIn, [0, 1], [300, 0]) + slideOut
    : interpolate(slideIn, [0, 1], [-300, 0]) - slideOut;

  const isRight = config.position === 'bottom-right';

  return (
    <div style={{
      position: 'absolute',
      bottom: 100,
      [isRight ? 'right' : 'left']: 30,
      transform: `translateX(${translateX}px)`,
      direction: 'rtl',
    }}>
      {config.style === 'glass' ? (
        // Glass blur style
        <div style={{
          padding: '14px 24px',
          borderRadius: 12,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: isRight ? 'none' : `3px solid ${accentColor}`,
          borderRight: isRight ? `3px solid ${accentColor}` : 'none',
        }}>
          <div style={{ fontFamily, fontSize: 20, fontWeight: 600, color: '#ffffff', marginBottom: 2 }}>
            {config.name}
          </div>
          <div style={{ fontFamily, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            {config.title}
          </div>
        </div>
      ) : config.style === 'accent-bar' ? (
        // Accent bar style
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
        }}>
          <div style={{
            width: 4,
            backgroundColor: accentColor,
            borderRadius: 2,
          }} />
          <div style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#ffffff' }}>
              {config.name}
            </div>
            <div style={{ fontFamily, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              {config.title}
            </div>
          </div>
        </div>
      ) : (
        // Solid style
        <div style={{
          padding: '12px 20px',
          backgroundColor: accentColor,
          borderRadius: 8,
        }}>
          <div style={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#ffffff' }}>
            {config.name}
          </div>
          <div style={{ fontFamily, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            {config.title}
          </div>
        </div>
      )}
    </div>
  );
};
