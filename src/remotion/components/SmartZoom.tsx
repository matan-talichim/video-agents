import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { ZoomEntry } from '../types';

interface Props {
  zoom: ZoomEntry;
  children: React.ReactNode;
}

// Smooth zoom interpolation with ease in-out cubic
function interpolateZoom(frame: number, zoom: ZoomEntry): number {
  const progress = (frame - zoom.startFrame) / (zoom.endFrame - zoom.startFrame);

  // Ease in-out cubic
  const eased = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  // Zoom in first half, zoom out second half
  if (progress < 0.5) {
    return 1 + (zoom.zoomFactor - 1) * (eased * 2);
  } else {
    return zoom.zoomFactor - (zoom.zoomFactor - 1) * ((eased - 0.5) * 2);
  }
}

export const SmartZoom: React.FC<Props> = ({ zoom, children }) => {
  const frame = useCurrentFrame();

  const isActive = frame >= zoom.startFrame && frame <= zoom.endFrame;

  if (!isActive) {
    return <>{children}</>;
  }

  const scale = interpolateZoom(frame, zoom);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      transform: `scale(${scale})`,
      transformOrigin: `${zoom.centerX * 100}% ${zoom.centerY * 100}%`,
    }}>
      {children}
    </div>
  );
};

export { interpolateZoom };
