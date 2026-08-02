# Tapper Cloud — Plano de Adequação para Netlify, Supabase, R2 e Monetização

## 1. Objetivo

Adequar o Tapper para operar com custo zero ou próximo de zero, substituindo a dependência inicial de uma VPS Oracle Cloud por uma arquitetura baseada em serviços gratuitos ou de baixo custo.

O plano preserva a funcionalidade atual de **detecção de tonalidade por upload**, adiciona persistência local para usuários gratuitos e estrutura um plano premium de **R$ 9,99 por mês**, com sincronização, CRUD de músicas, projetos salvos e armazenamento em nuvem.

---

## 2. Decisão de arquitetura

Para o MVP, faz sentido **substituir a Oracle Cloud como dependência de produção**, em vez de usar Oracle e Netlify simultaneamente.

A Oracle Cloud poderá ser utilizada futuramente para:

- processamento pesado com FFmpeg;
- análise de áudio no servidor;
- geração de stems;
- filas e tarefas prolongadas;
- colaboração em tempo real;
- serviços Node executados continuamente;
- WebSockets persistentes;
- integração com modelos de IA.

No estágio atual, isso é desnecessário.

A detecção de tonalidade deve continuar sendo executada **localmente no navegador**, logo após o upload. O áudio não precisa passar por uma VPS para que a funcionalidade principal opere.

---

## 3. Arquitetura proposta

```text
Navegador — React / Vite / PWA
├── upload do áudio
├── key detection local
├── reprodução e waveform
├── IndexedDB para usuários gratuitos
├── interface do Tapper Cloud
└── sincronização opcional
          │
          ├── Supabase
          │   ├── autenticação
          │   ├── PostgreSQL
          │   ├── músicas
          │   ├── projetos
          │   ├── versões
          │   └── assinaturas e permissões
          │
          ├── Cloudflare R2
          │   └── arquivos de áudio e backups
          │
          └── Netlify Functions
              ├── assinatura Mercado Pago
              ├── webhooks
              ├── URLs temporárias do R2
              └── operações administrativas seguras
```

### Responsabilidade de cada serviço

| Componente | Responsabilidade |
|---|---|
| Netlify | Hospedagem do frontend e pequenas Functions |
| Supabase | Autenticação, banco de dados e Row Level Security |
| Cloudflare R2 | Armazenamento privado de áudio e projetos |
| IndexedDB | Persistência local, offline e gratuita |
| Mercado Pago | Assinatura recorrente |
| Oracle Cloud | Fora do MVP; reservada para processamento pesado futuro |

---

## 4. Produto inicial

## 4.1 Tapper Free

O plano gratuito deverá oferecer:

- detecção de tonalidade por upload;
- reprodução de áudio;
- waveform;
- histórico local;
- salvamento no navegador com IndexedDB;
- exportação e importação de projetos;
- funcionamento sem conta;
- funcionamento offline como PWA;
- uso local sem envio automático de arquivos.

O usuário gratuito não deverá ser obrigado a criar uma conta para usar a funcionalidade principal.

---

## 4.2 Tapper Cloud — R$ 9,99 por mês

Um CRUD simples de músicas não é suficiente para justificar uma assinatura.

O valor precisa estar na combinação entre organização, sincronização, recuperação de projetos e armazenamento.

### Recursos propostos

| Recurso | Premium |
|---|---:|
| Biblioteca sincronizada | Sim |
| Acesso em vários computadores | Sim |
| Registros de músicas | Até 500 |
| Projetos ativos | Até 50 |
| Armazenamento em nuvem | 1 GB |
| Tamanho máximo por arquivo | 100 MB |
| Tags, notas e coleções | Sim |
| Resultado da análise salvo | Sim |
| Correção manual de tonalidade | Sim |
| Backup dos projetos | Sim |
| Histórico de versões | Últimas 5 |
| Exportação completa | JSON e ZIP |
| Indicador de uso da cota | Sim |

### Proposta de valor

> Analise uma música, salve a tonalidade, organize referências e continue o projeto em qualquer computador.

Essa proposta é mais forte do que simplesmente cobrar para salvar um resultado.

---

## 5. Estratégia de armazenamento

## 5.1 Supabase para dados estruturados

O Supabase deverá armazenar:

