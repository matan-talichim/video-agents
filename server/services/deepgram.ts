import { DeepgramClient } from '@deepgram/sdk';
import fs from 'fs';
import path from 'path';
import { extractAudioForTranscription } from './ffmpeg.js';
import type { TranscriptResult, TranscriptWord } from '../types.js';

const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY || '' });

export async function transcribe(filePath: string, jobId: string): Promise<TranscriptResult> {
  const startTime = Date.now();
  console.log(`[Deepgram] Starting transcription for: ${filePath}`);

  // Step 1: Extract audio to WAV 16kHz mono (faster + more accurate)
  const wavDir = path.join('temp', jobId);
  fs.mkdirSync(wavDir, { recursive: true });
  const wavPath = path.join(wavDir, 'audio_for_transcription.wav');

  console.log('[Deepgram] Extracting audio to WAV...');
  await extractAudioForTranscription(filePath, wavPath);

  // Step 2: Send to Deepgram Nova-3
  console.log('[Deepgram] Sending to Deepgram Nova-3 (Hebrew)...');

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const audioBuffer = fs.readFileSync(wavPath);

      const response = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
        model: 'nova-3',
        language: 'he',
        punctuate: true,
        diarize: true,
        utterances: true,
        smart_format: true,
      });

      // Step 3: Parse into our format
      const result = response as any;
      const channel = result?.results?.channels?.[0];
      const alternative = channel?.alternatives?.[0];

      if (!alternative) {
        throw new Error('No transcription results returned from Deepgram');
      }

      const words: TranscriptWord[] = (alternative.words || []).map((w: any) => ({
        word: w.word || w.punctuated_word || '',
        start: w.start || 0,
        end: w.end || 0,
        speaker: w.speaker ?? 0,
        confidence: w.confidence || 0,
      }));

      const fullText = alternative.transcript || words.map(w => w.word).join(' ');

      const duration = Date.now() - startTime;
      console.log(
        `[Deepgram] Transcription complete — ${duration}ms — ${words.length} words detected`
      );

      // Save transcript
      const transcriptPath = path.join('temp', jobId, 'transcript.json');
      const transcriptResult: TranscriptResult = { words, fullText };
      fs.writeFileSync(transcriptPath, JSON.stringify(transcriptResult, null, 2));
      console.log(`[Deepgram] Transcript saved to ${transcriptPath}`);

      return transcriptResult;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Deepgram] Attempt ${attempt}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[Deepgram] Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  console.error('[Deepgram] All retries exhausted');
  throw lastError || new Error('Deepgram transcription failed after retries');
}

// Group words into sentences based on pauses and punctuation
export function groupWordsIntoSentences(
  words: TranscriptWord[]
): Array<{ text: string; start: number; end: number; words: TranscriptWord[] }> {
  if (words.length === 0) return [];

  const sentences: Array<{ text: string; start: number; end: number; words: TranscriptWord[] }> =
    [];
  let currentWords: TranscriptWord[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentWords.push(word);

    // End sentence on punctuation or long pauses
    const isPunctEnd = /[.!?]$/.test(word.word);
    const nextWord = words[i + 1];
    const longPause = nextWord && nextWord.start - word.end > 1.0;

    if (isPunctEnd || longPause || !nextWord) {
      sentences.push({
        text: currentWords.map(w => w.word).join(' '),
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        words: [...currentWords],
      });
      currentWords = [];
    }
  }

  return sentences;
}

// Extract unique speakers from transcript
export function extractSpeakers(
  transcript: TranscriptResult
): Array<{ speaker: number; wordCount: number; firstAppearance: number }> {
  const speakerMap = new Map<number, { wordCount: number; firstAppearance: number }>();

  for (const word of transcript.words) {
    const existing = speakerMap.get(word.speaker);
    if (!existing) {
      speakerMap.set(word.speaker, { wordCount: 1, firstAppearance: word.start });
    } else {
      existing.wordCount++;
    }
  }

  return Array.from(speakerMap.entries()).map(([speaker, data]) => ({
    speaker,
    wordCount: data.wordCount,
    firstAppearance: data.firstAppearance,
  }));
}
