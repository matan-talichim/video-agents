import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { VideoCompositionProps } from './types';

export async function renderVideo(
  props: VideoCompositionProps,
  outputPath: string,
  compositionId: string = 'MainComposition'
): Promise<string> {
  console.log(`[Remotion] Starting render: ${compositionId} → ${outputPath}`);
  const startTime = Date.now();

  // Bundle the Remotion project
  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/remotion/index.tsx'),
    webpackOverride: (config) => config,
  });

  // Select the composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: props,
  });

  // Render
  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: props.durationInFrames,
      fps: props.fps,
      width: props.width,
      height: props.height,
    },
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
    onProgress: (progress) => {
      if (progress.renderedFrames % 30 === 0) {
        console.log(`[Remotion] Rendering: ${Math.round(progress.renderedFrames / props.durationInFrames * 100)}%`);
      }
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Remotion] Render complete in ${elapsed}s → ${outputPath}`);
  return outputPath;
}
