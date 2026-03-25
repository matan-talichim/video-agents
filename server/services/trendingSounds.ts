import fs from 'fs';
import path from 'path';

interface TrendingSound {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  mood: string;
  platform: 'instagram' | 'tiktok' | 'both';
  filePath: string;
}

// Curated trending sounds list (updated manually for now)
const TRENDING_SOUNDS: TrendingSound[] = [
  { id: 'trend_1', name: 'Trending Beat 1', artist: 'Various', bpm: 130, mood: 'energetic', platform: 'both', filePath: 'server/assets/music/trendy_01.mp3' },
  { id: 'trend_2', name: 'Trending Beat 2', artist: 'Various', bpm: 100, mood: 'calm', platform: 'instagram', filePath: 'server/assets/music/trendy_02.mp3' },
  { id: 'trend_3', name: 'Trending Beat 3', artist: 'Various', bpm: 140, mood: 'energetic', platform: 'tiktok', filePath: 'server/assets/music/energetic_01.mp3' },
];

// Get trending sounds for a platform
export function getTrendingSounds(platform?: string): TrendingSound[] {
  if (!platform) return TRENDING_SOUNDS;
  return TRENDING_SOUNDS.filter(s => s.platform === platform || s.platform === 'both');
}

// Get best matching trending sound for a mood
export function getBestTrendingSound(mood: string, platform?: string): TrendingSound | null {
  const available = getTrendingSounds(platform);
  const match = available.find(s => s.mood === mood);
  return match || available[0] || null;
}

// API endpoint data
export function getTrendingSoundsForAPI(): any[] {
  return TRENDING_SOUNDS.map(s => ({
    id: s.id,
    name: s.name,
    artist: s.artist,
    bpm: s.bpm,
    mood: s.mood,
    platform: s.platform,
  }));
}