- perfis;
- assinaturas;
- músicas;
- resultados de análise;
- notas;
- tags;
- projetos;
- versões;
- referências aos arquivos;
- eventos de pagamento.

Não é recomendável usar o banco PostgreSQL para armazenar os arquivos binários de áudio.

---

## 5.2 Cloudflare R2 para arquivos

O R2 deverá armazenar:

- áudio enviado pelos usuários premium;
- backups de projetos;
- arquivos exportados;
- versões compactadas;
- arquivos associados a músicas.

Os uploads devem ser feitos diretamente pelo navegador para o R2, por meio de URLs temporárias assinadas.

A Netlify Function deve apenas:

1. validar a identidade do usuário;
2. verificar se a assinatura está ativa;
3. verificar se há cota disponível;
4. gerar a URL assinada;
5. registrar o upload no banco.

O arquivo não deve passar pela Netlify Function.

---

## 5.3 IndexedDB para persistência local

O IndexedDB deverá armazenar:

- histórico de análises;
- músicas locais;
- projetos locais;
- resultados de key detection;
- blobs temporários;
- fila de sincronização;
- dados pendentes de upload.

O `localStorage` deve ficar restrito a preferências pequenas, como:

- tema;
- idioma;
- volume;
- última tela aberta;
- preferências da interface.

---

## 6. Modelagem do banco de dados

## 6.1 Tabela `profiles`

Informações básicas do usuário.

```text
id                    uuid → auth.users.id
display_name          text
plan                  free | premium
storage_quota_bytes   bigint
storage_used_bytes    bigint
created_at            timestamptz
updated_at            timestamptz
```

### Regras

- `id` deve ser igual ao identificador do Supabase Auth.
- O campo `plan` não pode ser alterado pelo frontend.
- O valor premium deve ser derivado da assinatura ativa.
- `storage_used_bytes` deve ser atualizado de forma controlada pelo backend.

---

## 6.2 Tabela `subscriptions`

Fonte de verdade da assinatura.

```text
id                       uuid
user_id                  uuid
provider                 mercadopago
provider_subscription_id text
status                   pending | active | past_due | cancelled
current_period_end       timestamptz
grace_period_end         timestamptz
created_at               timestamptz
updated_at               timestamptz
```

### Regras

- Somente uma Function com acesso administrativo poderá alterar essa tabela.
- O frontend nunca deve definir o status da assinatura.
- Eventos do Mercado Pago devem ser processados por webhook.
- O status deve ser atualizado de forma idempotente.

---

## 6.3 Tabela `songs`

CRUD principal do usuário premium.

```text
id                    uuid
user_id               uuid
title                 text
artist                text
album                 text
original_filename     text
mime_type             text
file_size_bytes       bigint
duration_ms           integer
detected_key          text
detected_mode         major | minor | unknown
detection_confidence  numeric
manual_key            text
bpm                   numeric
notes                 text
tags                  text[]
audio_file_id         uuid nullable
analyzed_at           timestamptz
created_at            timestamptz
updated_at            timestamptz
```

### Observações

- `detected_key` preserva o resultado automático.
- `manual_key` permite correção sem apagar o resultado original.
- `audio_file_id` pode ser nulo quando o usuário salva apenas os metadados.
- O áudio deve continuar opcional.

---

## 6.4 Tabela `projects`

Estado restaurável do Tapper.

```text
id             uuid
user_id        uuid
song_id        uuid nullable
name           text
project_state  jsonb
version        integer
created_at     timestamptz
updated_at     timestamptz
```

### Exemplo de `project_state`

```json
{
  "selectedKey": "C#m",
  "detectedKey": "C#m",
  "bpm": 92,
  "transpose": 0,
  "loop": {
    "start": 12.4,
    "end": 20.8
  },
  "markers": [],
  "zoom": 1.5,
  "playhead": 14.2
}
```

À medida que o Tapper evoluir, esse estado poderá incluir:

- chops;
- pistas;
- mapeamentos MIDI;
- pads;
- knobs;
- pontos de loop;
- waveform;
- configurações de reprodução;
- estados de mute e volume.

---

## 6.5 Tabela `project_versions`

Histórico das versões.

```text
id             uuid
project_id     uuid
user_id        uuid
version        integer
project_state  jsonb
created_at     timestamptz
```

### Regra inicial

Manter somente as cinco versões mais recentes por projeto.

