import React from 'react';
import { useCurrentFrame, interpolate, Img } from 'remotion';
import { LogoConfig } from '../types';

interface Props {
  config: LogoConfig;
  totalFrames: number;
}

export const LogoWatermark: React.FC<Props> = ({ config, totalFrames }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, config.fadeInFrames],
    [0, config.opacity],
    { extrapolateRight: 'clamp' }
  );

  const positionMap: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
  };

  return (
    <div style={{
      position: 'absolute',
      ...positionMap[config.position],
      opacity,
    }}>
      <Img
        src={config.src}
        style={{ width: config.size, height: 'auto' }}
      />
    </div>
  );
};
