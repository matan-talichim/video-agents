import fs from 'fs';
import path from 'path';
import { askClaude } from './claude.js';
import type { TranscriptResult } from '../types.js';

// Hebrew filler words to exclude from subtitles
const HEBREW_FILLERS = new Set(['אה', 'אמ', 'כאילו', 'נו', 'אהה', 'אממ', 'כזה', 'כזאת']);

// Minimum confidence threshold for including a word in subtitles
const MIN_CONFIDENCE = 0.7;

interface SubtitleGroup {
  words: Array<{word: string; start: number; end: number}>;
  start: number;
  end: number;
}

// Filter transcript words for subtitle use:
// - Remove low-confidence words (Deepgram unsure)
// - Remove Hebrew filler words
// - Keep ORIGINAL Deepgram text — never rewrite/modify
function filterWordsForSubtitles(
  words: Array<{word: string; start: number; end: number; confidence?: number}>
): Array<{word: string; start: number; end: number}> {
  return words.filter(w => {
    // Skip low-confidence words
    if (typeof w.confidence === 'number' && w.confidence < MIN_CONFIDENCE) return false;
    // Skip filler words
    if (HEBREW_FILLERS.has(w.word.replace(/[.!?,]/g, ''))) return false;
    // Skip empty/whitespace
    if (!w.word.trim()) return false;
    return true;
  });
}

// Convert transcript to SRT format using Deepgram word-level timestamps.
// Uses 2-word groups for tight speech sync — each subtitle matches exactly when words are spoken.
export function generateSRT(transcript: TranscriptResult, outputPath: string): string {
  // Use RAW Deepgram words with confidence filtering — don't use rewritten text
  const filteredWords = filterWordsForSubtitles(transcript.words);

  const lines: string[] = [];
  let subtitleIndex = 1;

  // Group into pairs (2 words per subtitle) using exact Deepgram timestamps
  for (let i = 0; i < filteredWords.length; i += 2) {
    const word1 = filteredWords[i];
    const word2 = filteredWords[i + 1];

    const startTime = word1.start;
    const endTime = word2 ? word2.end : word1.end;
    const text = word2 ? `${word1.word} ${word2.word}` : word1.word;

    lines.push(`${subtitleIndex}`);
    lines.push(`${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}`);
    lines.push(text);
    lines.push('');

    subtitleIndex++;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  return outputPath;
}

// Get keywords to highlight per subtitle line
export async function getKeywordsForHighlight(transcript: TranscriptResult): Promise<Map<number, string[]>> {
  const filteredWords = filterWordsForSubtitles(transcript.words);
  const groups = groupWordsForSubtitles(filteredWords);
  const subtitleTexts = groups.map((g, i) => `${i}: "${g.words.map(w => w.word).join(' ')}"`).join('\n');

  const response = await askClaude(
    'You pick keywords to highlight in Hebrew video subtitles.',
    `For each subtitle line below, pick 1-2 keywords that should be highlighted (most important words). Return JSON: { "0": ["word1"], "1": ["word1", "word2"], ... }\n\n${subtitleTexts}`
  );

  try {
    const keywords = JSON.parse(response);
    const map = new Map<number, string[]>();
    for (const [key, value] of Object.entries(keywords)) {
      map.set(parseInt(key), value as string[]);
    }
    return map;
  } catch {
    return new Map();
  }
}

// Group transcript words into subtitle lines.
// Shows 2 words at a time for word-by-word sync (social/reels style).
// Uses exact Deepgram timestamps for precise speech synchronization.
function groupWordsForSubtitles(words: Array<{word: string; start: number; end: number}>): SubtitleGroup[] {
  const groups: SubtitleGroup[] = [];

  for (let i = 0; i < words.length; i += 2) {
    const word1 = words[i];
    const word2 = words[i + 1];

    const group: SubtitleGroup = {
      words: word2 ? [word1, word2] : [word1],
      start: word1.start,
      end: word2 ? word2.end : word1.end,
    };
    groups.push(group);
  }

  return groups;
}

// Format time for SRT (HH:MM:SS,mmm)
function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n: number): string { return n.toString().padStart(2, '0'); }
function pad3(n: number): string { return n.toString().padStart(3, '0'); }