---

## 6.6 Tabela `cloud_files`

Relacionamento entre o banco e os objetos do R2.

```text
id             uuid
user_id        uuid
song_id        uuid nullable
project_id     uuid nullable
object_key     text unique
original_name  text
mime_type      text
size_bytes     bigint
checksum       text
status         pending | ready | deleting
created_at     timestamptz
```

### Estrutura sugerida da chave

```text
users/{userId}/songs/{songId}/{fileId}.wav
```

O nome original não deve ser usado como chave principal.

---

## 6.7 Tabela `payment_events`

Evita processamento duplicado de webhooks.

```text
id                 uuid
provider_event_id  text unique
event_type         text
payload            jsonb
processed_at       timestamptz
```

### Objetivo

- impedir duplicidade;
- permitir auditoria;
- registrar falhas;
- reprocessar eventos com segurança.

---

## 7. Segurança

## 7.1 Row Level Security

Todas as tabelas expostas devem usar RLS.

### Regras essenciais

```text
Usuário autenticado:
- lê somente seus próprios registros;
- cria somente registros com user_id = auth.uid();
- altera somente seus próprios registros;
- exclui somente seus próprios registros.

Usuário premium ativo:
- cria músicas;
- cria projetos;
- cria arquivos em nuvem;
- usa sincronização.

Usuário gratuito:
- utiliza persistência local;
- lê perfil e assinatura;
- não insere dados premium.

Frontend:
- nunca recebe service_role;
- nunca recebe credenciais do R2;
- nunca define plan = premium.
```

---

## 7.2 Verificação da assinatura

A aplicação não deve confiar em:

- `localStorage`;
- flags manipuláveis no frontend;
- campos enviados pelo cliente;
- informações de interface.

A permissão premium deve ser verificada no backend por meio da tabela `subscriptions`.

---

## 7.3 Segredos

Somente Functions podem acessar:

```text
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET
APP_URL
```

O frontend poderá usar apenas:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 8. Fluxo da funcionalidade atual

## 8.1 Detecção gratuita

```text
1. Usuário seleciona um arquivo de áudio.
2. O Tapper lê o arquivo localmente.
3. O navegador decodifica o áudio.
4. O algoritmo detecta a tonalidade.
5. O resultado aparece na interface.
6. O áudio permanece no computador.
```

Nenhum upload deve ocorrer automaticamente.

---

## 8.2 Salvamento premium

```text
1. O usuário analisa a música.
2. Clica em “Salvar no Tapper Cloud”.
3. O registro da música é criado no Supabase.
4. O projeto e o resultado são salvos.
5. Opcionalmente, o usuário ativa “Guardar áudio na nuvem”.
6. O navegador solicita uma URL temporária.
7. A Netlify Function verifica assinatura e cota.
8. A Function gera uma URL assinada do R2.
9. O navegador envia o arquivo diretamente ao R2.
10. O banco registra o upload como concluído.
```

---

## 9. Correções necessárias no código

## 9.1 Etapa 1 — Isolar a key detection

Remover da interface qualquer lógica direta de análise.

### Estrutura sugerida

```text
src/
├── features/
│   └── key-detection/
│       ├── components/
│       ├── hooks/
│       │   └── useKeyDetection.js
│       ├── services/
│       │   └── detectKey.js
│       └── models/
│           └── createSongAnalysis.js
```

### Regras para `detectKey`

A função deve:

- receber um arquivo ou `AudioBuffer`;
- não conhecer React;
- não acessar Supabase;
- não acessar R2;
- não acessar a interface;
- retornar um objeto padronizado.

### Exemplo de retorno

```js
{
  key: "F#",
  mode: "minor",
  confidence: 0.83,
  durationMs: 214000
}
```

---

## 9.2 Etapa 2 — Criar camada de persistência

A interface não deve chamar IndexedDB ou Supabase diretamente.

### Estrutura sugerida

```text
src/
├── repositories/
│   ├── songRepository.js
│   ├── localSongRepository.js
│   └── cloudSongRepository.js
├── services/
│   ├── authService.js
│   ├── entitlementService.js
│   ├── projectService.js
│   └── cloudStorageService.js
```

### Contrato comum

```js
songRepository.create(song)
songRepository.findById(id)
songRepository.list(filters)
songRepository.update(id, changes)
songRepository.remove(id)
```

