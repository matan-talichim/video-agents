import fs from 'fs';
import path from 'path';
import { askClaude } from './claude.js';
import type { TranscriptResult } from '../types.js';

interface SubtitleGroup {
  words: Array<{word: string; start: number; end: number}>;
  start: number;
  end: number;
}

// Convert transcript to SRT format
export function generateSRT(transcript: TranscriptResult, outputPath: string): string {
  const lines: string[] = [];
  let subtitleIndex = 1;

  // Group words into subtitle lines (max 8 words or 3 seconds per line)
  const groups = groupWordsForSubtitles(transcript.words);

  for (const group of groups) {
    const startTime = formatSRTTime(group.start);
    const endTime = formatSRTTime(group.end);
    const text = group.words.map(w => w.word).join(' ');

    lines.push(`${subtitleIndex}`);
    lines.push(`${startTime} --> ${endTime}`);
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
  const groups = groupWordsForSubtitles(transcript.words);
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

// Group transcript words into subtitle lines
function groupWordsForSubtitles(words: Array<{word: string; start: number; end: number}>): SubtitleGroup[] {
  const groups: SubtitleGroup[] = [];
  let currentGroup: SubtitleGroup = { words: [], start: 0, end: 0 };

  for (const word of words) {
    if (currentGroup.words.length === 0) {
      currentGroup.start = word.start;
    }

    currentGroup.words.push(word);
    currentGroup.end = word.end;

    // Break conditions: 8 words max, or 3 seconds max, or sentence-ending punctuation
    const isEndOfSentence = /[.!?]$/.test(word.word);
    const isTooLong = currentGroup.words.length >= 8;
    const isTooLongDuration = (currentGroup.end - currentGroup.start) >= 3;

    if (isEndOfSentence || isTooLong || isTooLongDuration) {
      groups.push({ ...currentGroup });
      currentGroup = { words: [], start: 0, end: 0 };
    }
  }

  if (currentGroup.words.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

// Format time for SRT (HH:MM:SS,mmm)
function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n: number): string { return n.toString().padStart(2, '0'); }
function pad3(n: number): string { return n.toString().padStart(3, '0'); }
