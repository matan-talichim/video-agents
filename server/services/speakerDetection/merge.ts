import { VisualSpeechSegment } from './lipDetection';

export interface ClassifiedWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  isPresenter: boolean;
  reason: string;
}

export function mergeAudioVisual(
  words: Array<{ word: string; start: number; end: number; confidence: number }>,
  visualSegments: VisualSpeechSegment[],
  toleranceMs: number = 200   // 200ms tolerance for sync alignment
): ClassifiedWord[] {
  const tolerance = toleranceMs / 1000;

  return words.map(word => {
    // Check if this word's timestamp falls within any visual speech segment
    const isInVisual = visualSegments.some(vs =>
      word.start >= (vs.start - tolerance) && word.end <= (vs.end + tolerance)
    );

    return {
      ...word,
      isPresenter: isInVisual,
      reason: isInVisual
        ? 'lips moving during speech'
        : 'no lip movement — likely off-camera speaker',
    };
  });
}

export function buildPresenterTranscript(
  classifiedWords: ClassifiedWord[]
): {
  presenterWords: ClassifiedWord[];
  otherWords: ClassifiedWord[];
  presenterText: string;
  presenterSegments: Array<{ text: string; start: number; end: number }>;
  stats: { totalWords: number; presenterWords: number; filteredWords: number; presenterPercent: number };
} {
  const presenterWords = classifiedWords.filter(w => w.isPresenter);
  const otherWords = classifiedWords.filter(w => !w.isPresenter);

  // Build segments from consecutive presenter words
  const segments: Array<{ words: string[]; start: number; end: number }> = [];
  let current: { words: string[]; start: number; end: number } | null = null;

  for (const word of presenterWords) {
    if (!current) {
      current = { words: [word.word], start: word.start, end: word.end };
    } else if (word.start - current.end > 1.0) {
      // Gap > 1 second = new segment
      segments.push(current);
      current = { words: [word.word], start: word.start, end: word.end };
    } else {
      current.words.push(word.word);
      current.end = word.end;
    }
  }
  if (current) segments.push(current);

  const presenterSegments = segments.map(s => ({
    text: s.words.join(' '),
    start: s.start,
    end: s.end,
  }));

  const stats = {
    totalWords: classifiedWords.length,
    presenterWords: presenterWords.length,
    filteredWords: otherWords.length,
    presenterPercent: classifiedWords.length > 0
      ? Math.round((presenterWords.length / classifiedWords.length) * 100)
      : 100,
  };

  console.log(`[Merge] ${stats.presenterWords}/${stats.totalWords} words are presenter (${stats.presenterPercent}%)`);
  console.log(`[Merge] Filtered out ${stats.filteredWords} words from off-camera speakers`);
  if (otherWords.length > 0) {
    console.log(`[Merge] Removed speech: "${otherWords.slice(0, 10).map(w => w.word).join(' ')}..."`);
  }

  return {
    presenterWords,
    otherWords,
    presenterText: presenterSegments.map(s => s.text).join(' '),
    presenterSegments,
    stats,
  };
}
