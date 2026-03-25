import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BrandKitConfig } from '../types';

interface PriceTagConfig {
  price: string;
  originalPrice?: string;
  currency: string;
  discountBadge?: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

interface Props {
  config: PriceTagConfig;
  brandKit?: BrandKitConfig;
}

export const PriceTag: React.FC<Props> = ({ config, brandKit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = brandKit?.accentColor || '#7c3aed';
  const fontFamily = brandKit?.fontFamily || 'Heebo, sans-serif';

  // Entry animation
  const entrySpring = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const scale = interpolate(entrySpring, [0, 1], [0.5, 1]);
  const opacity = interpolate(entrySpring, [0, 1], [0, 1]);

  const positionMap: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 30, right: 30 },
    'bottom-left': { bottom: 30, left: 30 },
    'top-right': { top: 30, right: 30 },
    'top-left': { top: 30, left: 30 },
  };

  return (
    <div style={{
      position: 'absolute',
      ...positionMap[config.position],
      transform: `scale(${scale})`,
      opacity,
      direction: 'rtl',
    }}>
      <div style={{
        padding: '12px 20px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: 10,
        border: `2px solid ${accentColor}`,
      }}>
        {config.discountBadge && (
          <div style={{
            position: 'absolute',
            top: -10,
            right: -10,
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            fontFamily,
            padding: '2px 8px',
            borderRadius: 20,
          }}>
            {config.discountBadge}
          </div>
        )}
        {config.originalPrice && (
          <div style={{
            fontFamily,
            fontSize: 16,
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'line-through',
          }}>
            {config.currency}{config.originalPrice}
          </div>
        )}
        <div style={{
          fontFamily,
          fontSize: 32,
          fontWeight: 800,
          color: accentColor,
        }}>
          {config.currency}{config.price}
        </div>
      </div>
    </div>
  );
};
