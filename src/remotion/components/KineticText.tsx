import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { KineticTextEntry, BrandKitConfig } from '../types';

interface Props {
  entry: KineticTextEntry;
  brandKit?: BrandKitConfig;
}

export const KineticText: React.FC<Props> = ({ entry, brandKit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const color = brandKit?.accentColor || entry.color || '#ffffff';
  const fontFamily = brandKit?.fontFamily || 'Heebo, sans-serif';

  const positionStyle = getKineticPosition(entry.position);
  const animationStyle = getAnimationStyle(entry.animation, frame, fps, entry.fontSize);

  return (
    <div style={{
      ...positionStyle,
      direction: 'rtl',
    }}>
      <div style={{
        ...animationStyle,
        fontSize: entry.fontSize,
        fontFamily,
        fontWeight: 800,
        color,
        textShadow: '0 4px 16px rgba(0,0,0,0.4)',
        letterSpacing: '-0.02em',
      }}>
        {entry.animation === 'explode' ? (
          // Each character animates separately
          entry.text.split('').map((char, i) => {
            const delay = i * 2;
            const charSpring = spring({
              frame: frame - delay,
              fps,
              config: { damping: 10, stiffness: 200 },
            });

            const angle = (i - entry.text.length / 2) * 30;
            const distance = interpolate(charSpring, [0, 1], [200, 0]);
            const rotation = interpolate(charSpring, [0, 1], [angle, 0]);
            const opacity = interpolate(charSpring, [0, 0.3, 1], [0, 1, 1]);

            return (
              <span key={i} style={{
                display: 'inline-block',
                transform: `translate(${Math.cos(angle * Math.PI/180) * distance}px, ${Math.sin(angle * Math.PI/180) * distance}px) rotate(${rotation}deg)`,
                opacity,
              }}>
                {char}
              </span>
            );
          })
        ) : entry.animation === 'wave' ? (
          // Each character waves
          entry.text.split('').map((char, i) => {
            const waveY = Math.sin((frame * 0.15) + i * 0.5) * 10;
            return (
              <span key={i} style={{
                display: 'inline-block',
                transform: `translateY(${waveY}px)`,
              }}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })
        ) : (
          entry.text
        )}
      </div>
    </div>
  );
};

function getAnimationStyle(animation: string, frame: number, fps: number, fontSize: number): React.CSSProperties {
  switch (animation) {
    case 'bounce': {
      const s = spring({ frame, fps, config: { damping: 8, stiffness: 150, mass: 0.8 } });
      const y = interpolate(s, [0, 1], [100, 0]);
      return { transform: `translateY(${y}px) scale(${s})`, opacity: s };
    }
    case 'scale-up': {
      const s = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
      return { transform: `scale(${interpolate(s, [0, 1], [0.3, 1])})`, opacity: s };
    }
    case 'slide-up': {
      const s = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
      const y = interpolate(s, [0, 1], [60, 0]);
      return { transform: `translateY(${y}px)`, opacity: s };
    }
    case 'shake': {
      const shakeX = Math.sin(frame * 0.8) * 3;
      const shakeY = Math.cos(frame * 0.6) * 2;
      const entryOpacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });
      return { transform: `translate(${shakeX}px, ${shakeY}px)`, opacity: entryOpacity };
    }
    case 'typewriter': {
      const progress = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
      return { opacity: 1, clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` };
    }
    default:
      return { opacity: interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' }) };
  }
}

function getKineticPosition(pos: KineticTextEntry['position']): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', display: 'flex' };

  const xMap = { center: { left: 0, right: 0, justifyContent: 'center' as const }, left: { left: 40 }, right: { right: 40 } };
  const yMap = { center: { top: '50%', transform: 'translateY(-50%)' }, top: { top: 80 }, bottom: { bottom: 120 } };

  return { ...base, ...xMap[pos.x], ...yMap[pos.y] };
}
