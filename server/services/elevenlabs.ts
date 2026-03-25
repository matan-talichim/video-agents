import fs from 'fs';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// Voice style presets
const VOICE_STYLES: Record<string, { stability: number; similarity_boost: number; style: number }> = {
  narrator:   { stability: 0.7, similarity_boost: 0.8, style: 0 },
  educator:   { stability: 0.6, similarity_boost: 0.7, style: 0.3 },
  persuader:  { stability: 0.5, similarity_boost: 0.8, style: 0.7 },
  coach:      { stability: 0.6, similarity_boost: 0.7, style: 0.5 },
  motivator:  { stability: 0.4, similarity_boost: 0.8, style: 0.9 },
};

// Text-to-Speech with optional voice style
export async function textToSpeech(
  text: string,
  outputPath: string,
  voiceId?: string,
  style?: string
): Promise<string> {
  const selectedVoiceId = voiceId || 'pNInz6obpgDQGcFmaJgB'; // default: Adam (multilingual)
  const voiceSettings = style && VOICE_STYLES[style] ? VOICE_STYLES[style] : VOICE_STYLES.narrator;

  console.log(`[ElevenLabs] TTS: "${text.slice(0, 50)}..." voice=${selectedVoiceId} style=${style || 'narrator'}`);
  const startTime = Date.now();

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${selectedVoiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: voiceSettings.stability,
        similarity_boost: voiceSettings.similarity_boost,
        style: voiceSettings.style,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${await response.text()}`);
  }

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log(`[ElevenLabs] TTS done in ${((Date.now() - startTime) / 1000).toFixed(1)}s → ${outputPath}`);
  return outputPath;
}

// Clone voice from audio samples
export async function cloneVoice(
  name: string,
  audioSamplePaths: string[],
  description?: string
): Promise<string> {
  console.log(`[ElevenLabs] Cloning voice "${name}" from ${audioSamplePaths.length} samples`);

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description || 'Cloned voice');

  for (const samplePath of audioSamplePaths) {
    const fileBuffer = fs.readFileSync(samplePath);
    const blob = new Blob([fileBuffer]);
    formData.append('files', blob, path.basename(samplePath));
  }

  const response = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs clone failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`[ElevenLabs] Voice cloned → voiceId: ${data.voice_id}`);
  return data.voice_id;
}

// List available voices
export async function listVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs list voices failed: ${response.status}`);
  }

  const data = await response.json();
  return data.voices.map((v: any) => ({ voice_id: v.voice_id, name: v.name }));
}
