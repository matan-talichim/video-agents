import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { CTAConfig, BrandKitConfig } from '../types';

interface Props {
  config: CTAConfig;
  brandKit?: BrandKitConfig;
}

export const CTAOverlay: React.FC<Props> = ({ config, brandKit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgColor = brandKit?.secondaryColor || config.backgroundColor || '#7c3aed';
  const textColor = config.textColor || '#ffffff';
  const fontFamily = brandKit?.fontFamily || 'Heebo, sans-serif';

  // Entry animation
  const entrySpring = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });

  // Pulse animation (continuous after entry)
  const pulseScale = frame > 15
    ? 1 + Math.sin(frame * 0.08) * 0.03
    : interpolate(entrySpring, [0, 1], [0.5, 1]);

  const opacity = interpolate(entrySpring, [0, 1], [0, 1]);

  const isCenter = config.position === 'center';

  return (
    <div style={{
      position: 'absolute',
      ...(isCenter
        ? { top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${pulseScale})` }
        : { bottom: 100, left: '50%', transform: `translateX(-50%) scale(${pulseScale})` }),
      opacity,
      direction: 'rtl',
    }}>
      <div style={{
        padding: '16px 40px',
        backgroundColor: bgColor,
        borderRadius: 12,
        boxShadow: `0 4px 24px ${bgColor}60`,
      }}>
        <span style={{
          fontFamily,
          fontSize: 28,
          fontWeight: 700,
          color: textColor,
          letterSpacing: '-0.01em',
        }}>
          {config.text}
        </span>
      </div>
    </div>
  );
};
