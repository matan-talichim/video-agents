import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export interface StemResult {
  vocals: string;
  drums: string | null;
  bass: string | null;
  other: string | null;
}

// Separate music into stems using Demucs (Python)
export async function separateStems(audioPath: string, outputDir: string): Promise<StemResult> {
  console.log(`[Stems] Separating: ${audioPath}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Check if demucs is installed
    await execAsync('python3 -m demucs --help');
  } catch {
    console.warn('[Stems] Demucs not installed. Skipping stem separation.');
    return { vocals: audioPath, drums: null, bass: null, other: null };
  }

  try {
    await execAsync(`python3 -m demucs "${audioPath}" -o "${outputDir}" --two-stems vocals`, {
      maxBuffer: 100 * 1024 * 1024,
      timeout: 300000, // 5 min timeout
    });

    const baseName = path.basename(audioPath, path.extname(audioPath));
    const stemDir = path.join(outputDir, 'htdemucs', baseName);

    return {
      vocals: path.join(stemDir, 'vocals.wav'),
      drums: null, // two-stems mode only gives vocals + no_vocals
      bass: null,
      other: path.join(stemDir, 'no_vocals.wav'),
    };
  } catch (error: any) {
    console.error('[Stems] Separation failed:', error.message);
    return { vocals: audioPath, drums: null, bass: null, other: null };
  }
}
