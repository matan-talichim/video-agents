import sys
import json
import torch


def run_vad(audio_path: str, threshold: float = 0.5) -> list:
    """
    Detect all speech segments in audio using Silero VAD.
    Returns list of { start, end } timestamps where ANY speech is detected.
    """
    # Load Silero VAD model (downloads ~2MB on first run, then cached)
    model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False
    )
    (get_speech_timestamps, _, read_audio, _, _) = utils

    # Read audio file
    wav = read_audio(audio_path, sampling_rate=16000)

    # Get speech timestamps
    speech_timestamps = get_speech_timestamps(
        wav,
        model,
        sampling_rate=16000,
        threshold=threshold,           # Speech detection sensitivity
        min_speech_duration_ms=250,     # Minimum speech segment (250ms)
        min_silence_duration_ms=300,    # Minimum silence to split (300ms)
        speech_pad_ms=100,              # Padding around speech (100ms)
    )

    # Convert from sample indices to seconds
    segments = []
    for ts in speech_timestamps:
        segments.append({
            'start': round(ts['start'] / 16000, 3),
            'end': round(ts['end'] / 16000, 3),
        })

    return segments


if __name__ == '__main__':
    audio_path = sys.argv[1]
    segments = run_vad(audio_path)
    print(json.dumps(segments))
