import { preprocessForSpeakerDetection } from './preprocess';
import { detectVoiceActivity } from './vad';
import { detectLipMotion } from './lipDetection';
import { mergeAudioVisual, buildPresenterTranscript } from './merge';
import { cleanupPresenterTranscript } from './nlpCleanup';

export interface SpeakerDetectionResult {
  presenterSegments: Array<{ text: string; start: number; end: number }>;
  presenterText: string;
  stats: {
    totalWords: number;
    presenterWords: number;
    filteredWords: number;
    presenterPercent: number;
    removedDuplicates: number;
    processingTimeMs: number;
  };
  method: 'multimodal-lip-sync';
}

export async function detectPresenterSpeech(
  videoPath: string,
  transcript: { words: Array<{ word: string; start: number; end: number; confidence: number }> },
  jobId: string
): Promise<SpeakerDetectionResult> {
  const startTime = Date.now();

  console.log('[SpeakerDetect] === Starting Multimodal Speaker Detection ===');

  // Step 1: Pre-process
  console.log('[SpeakerDetect] Step 1/5: Pre-processing video...');
  const { audioPath, videoLowResPath } = await preprocessForSpeakerDetection(videoPath, jobId);

  // Step 2: VAD — find where ANY speech exists
  console.log('[SpeakerDetect] Step 2/5: Voice Activity Detection...');
  const speechSegments = await detectVoiceActivity(audioPath);
  console.log(`[SpeakerDetect] VAD found ${speechSegments.length} speech segments`);

  // Step 3: Lip motion — find where PRESENTER's lips move
  console.log('[SpeakerDetect] Step 3/5: Analyzing lip motion (MediaPipe)...');
  const visualSegments = await detectLipMotion(videoLowResPath, speechSegments);
  console.log(`[SpeakerDetect] Lip detection found ${visualSegments.length} visual speech segments`);

  // Step 4: Transcription already done (passed in)
  console.log('[SpeakerDetect] Step 4/5: Merging audio + visual data...');

  // Step 5: Merge — classify each word
  const classifiedWords = mergeAudioVisual(transcript.words, visualSegments);
  const { presenterWords, otherWords, presenterSegments, presenterText, stats } =
    buildPresenterTranscript(classifiedWords);

  // Step 6: NLP cleanup — remove repeated takes
  console.log('[SpeakerDetect] Step 5/5: NLP cleanup (removing repeated takes)...');
  const { cleanedSegments, removedDuplicates } = await cleanupPresenterTranscript(
    presenterSegments,
    // Build removed segments for context
    buildPresenterTranscript(classifiedWords.filter(w => !w.isPresenter)).presenterSegments
  );

  const finalSegments = cleanedSegments
    .filter(s => s.action !== 'remove-duplicate')
    .map(s => ({ text: s.text, start: s.start, end: s.end }));

  const processingTimeMs = Date.now() - startTime;

  console.log('[SpeakerDetect] === Results ===');
  console.log(`[SpeakerDetect] Total words: ${stats.totalWords}`);
  console.log(`[SpeakerDetect] Presenter words: ${stats.presenterWords} (${stats.presenterPercent}%)`);
  console.log(`[SpeakerDetect] Filtered (off-camera): ${stats.filteredWords}`);
  console.log(`[SpeakerDetect] Removed duplicates: ${removedDuplicates}`);
  console.log(`[SpeakerDetect] Final segments: ${finalSegments.length}`);
  console.log(`[SpeakerDetect] Processing time: ${(processingTimeMs / 1000).toFixed(1)}s`);
  console.log('[SpeakerDetect] ==============================');

  return {
    presenterSegments: finalSegments,
    presenterText: finalSegments.map(s => s.text).join(' '),
    stats: {
      ...stats,
      removedDuplicates,
      processingTimeMs,
    },
    method: 'multimodal-lip-sync',
  };
}
