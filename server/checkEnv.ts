// server/checkEnv.ts — Environment variable checker
// Called at server startup to verify all required keys are present.

interface EnvCheck {
  key: string;
  required: boolean;
  description: string;
}

const ENV_REQUIREMENTS: EnvCheck[] = [
  { key: 'ANTHROPIC_API_KEY', required: true, description: 'Claude API key for Brain' },
  { key: 'DEEPGRAM_API_KEY', required: true, description: 'Deepgram for transcription' },
  { key: 'KIE_API_KEY', required: true, description: 'KIE.ai for B-Roll video generation' },
  { key: 'ELEVENLABS_API_KEY', required: false, description: 'ElevenLabs for voiceover' },
  { key: 'SUNO_API_KEY', required: false, description: 'Suno for music generation' },
  { key: 'PEXELS_API_KEY', required: false, description: 'Pexels for stock footage' },
  { key: 'PORT', required: false, description: 'Server port' },
];

export function checkEnvironment(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  console.log('\n=== Environment Check ===');

  for (const env of ENV_REQUIREMENTS) {
    const value = process.env[env.key];
    if (!value) {
      if (env.required) {
        missing.push(env.key);
        console.log(`  MISSING  ${env.key} — REQUIRED — ${env.description}`);
      } else {
        warnings.push(env.key);
        console.log(`  WARN     ${env.key} — optional — ${env.description}`);
      }
    } else {
      console.log(`  OK       ${env.key}`);
    }
  }

  console.log(
    `\n${missing.length === 0 ? 'All required keys present' : `${missing.length} required keys missing`}`,
  );
  if (warnings.length > 0) {
    console.log(`${warnings.length} optional keys missing (some features disabled)`);
  }
  console.log('========================\n');

  return { valid: missing.length === 0, missing, warnings };
}
