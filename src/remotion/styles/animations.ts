import { interpolate, spring } from 'remotion';

// Shared easing functions and animation helpers

export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function fadeIn(frame: number, durationFrames: number = 5): number {
  return interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: 'clamp' });
}

export function fadeOut(frame: number, totalFrames: number, durationFrames: number = 5): number {
  return interpolate(
    frame,
    [totalFrames - durationFrames, totalFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
}

export function slideIn(frame: number, fps: number, from: 'left' | 'right' | 'top' | 'bottom', distance: number = 100): number {
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const offset = interpolate(s, [0, 1], [distance, 0]);
  return offset;
}

export function pulseScale(frame: number, baseScale: number = 1, amplitude: number = 0.03, speed: number = 0.08): number {
  return baseScale + Math.sin(frame * speed) * amplitude;
}

export function bounceIn(frame: number, fps: number): number {
  return spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.8 },
  });
}
