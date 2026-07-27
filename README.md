# Tapper

Aplicação musical com duas ferramentas:

- **Tap BPM:** calcula o andamento a partir dos toques do usuário.
- **Key Detector:** recebe MP3/WAV ou uma gravação curta do microfone e estima tônica, modo e código Camelot.

## Arquitetura

```text
Navegador
  ├─ /       homepage
  ├─ /tap    Tap BPM local, sem backend
  └─ /key    upload ou MediaRecorder
                 │ multipart/form-data
                 ▼
              FastAPI
                 ├─ grava o upload em arquivo temporário por blocos de 1 MB
                 ├─ ffmpeg converte para WAV mono em 22,05 kHz
                 ├─ librosa extrai o perfil cromático
                 ├─ compara 24 perfis tonais maior/menor
                 └─ apaga os arquivos temporários em finally
```

O navegador não usa `localStorage` para áudio. Um arquivo escolhido continua representado pelo objeto `File` do navegador e é enviado com progresso. Gravações de microfone são limitadas a 30 segundos para manter o consumo de memória previsível.

## Desenvolvimento

Frontend:

```bash
npm install
npm run dev
```

Backend, em outro terminal (Python 3.10+ e `ffmpeg` instalados):

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

O Vite encaminha `/api` para `http://localhost:8000` durante o desenvolvimento.

## Deploy na Oracle VPS

Pré-requisitos:

1. Uma instância Ubuntu/Oracle Linux com Docker e Compose.
2. Um domínio com registro A apontado para o IP público da VPS.
3. Portas TCP 80/443 e UDP 443 liberadas no Security List/NSG e no firewall da máquina.

Prepare e suba:

```bash
cp .env.example .env
# Edite DOMAIN no arquivo .env
docker compose up -d --build
```

O Caddy obtém e renova o certificado TLS automaticamente. HTTPS é obrigatório para `getUserMedia` fora de `localhost`.

Para atualizar:

```bash
docker compose up -d --build
```

Para acompanhar:

```bash
docker compose logs -f backend caddy
```

## Limites e capacidade

Variáveis em `.env`:

- `MAX_UPLOAD_MB`: limite do upload; padrão 250 MB.
- `MAX_ANALYSIS_SECONDS`: trecho máximo decodificado; padrão 180 segundos.
- `MAX_CONCURRENT_ANALYSES`: análises simultâneas por contêiner; padrão 1.

A fila de concorrência evita que várias FFTs esgotem CPU e memória de uma VPS pequena. Para uma instância ARM Ampere de 4 OCPUs/24 GB, comece com 2 análises simultâneas; para uma VM de 1 GB, mantenha 1 e configure swap. O volume `audio-temp` evita `localStorage` e é limpo após cada requisição bem-sucedida ou com erro.

A detecção atual é uma estimativa tonal clássica por chroma/Krumhansl. Faixas modais, mudanças de tom e pares relativos como C maior/A menor podem ser ambíguos; por isso a API também retorna alternativa e confiança.

## API

`POST /api/analyze-key?analysis_id=<UUID>`, multipart com campo `audio`. Durante o processamento, `GET /api/analyze-key/progress/<UUID>` retorna `progress`, `stage` e `status` para atualização da interface.

Formatos públicos de arquivo: MP3 e WAV. WebM/OGG são aceitos internamente para as gravações do navegador.

Exemplo de resposta:

```json
{
  "tonic": "A",
  "mode": "minor",
  "display": "A menor",
  "camelot": "8A",
  "confidence": 0.84,
  "alternative": { "display": "C maior", "camelot": "8B" },
  "analyzed_seconds": 94.2,
  "analysis_version": "chroma-1"
}
```

Health check: `GET /api/health`.