### Implementações

```text
Free     → localSongRepository → IndexedDB
Premium  → cloudSongRepository → Supabase
```

Isso impede que a interface precise ser reescrita caso a infraestrutura mude.

---

## 9.3 Etapa 3 — Substituir `localStorage` por IndexedDB

Adicionar campos de sincronização:

```text
sync_status:
- local
- pending
- synced
- conflict
```

### Dados locais

- análise;
- projeto;
- música;
- estado da interface;
- dados pendentes;
- arquivos temporários;
- blobs.

---

## 9.4 Etapa 4 — Configurar Netlify

Criar:

```text
netlify.toml
netlify/functions/
public/_redirects
```

### Exemplo de `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Objetivos

- hospedar o Vite;
- permitir rotas SPA;
- executar pequenas Functions;
- armazenar variáveis de ambiente;
- gerar deploy automático pelo GitHub.

---

## 9.5 Etapa 5 — Implementar autenticação

Primeira versão:

- cadastro por e-mail e senha;
- login;
- recuperação de senha;
- sessão persistente;
- logout;
- exclusão de conta.

### Regra de experiência

Não exigir login para:

- enviar áudio;
- detectar tonalidade;
- usar recursos locais;
- usar o histórico local.

Solicitar login apenas para:

- Tapper Cloud;
- biblioteca sincronizada;
- assinatura;
- armazenamento;
- restauração entre dispositivos.

---

## 9.6 Etapa 6 — Implementar biblioteca premium

Criar rotas:

```text
/cloud
/cloud/songs
/cloud/songs/:id
/cloud/projects
/account/subscription
/account/storage
```

### Funcionalidades iniciais

- criar registro após análise;
- listar músicas;
- pesquisar por título;
- pesquisar por artista;
- filtrar por tonalidade;
- editar notas;
- editar tags;
- editar BPM;
- corrigir tonalidade;
- excluir música;
- abrir novamente um projeto;
- exibir cota usada;
- exibir espaço restante.

---

## 9.7 Etapa 7 — Implementar Cloudflare R2

Criar Functions:

```text
netlify/functions/create-upload-url.js
netlify/functions/create-download-url.js
netlify/functions/finalize-upload.js
netlify/functions/delete-cloud-file.js
```

### Regras

- aceitar somente usuários autenticados;
- verificar assinatura ativa;
- verificar espaço disponível;
- validar MIME type;
- limitar arquivo a 100 MB;
- impedir caminhos arbitrários;
- gerar URLs com expiração curta;
- configurar CORS somente para o domínio do Tapper;
- calcular e armazenar checksum;
- impedir upload sem registro correspondente.

---

## 9.8 Etapa 8 — Implementar assinatura

Usar Mercado Pago Subscriptions.

### Fluxo

```text
1. Usuário clica em Assinar.
2. Function cria ou recupera o plano.
3. Usuário conclui a assinatura no Mercado Pago.
4. Mercado Pago envia um webhook.
5. Function valida o evento.
6. subscriptions.status passa para active.
7. O frontend atualiza as permissões.
```

### Functions necessárias

```text
create-subscription.js
mercadopago-webhook.js
cancel-subscription.js
subscription-status.js
```

---

## 10. Política de cancelamento

A política não deve ser hostil.

```text
Assinatura ativa:
- leitura e escrita;
- novos uploads;
- sincronização.

Pagamento atrasado:
- período de tolerância;
- nenhuma exclusão imediata.

Cancelada:
- biblioteca somente leitura por 30 dias;
- exportação permitida;
- novos uploads bloqueados.

Após 30 dias:
- áudio pode ser excluído;
- avisos devem ser enviados antes;
- metadados podem permanecer para exportação.
```

---

## 11. Ordem de implementação

## PR 1 — Preparação do frontend

- isolar key detection;
- criar modelo padronizado de análise;
- remover dependências entre análise e interface;
- configurar Netlify;
- validar deploy da PWA.

---

## PR 2 — Persistência local

- instalar camada de IndexedDB;
- implementar `localSongRepository`;
- salvar histórico;
- salvar projetos locais;
- permitir exportação JSON;
- permitir importação JSON.

---

## PR 3 — Supabase

