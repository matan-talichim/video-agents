import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, OffthreadVideo, interpolate } from 'remotion';
import { VideoCompositionProps, ZoomEntry } from './types';
import { SubtitleLayer } from './components/SubtitleLayer';
import { KineticText } from './components/KineticText';
import { LowerThird } from './components/LowerThird';
import { CTAOverlay } from './components/CTAOverlay';
import { LogoWatermark } from './components/LogoWatermark';

export const VideoComposition: React.FC<VideoCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate current zoom
  const currentZoom = props.zooms.find(
    z => frame >= z.startFrame && frame <= z.endFrame
  );

  const zoomStyle = currentZoom ? {
    transform: `scale(${interpolateZoom(frame, currentZoom)})`,
    transformOrigin: `${currentZoom.centerX * 100}% ${currentZoom.centerY * 100}%`,
  } : {};

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Layer 1: Main video with zoom */}
      <AbsoluteFill style={zoomStyle}>
        <OffthreadVideo
          src={props.videoSrc}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Layer 2: B-Roll overlays */}
      {props.brollClips.map((clip, i) => (
        <Sequence
          key={`broll-${i}`}
          from={clip.startFrame}
          durationInFrames={clip.durationFrames}
        >
          <AbsoluteFill>
            <OffthreadVideo
              src={clip.src}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* Layer 3: Subtitles */}
      {props.subtitles.map((sub, i) => (
        <Sequence
          key={`sub-${i}`}
          from={sub.startFrame}
          durationInFrames={sub.endFrame - sub.startFrame}
        >
          <SubtitleLayer
            entry={sub}
            style={props.subtitleStyle}
            brandKit={props.brandKit}
          />
        </Sequence>
      ))}

      {/* Layer 4: Kinetic typography */}
      {props.kineticTexts.map((kt, i) => (
        <Sequence
          key={`kinetic-${i}`}
          from={kt.startFrame}
          durationInFrames={kt.endFrame - kt.startFrame}
        >
          <KineticText entry={kt} brandKit={props.brandKit} />
        </Sequence>
      ))}

      {/* Layer 5: Lower third */}
      {props.lowerThird && (
        <Sequence
          from={props.lowerThird.startFrame}
          durationInFrames={props.lowerThird.durationFrames}
        >
          <LowerThird config={props.lowerThird} brandKit={props.brandKit} />
        </Sequence>
      )}

      {/* Layer 6: CTA */}
      {props.cta && (
        <Sequence
          from={props.cta.startFrame}
          durationInFrames={props.cta.durationFrames}
        >
          <CTAOverlay config={props.cta} brandKit={props.brandKit} />
        </Sequence>
      )}

      {/* Layer 7: Logo */}
      {props.logo && (
        <LogoWatermark config={props.logo} totalFrames={props.durationInFrames} />
      )}
    </AbsoluteFill>
  );
};

// Smooth zoom interpolation with easing
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
