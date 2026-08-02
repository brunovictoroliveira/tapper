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
                 ├─ Web Audio decodifica no dispositivo
                 ├─ FFT extrai o perfil cromático
                 ├─ compara 24 perfis tonais maior/menor
                 └─ mantém o áudio somente no navegador
```

O navegador não usa `localStorage` para áudio. Um arquivo escolhido continua representado pelo objeto `File` e é analisado localmente, sem upload automático. Gravações de microfone são limitadas a 30 segundos para manter o consumo de memória previsível.

Análises e projetos são salvos no IndexedDB do dispositivo. A tela de detecção permite excluir entradas e exportar ou importar um backup JSON versionado.

## Desenvolvimento

Frontend:

```bash
npm install
npm run dev
```

Validações:

```bash
npm run lint
npm test
npm run build
```

O diretório `backend/` contém a implementação FastAPI anterior e permanece como referência durante a migração. O frontend não depende dela.

## Tapper Cloud

Copie `.env.example` para `.env` e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para habilitar cadastro, login, recuperação de senha e sessão persistente em `/account`. Essas são as únicas credenciais Supabase permitidas no frontend.

O schema inicial está em `supabase/migrations/202608020001_initial_cloud_schema.sql`. Ele cria perfis, assinaturas, músicas, projetos, cinco versões por projeto, arquivos e eventos de pagamento, com RLS habilitada em todas as tabelas expostas. Para aplicar em um projeto Supabase já criado:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

O cliente não consegue promover o próprio plano, alterar assinaturas, registrar arquivos ou escrever eventos de pagamento; essas operações serão exclusivas das Functions administrativas.

## Arquivos e pagamentos

As Netlify Functions em `netlify/functions/` implementam:

- reserva de cota e URLs temporárias para upload/download direto no Cloudflare R2;
- confirmação de tamanho e checksum SHA-256 antes de finalizar uploads;
- exclusão de arquivos e atualização atômica do espaço utilizado;
- criação, consulta e cancelamento da assinatura Mercado Pago de R$ 9,99;
- webhook assinado e idempotente;
- exclusão completa da conta, incluindo objetos privados do R2.

Segredos administrativos são lidos somente no runtime das Functions. Consulte o [índice da documentação](docs/README.md) e o [painel de status e tarefas](docs/MANUAL_TASKS.md) para acompanhar itens concluídos, parciais e manuais.

## Deploy no Netlify

O projeto inclui `netlify.toml` e o fallback de rotas SPA em `public/_redirects`. Configure:

- comando de build: `npm run build`;
- diretório publicado: `dist`;
- Node.js 20 ou mais recente.

HTTPS continua obrigatório para `getUserMedia` fora de `localhost`.

## Limites e capacidade

A tela aceita arquivos de até 250 MB e analisa no máximo os primeiros 180 segundos, distribuindo amostras ao longo desse intervalo para manter o trabalho previsível no navegador.

A detecção atual é uma estimativa tonal clássica por chroma/Krumhansl. Faixas modais, mudanças de tom e pares relativos como C maior/A menor podem ser ambíguos; por isso a análise também retorna alternativa e confiança.

## Contrato da análise

`detectKey(file, options)` recebe um `File`, `Blob` ou `AudioBuffer` e não depende de React, Supabase ou armazenamento. Formatos públicos: MP3 e WAV. WebM/OGG são usados internamente para gravações, conforme o suporte do navegador.

Exemplo de resposta:

```json
{
  "key": "A",
  "mode": "minor",
  "camelot": "8A",
  "confidence": 0.84,
  "alternative": { "display": "C maior", "camelot": "8B" },
  "durationMs": 94200,
  "analysisVersion": "browser-chroma-1"
}
```
