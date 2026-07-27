import os
import subprocess
import tempfile
from collections.abc import Callable
from pathlib import Path

import librosa
import numpy as np

SAMPLE_RATE = 22_050
HOP_LENGTH = 4_096
MAX_ANALYSIS_SECONDS = int(os.getenv('MAX_ANALYSIS_SECONDS', '180'))

NOTES = ('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B')
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

CAMELOT_MAJOR = ('8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B')
CAMELOT_MINOR = ('5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A')
ProgressCallback = Callable[[int, str], None]


class AnalysisError(Exception):
    pass


def _notify(callback: ProgressCallback | None, percent: int, stage: str) -> None:
    if callback:
        callback(percent, stage)


def _correlation(left: np.ndarray, right: np.ndarray) -> float:
    left_centered = left - left.mean()
    right_centered = right - right.mean()
    denominator = np.linalg.norm(left_centered) * np.linalg.norm(right_centered)
    if denominator == 0:
        return 0.0
    return float(np.dot(left_centered, right_centered) / denominator)


def detect_key_from_chroma(chroma_vector: np.ndarray) -> list[dict]:
    candidates = []
    for tonic_index, tonic in enumerate(NOTES):
        for mode, base_profile, camelot in (
            ('major', MAJOR_PROFILE, CAMELOT_MAJOR[tonic_index]),
            ('minor', MINOR_PROFILE, CAMELOT_MINOR[tonic_index]),
        ):
            profile = np.roll(base_profile, tonic_index)
            score = _correlation(chroma_vector, profile)
            mode_label = 'maior' if mode == 'major' else 'menor'
            candidates.append({
                'tonic': tonic,
                'mode': mode,
                'display': f'{tonic} {mode_label}',
                'camelot': camelot,
                'score': score,
            })
    return sorted(candidates, key=lambda candidate: candidate['score'], reverse=True)


def _decode_audio(source_path: Path, target_path: Path) -> None:
    command = [
        'ffmpeg', '-nostdin', '-v', 'error', '-y',
        '-i', str(source_path),
        '-t', str(MAX_ANALYSIS_SECONDS),
        '-ac', '1', '-ar', str(SAMPLE_RATE),
        '-c:a', 'pcm_s16le', str(target_path),
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=240, check=False)
    except FileNotFoundError as error:
        raise AnalysisError('O ffmpeg não está instalado no servidor.') from error
    except subprocess.TimeoutExpired as error:
        raise AnalysisError('A decodificação do áudio excedeu o tempo limite.') from error

    if completed.returncode != 0:
        detail = completed.stderr.strip().splitlines()[-1] if completed.stderr.strip() else ''
        raise AnalysisError(f'Formato de áudio inválido ou corrompido. {detail}'.strip())


def analyze_key(source_path: Path, progress: ProgressCallback | None = None) -> dict:
    temp_directory = os.getenv('AUDIO_TEMP_DIR') or None
    descriptor, wav_name = tempfile.mkstemp(suffix='.wav', dir=temp_directory)
    os.close(descriptor)
    wav_path = Path(wav_name)

    try:
        _notify(progress, 32, 'Preparando o áudio')
        _notify(progress, 36, 'Decodificando a faixa')
        _decode_audio(source_path, wav_path)

        _notify(progress, 49, 'Lendo as amostras')
        signal, sample_rate = librosa.load(wav_path, sr=SAMPLE_RATE, mono=True)

        _notify(progress, 56, 'Removendo trechos silenciosos')
        signal, _ = librosa.effects.trim(signal, top_db=35)
        duration = librosa.get_duration(y=signal, sr=sample_rate)

        if duration < 4:
            raise AnalysisError('Use uma amostra com pelo menos 4 segundos de música audível.')
        if not np.any(np.abs(signal) > 1e-5):
            raise AnalysisError('A amostra não contém áudio suficiente para análise.')

        _notify(progress, 64, 'Separando o conteúdo harmônico')
        harmonic = librosa.effects.harmonic(signal, margin=3.0)

        _notify(progress, 76, 'Calculando o espectro musical')
        spectrum = np.abs(librosa.stft(harmonic, n_fft=8192, hop_length=HOP_LENGTH))

        _notify(progress, 84, 'Construindo o perfil das notas')
        chroma = librosa.feature.chroma_stft(
            S=np.square(spectrum),
            sr=sample_rate,
            n_fft=8192,
            hop_length=HOP_LENGTH,
            n_chroma=12,
        )

        _notify(progress, 91, 'Selecionando os trechos relevantes')
        frame_energy = chroma.sum(axis=0)
        active_frames = chroma[:, frame_energy > np.percentile(frame_energy, 20)]
        if active_frames.shape[1] == 0:
            raise AnalysisError('Não foi possível encontrar conteúdo harmônico na amostra.')

        chroma_vector = np.median(active_frames, axis=1)
        chroma_vector /= chroma_vector.sum() or 1

        _notify(progress, 96, 'Comparando as tonalidades')
        candidates = detect_key_from_chroma(chroma_vector)
        best, alternative = candidates[0], candidates[1]

        quality = max(0.0, min(1.0, (best['score'] + 1) / 2))
        separation = max(0.0, best['score'] - alternative['score'])
        confidence = float(np.clip(0.30 + 0.48 * quality + 1.4 * separation, 0.35, 0.97))

        _notify(progress, 99, 'Finalizando o resultado')
        return {
            'tonic': best['tonic'],
            'mode': best['mode'],
            'display': best['display'],
            'camelot': best['camelot'],
            'confidence': round(confidence, 3),
            'alternative': {
                'display': alternative['display'],
                'camelot': alternative['camelot'],
            },
            'analyzed_seconds': round(duration, 1),
            'analysis_version': 'chroma-1',
        }
    except AnalysisError:
        raise
    except Exception as error:
        raise AnalysisError('Não foi possível extrair a tonalidade deste áudio.') from error
    finally:
        wav_path.unlink(missing_ok=True)
