import sys
import json


def run_vad_onnx(audio_path, threshold=0.5):
    """Use ONNX Runtime Silero VAD — lightweight (~50MB vs 2GB torch)"""
    import onnxruntime
    import numpy as np
    import wave
    import os
    import urllib.request

    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'silero_vad.onnx')
    if not os.path.exists(model_path):
        url = 'https://raw.githubusercontent.com/snakers4/silero-vad/master/files/silero_vad.onnx'
        urllib.request.urlretrieve(url, model_path)

    # Read WAV file (must be 16kHz mono)
    with wave.open(audio_path, 'rb') as wf:
        sample_rate = wf.getframerate()
        n_frames = wf.getnframes()
        audio_bytes = wf.readframes(n_frames)

    audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    # Resample to 16kHz if needed
    if sample_rate != 16000:
        from scipy.signal import resample
        audio = resample(audio, int(len(audio) * 16000 / sample_rate))

    session = onnxruntime.InferenceSession(model_path)

    # Process in 512-sample windows (32ms at 16kHz)
    window_size = 512
    segments = []
    speech_active = False
    speech_start = 0
    h = np.zeros((2, 1, 64), dtype=np.float32)
    c = np.zeros((2, 1, 64), dtype=np.float32)

    for i in range(0, len(audio) - window_size, window_size):
        chunk = audio[i:i + window_size].reshape(1, -1).astype(np.float32)
        sr = np.array([16000], dtype=np.int64)

        ort_inputs = {
            'input': chunk,
            'sr': sr,
            'h': h,
            'c': c,
        }
        out, hn, cn = session.run(None, ort_inputs)
        h = hn
        c = cn
        prob = out[0][0]

        timestamp = i / 16000.0

        if prob >= threshold and not speech_active:
            speech_active = True
            speech_start = max(0, timestamp - 0.1)  # 100ms padding
        elif prob < (threshold - 0.15) and speech_active:
            speech_active = False
            speech_end = timestamp + 0.1
            if speech_end - speech_start >= 0.25:  # min 250ms
                segments.append({
                    'start': round(speech_start, 3),
                    'end': round(speech_end, 3),
                })

    # Close last segment
    if speech_active:
        speech_end = len(audio) / 16000.0
        if speech_end - speech_start >= 0.25:
            segments.append({
                'start': round(speech_start, 3),
                'end': round(speech_end, 3),
            })

    return segments


def run_vad_torch(audio_path, threshold=0.5):
    """Original Silero VAD using PyTorch"""
    import torch
    import io
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()  # suppress torch.hub output
    try:
        model, utils = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False
        )
    finally:
        sys.stdout = old_stdout  # restore stdout
    (get_speech_timestamps, _, read_audio, _, _) = utils
    wav = read_audio(audio_path, sampling_rate=16000)
    speech_timestamps = get_speech_timestamps(
        wav, model, sampling_rate=16000,
        threshold=threshold,
        min_speech_duration_ms=250,
        min_silence_duration_ms=300,
        speech_pad_ms=100,
    )
    return [{'start': round(ts['start'] / 16000, 3), 'end': round(ts['end'] / 16000, 3)}
            for ts in speech_timestamps]


def run_vad_ffmpeg(audio_path, threshold=0.5):
    """Fallback: use FFmpeg silencedetect — no Python ML deps needed"""
    import subprocess

    result = subprocess.run(
        ['ffmpeg', '-i', audio_path, '-af',
         'silencedetect=noise=-30dB:d=0.3', '-f', 'null', '-'],
        capture_output=True, text=True
    )

    silence_starts = []
    silence_ends = []
    for line in result.stderr.split('\n'):
        if 'silence_start' in line:
            try:
                t = float(line.split('silence_start: ')[1].split('\n')[0].strip())
                silence_starts.append(t)
            except Exception:
                pass
        if 'silence_end' in line:
            try:
                t = float(line.split('silence_end: ')[1].split('|')[0].strip())
                silence_ends.append(t)
            except Exception:
                pass

    # Get total duration
    dur_result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', audio_path],
        capture_output=True, text=True
    )
    total_duration = float(dur_result.stdout.strip()) if dur_result.stdout.strip() else 300.0

    # Invert silences to get speech segments
    segments = []
    prev_end = 0.0
    for i in range(len(silence_starts)):
        if silence_starts[i] > prev_end + 0.1:
            segments.append({'start': round(prev_end, 3), 'end': round(silence_starts[i], 3)})
        if i < len(silence_ends):
            prev_end = silence_ends[i]

    if prev_end < total_duration - 0.1:
        segments.append({'start': round(prev_end, 3), 'end': round(total_duration, 3)})

    return segments


def run_vad(audio_path, threshold=0.5):
    """Try ONNX → Torch → FFmpeg fallback chain"""
    try:
        return run_vad_onnx(audio_path, threshold)
    except Exception:
        pass

    try:
        return run_vad_torch(audio_path, threshold)
    except Exception:
        pass

    try:
        return run_vad_ffmpeg(audio_path, threshold)
    except Exception:
        return []


if __name__ == '__main__':
    audio_path = sys.argv[1]
    segments = run_vad(audio_path)
    print(json.dumps(segments))
