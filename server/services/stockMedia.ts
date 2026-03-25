import fs from 'fs';
import path from 'path';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export interface StockVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  previewUrl: string;
  downloadUrl: string;
}

export interface StockImage {
  id: number;
  url: string;
  thumbnailUrl: string;
}

// Search for stock videos
export async function searchVideos(query: string, count: number = 3): Promise<StockVideo[]> {
  console.log(`[Pexels] Searching videos: "${query}"`);

  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
    { headers: { 'Authorization': PEXELS_API_KEY! } }
  );

  if (!response.ok) {
    throw new Error(`Pexels video search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.videos || []).map((v: any) => ({
    id: v.id,
    width: v.width,
    height: v.height,
    duration: v.duration,
    previewUrl: v.video_pictures?.[0]?.picture || '',
    downloadUrl: v.video_files
      ?.filter((f: any) => f.quality === 'hd' || f.quality === 'sd')
      .sort((a: any, b: any) => b.width - a.width)?.[0]?.link || '',
  }));
}

// Search for stock images
export async function searchImages(query: string, count: number = 3): Promise<StockImage[]> {
  console.log(`[Pexels] Searching images: "${query}"`);

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
    { headers: { 'Authorization': PEXELS_API_KEY! } }
  );

  if (!response.ok) {
    throw new Error(`Pexels image search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.photos || []).map((p: any) => ({
    id: p.id,
    url: p.src?.large2x || p.src?.large || '',
    thumbnailUrl: p.src?.medium || '',
  }));
}

// Download media file to local path
export async function downloadMedia(url: string, outputPath: string): Promise<string> {
  if (!url) throw new Error('No download URL provided');

  console.log(`[Pexels] Downloading: ${url.slice(0, 80)}...`);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pexels download failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}