- criar projeto;
- configurar Auth;
- criar migrations;
- criar tabelas;
- ativar RLS;
- implementar políticas;
- implementar `cloudSongRepository`.

---

## PR 4 — Biblioteca premium

- implementar CRUD de músicas;
- implementar filtros;
- implementar notas;
- implementar tags;
- implementar projetos salvos;
- implementar sincronização entre dispositivos.

---

## PR 5 — Armazenamento R2

- criar bucket privado;
- configurar CORS;
- implementar URLs assinadas;
- controlar cota;
- permitir upload;
- permitir download;
- permitir exclusão;
- atualizar uso de armazenamento.

---

## PR 6 — Pagamentos

- criar assinatura de R$ 9,99;
- implementar checkout;
- receber webhooks;
- ativar permissões;
- suspender permissões;
- impedir alteração de plano pelo cliente.

---

## PR 7 — Segurança e lançamento

- testar RLS;
- testar adulteração de requisições;
- testar acesso entre usuários;
- testar upload acima da cota;
- testar webhook duplicado;
- testar cancelamento;
- testar pagamento atrasado;
- implementar exclusão de conta;
- implementar exportação de dados;
- adicionar política de privacidade;
- adicionar termos de uso.

---

## 12. Critérios para lançar o MVP premium

O MVP estará pronto quando:

- a key detection funcionar sem login;
- o usuário gratuito puder salvar localmente;
- o premium puder criar músicas;
- o premium puder editar músicas;
- o premium puder excluir músicas;
- os dados aparecerem em outro computador após login;
- o projeto restaurar o estado da análise;
- nenhum usuário acessar registros de outro;
- o frontend não expuser segredos;
- arquivos forem enviados diretamente ao R2;
- a assinatura controlar permissões automaticamente;
- cancelamento for tratado;
- falha de pagamento for tratada;
- exportação estiver disponível;
- exclusão de conta estiver disponível.

---

## 13. Quando voltar a usar Oracle Cloud

Não usar Oracle Cloud no primeiro lançamento.

Adicionar uma VPS apenas quando existir necessidade concreta de:

- processamento de áudio no servidor;
- FFmpeg;
- conversão de formatos;
- geração de waveform pesada;
- separação de stems;
- tarefas demoradas;
- filas;
- WebSockets;
- colaboração em tempo real;
- IA;
- jobs agendados;
- workers.

Nesse cenário, a Oracle poderá entrar como **worker de processamento**, sem substituir Netlify, Supabase ou R2.

---

## 14. Gatilhos para sair do ecossistema gratuito

### Netlify

- upgrade ao atingir uso recorrente elevado;
- upgrade quando uma pausa por consumo não puder ser tolerada;
- upgrade quando houver receita recorrente suficiente.

### Supabase

- upgrade quando o banco crescer de forma relevante;
- upgrade quando a operação exigir garantia maior de disponibilidade;
- upgrade quando houver assinantes suficientes para justificar o custo.

### Cloudflare R2

- manter o serviço;
- pagar apenas o excedente;
- revisar a cota conforme o consumo real.

### Produto

- medir armazenamento médio por assinante;
- medir quantidade média de músicas;
- medir quantidade média de projetos;
- revisar a cota de 1 GB com dados reais;
- revisar o preço após validar a demanda.

---

## 15. Resultado esperado

```text
Netlify           frontend e pequenas Functions
Supabase          autenticação, banco e RLS
Cloudflare R2     áudio e projetos
Mercado Pago      assinatura recorrente
IndexedDB         experiência gratuita e offline
Oracle Cloud      fora do MVP
```

Essa estrutura:

- preserva a funcionalidade atual;
- mantém o custo inicial próximo de zero;
- evita dependência prematura de uma VPS;
- permite lançar a assinatura de R$ 9,99;
- oferece valor real ao usuário premium;
- cria uma base sustentável para futuras funcionalidades;
- permite reintroduzir a Oracle somente quando houver necessidade técnica real.

---

## 16. Referências oficiais

- Netlify Pricing: https://www.netlify.com/pricing/
- Netlify Functions: https://docs.netlify.com/build/functions/overview/
- Netlify Vite Guide: https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Pricing: https://supabase.com/pricing
- Supabase Free Project Pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 Presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare R2 CORS: https://developers.cloudflare.com/r2/buckets/cors/
- Mercado Pago Subscriptions: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview
