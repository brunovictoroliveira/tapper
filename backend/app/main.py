import asyncio
import os
import tempfile
import time
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from .analyzer import AnalysisError, analyze_key

MAX_UPLOAD_BYTES = int(os.getenv('MAX_UPLOAD_MB', '250')) * 1024 * 1024
MAX_CONCURRENT_ANALYSES = max(1, int(os.getenv('MAX_CONCURRENT_ANALYSES', '1')))
CHUNK_SIZE = 1024 * 1024
PROGRESS_TTL_SECONDS = 10 * 60
ALLOWED_EXTENSIONS = {'.mp3', '.wav', '.webm', '.ogg'}
TEMP_DIRECTORY = Path(os.getenv('AUDIO_TEMP_DIR', tempfile.gettempdir()))
TEMP_DIRECTORY.mkdir(parents=True, exist_ok=True)
analysis_slots = asyncio.Semaphore(MAX_CONCURRENT_ANALYSES)
progress_jobs: dict[str, dict] = {}

app = FastAPI(title='Tapper Key Detection API', version='1.0.0')

origins = [origin.strip() for origin in os.getenv('CORS_ORIGINS', '').split(',') if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=['GET', 'POST'],
        allow_headers=['Content-Type'],
    )


def _remove_expired_progress() -> None:
    cutoff = time.monotonic() - PROGRESS_TTL_SECONDS
    expired = [job_id for job_id, job in progress_jobs.items() if job['updated_at'] < cutoff]
    for job_id in expired:
        progress_jobs.pop(job_id, None)


def _set_progress(job_id: str, percent: int, stage: str, status: str = 'processing') -> None:
    progress_jobs[job_id] = {
        'progress': max(0, min(100, percent)),
        'stage': stage,
        'status': status,
        'updated_at': time.monotonic(),
    }


@app.get('/api/health')
def health() -> dict:
    return {'status': 'ok'}


@app.get('/api/analyze-key/progress/{analysis_id}')
def analysis_progress(analysis_id: UUID) -> dict:
    _remove_expired_progress()
    job = progress_jobs.get(str(analysis_id))
    if not job:
        raise HTTPException(status_code=404, detail='Análise ainda não iniciada.')
    return {key: job[key] for key in ('progress', 'stage', 'status')}


@app.post('/api/analyze-key')
async def analyze_audio_key(analysis_id: UUID, audio: UploadFile = File(...)) -> dict:
    job_id = str(analysis_id)
    _remove_expired_progress()
    _set_progress(job_id, 26, 'Validando o arquivo')

    suffix = Path(audio.filename or '').suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        _set_progress(job_id, 26, 'Formato de arquivo não suportado', 'error')
        raise HTTPException(status_code=415, detail='Envie um arquivo MP3 ou WAV válido.')

    descriptor, temp_name = tempfile.mkstemp(prefix='tapper-', suffix=suffix, dir=TEMP_DIRECTORY)
    os.close(descriptor)
    source_path = Path(temp_name)
    received = 0

    try:
        _set_progress(job_id, 28, 'Preparando a análise')
        with source_path.open('wb') as destination:
            while chunk := await audio.read(CHUNK_SIZE):
                received += len(chunk)
                if received > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f'O arquivo ultrapassa o limite de {MAX_UPLOAD_BYTES // 1024 // 1024} MB.',
                    )
                destination.write(chunk)

        if received == 0:
            raise HTTPException(status_code=400, detail='O arquivo enviado está vazio.')

        _set_progress(job_id, 30, 'Aguardando o processador')
        async with analysis_slots:
            _set_progress(job_id, 31, 'Iniciando a detecção')

            def report_progress(percent: int, stage: str) -> None:
                _set_progress(job_id, percent, stage)

            try:
                result = await run_in_threadpool(analyze_key, source_path, report_progress)
            except AnalysisError as error:
                _set_progress(job_id, progress_jobs[job_id]['progress'], str(error), 'error')
                raise HTTPException(status_code=422, detail=str(error)) from error

        _set_progress(job_id, 100, 'Análise concluída', 'done')
        return result
    except HTTPException as error:
        current = progress_jobs.get(job_id, {'progress': 26})
        _set_progress(job_id, current['progress'], str(error.detail), 'error')
        raise
    finally:
        await audio.close()
        source_path.unlink(missing_ok=True)
