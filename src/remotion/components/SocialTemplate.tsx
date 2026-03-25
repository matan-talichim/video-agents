import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { BrandKitConfig } from '../types';

type SocialType = 'whatsapp' | 'instagram-dm' | 'notification';

interface SocialTemplateConfig {
  type: SocialType;
  senderName: string;
  message: string;
  avatar?: string;
  startFrame: number;
  durationFrames: number;
}

interface Props {
  config: SocialTemplateConfig;
  brandKit?: BrandKitConfig;
}

export const SocialTemplate: React.FC<Props> = ({ config, brandKit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fontFamily = brandKit?.fontFamily || 'Heebo, sans-serif';

  // Slide in from top
  const slideSpring = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const translateY = interpolate(slideSpring, [0, 1], [-100, 0]);
  const opacity = interpolate(slideSpring, [0, 1], [0, 1]);

  // Slide out at end
  const slideOutOffset = config.durationFrames - frame < 10
    ? interpolate(frame, [config.durationFrames - 10, config.durationFrames], [0, -100], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  if (config.type === 'whatsapp') {
    return (
      <div style={{
        position: 'absolute',
        top: 40,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY + slideOutOffset}px)`,
        opacity,
        direction: 'rtl',
        width: 400,
      }}>
        <div style={{
          backgroundColor: '#1a2e1a',
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#25d366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#ffffff',
              fontFamily,
            }}>
              {config.senderName.charAt(0)}
            </div>
            <div style={{ fontFamily, fontSize: 14, fontWeight: 600, color: '#25d366' }}>
              {config.senderName}
            </div>
          </div>
          <div style={{ fontFamily, fontSize: 15, color: '#e0e0e0', lineHeight: 1.4 }}>
            {config.message}
          </div>
        </div>
      </div>
    );
  }

  if (config.type === 'instagram-dm') {
    return (
      <div style={{
        position: 'absolute',
        top: 40,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY + slideOutOffset}px)`,
        opacity,
        direction: 'rtl',
        width: 380,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
          borderRadius: 14,
          padding: 2,
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            borderRadius: 12,
            padding: '12px 16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily,
              }}>
                {config.senderName.charAt(0)}
              </div>
              <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                {config.senderName}
              </div>
            </div>
            <div style={{ fontFamily, fontSize: 14, color: '#d0d0d0', lineHeight: 1.4 }}>
              {config.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // notification style
  return (
    <div style={{
      position: 'absolute',
      top: 30,
      left: '50%',
      transform: `translateX(-50%) translateY(${translateY + slideOutOffset}px)`,
      opacity,
      direction: 'rtl',
      width: 360,
    }}>
      <div style={{
        backgroundColor: 'rgba(30,30,50,0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 4,
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: brandKit?.accentColor || '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily,
          }}>
            {config.senderName.charAt(0)}
          </div>
          <div style={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
            {config.senderName}
          </div>
          <div style={{ fontFamily, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginRight: 'auto' }}>
            עכשיו
          </div>
        </div>
        <div style={{ fontFamily, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
          {config.message}
        </div>
      </div>
    </div>
  );
};
