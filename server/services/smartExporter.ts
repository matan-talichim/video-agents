// server/services/smartExporter.ts
// Platform-optimized export settings for all major social platforms.

export interface ExportPreset {
  name: string;
  resolution: string;
  bitrate: string;
  audioBitrate: string;
  crf: number;
  fps: number;
  codec: string;
  maxFileSize?: string;
}

export const EXPORT_PRESETS: Record<string, ExportPreset> = {
  'youtube': {
    name: 'YouTube',
    resolution: '1920:1080',
    bitrate: '12M',
    audioBitrate: '256k',
    crf: 18,
    fps: 30,
    codec: 'libx264',
  },
  'youtube-4k': {
    name: 'YouTube 4K',
    resolution: '3840:2160',
    bitrate: '35M',
    audioBitrate: '384k',
    crf: 15,
    fps: 30,
    codec: 'libx264',
  },
  'instagram-reels': {
    name: 'Instagram Reels',
    resolution: '1080:1920',
    bitrate: '3500k',
    audioBitrate: '128k',
    crf: 23,
    fps: 30,
    codec: 'libx264',
    maxFileSize: '100M',
  },
  'tiktok': {
    name: 'TikTok',
    resolution: '1080:1920',
    bitrate: '6M',
    audioBitrate: '128k',
    crf: 20,
    fps: 30,
    codec: 'libx264',
    maxFileSize: '287M',
  },
  'linkedin': {
    name: 'LinkedIn',
    resolution: '1920:1080',
    bitrate: '5M',
    audioBitrate: '192k',
    crf: 22,
    fps: 30,
    codec: 'libx264',
    maxFileSize: '200M',
  },
  'facebook': {
    name: 'Facebook',
    resolution: '1920:1080',
    bitrate: '8M',
    audioBitrate: '192k',
    crf: 20,
    fps: 30,
    codec: 'libx264',
    maxFileSize: '4G',
  },
};

export function getExportCommand(inputPath: string, outputPath: string, platform: string): string {
  const preset = EXPORT_PRESETS[platform] || EXPORT_PRESETS['youtube'];

  return `ffmpeg -i "${inputPath}" -vf "scale=${preset.resolution}:flags=lanczos" -c:v ${preset.codec} -b:v ${preset.bitrate} -crf ${preset.crf} -r ${preset.fps} -c:a aac -b:a ${preset.audioBitrate} -movflags +faststart -y "${outputPath}"`;
}
