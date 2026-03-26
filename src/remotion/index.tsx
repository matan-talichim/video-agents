import { registerRoot } from 'remotion';
import { Composition } from 'remotion';
import React from 'react';
import { VideoComposition } from './VideoComposition';
import { VideoCompositionProps } from './types';

// Default props for preview
const defaultProps: VideoCompositionProps = {
  videoSrc: '', // will be set at render time
  durationInFrames: 900, // 30 seconds at 30fps
  fps: 30,
  width: 1920,
  height: 1080,
  subtitles: [
    {
      text: 'שלום, ברוכים הבאים לסרטון שלנו',
      startFrame: 30,
      endFrame: 150,
      words: [
        { word: 'שלום,', startFrame: 30, endFrame: 50 },
        { word: 'ברוכים', startFrame: 55, endFrame: 75 },
        { word: 'הבאים', startFrame: 80, endFrame: 100 },
        { word: 'לסרטון', startFrame: 105, endFrame: 125 },
        { word: 'שלנו', startFrame: 130, endFrame: 150 },
      ],
      highlightWords: ['שלום'],
    },
  ],
  subtitleStyle: {
    template: 'word-by-word',
    fontSize: 42,
    fontFamily: 'Heebo, sans-serif',
    color: '#ffffff',
    highlightColor: '#7c3aed',
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'bottom',
  },
  kineticTexts: [],
  zooms: [],
  brollClips: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainComposition"
        component={VideoComposition}
        durationInFrames={defaultProps.durationInFrames}
        fps={defaultProps.fps}
        width={defaultProps.width}
        height={defaultProps.height}
        defaultProps={defaultProps}
      />
      <Composition
        id="VerticalComposition"
        component={VideoComposition}
        durationInFrames={defaultProps.durationInFrames}
        fps={defaultProps.fps}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};

registerRoot(RemotionRoot);
