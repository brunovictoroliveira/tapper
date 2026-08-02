# Tapper Cloud — Checklist de implementação e tarefas manuais

Atualizada em 2 de agosto de 2026.

Legenda:

- `[x]` concluído e validado no repositório;
- `[~]` implementação de código concluída, mas configuração ou homologação externa pendente;
- `[ ]` depende de execução manual, credenciais, serviço externo ou aprovação humana.

## Implementação concluída

### PR 1 — Preparação do frontend

- [x] Isolar a detecção de tonalidade em serviço independente de React.
- [x] Criar o modelo padronizado de análise.
- [x] Executar a detecção localmente no navegador, sem upload automático.
- [x] Configurar Netlify, fallback SPA, PWA e cabeçalhos de segurança.
- [x] Remover a dependência do frontend em relação ao backend FastAPI.

### PR 2 — Persistência local

- [x] Configurar IndexedDB para músicas, projetos, blobs e fila de sincronização.
- [x] Implementar `localSongRepository` e `localProjectRepository`.
- [x] Salvar automaticamente análises e projetos locais.
- [x] Implementar histórico local e remoção em cascata.
- [x] Implementar importação e exportação JSON versionada.
- [x] Cobrir o IndexedDB com testes de integração.

### PR 3 — Supabase e autenticação

- [x] Adicionar cliente Supabase configurável por variáveis públicas.
- [x] Implementar cadastro, login, logout, sessão persistente e recuperação de senha.
- [x] Criar migrations para perfis, assinaturas, músicas, projetos, versões, arquivos e eventos de pagamento.
- [x] Ativar RLS e definir políticas por proprietário e assinatura.
- [x] Restringir operações administrativas e colunas sensíveis à `service_role`.
- [x] Implementar `cloudSongRepository` e `cloudProjectRepository`.

### PR 4 — Biblioteca premium

- [x] Criar `/cloud`, `/cloud/songs`, `/cloud/songs/:id`, `/cloud/projects` e detalhes de projeto.
- [x] Implementar listagem, pesquisa por título/artista e filtro de tonalidade.
- [x] Implementar edição de título, artista, álbum, notas, tags, BPM e tonalidade manual.
- [x] Implementar exclusão de músicas.
- [x] Implementar sincronização idempotente do histórico local com a nuvem.
- [x] Implementar restauração de projetos no dispositivo.
- [x] Implementar histórico das cinco versões mais recentes.
- [x] Exibir cota e uso de armazenamento.

### PR 5 — Cloudflare R2

- [x] Implementar Functions para upload, finalização, download e exclusão.
- [x] Implementar URLs assinadas com validade curta.
- [x] Limitar arquivos a 100 MB e validar MIME type.
- [x] Implementar checksum SHA-256 e confirmação do objeto com `HEAD`.
- [x] Implementar reserva atômica de cota no PostgreSQL.
- [x] Impedir caminhos arbitrários e uploads sem música/registro correspondente.
- [x] Implementar upload direto do navegador para o R2.
- [x] Criar modelo de política CORS em `docs/r2-cors.example.json`.

### PR 6 — Mercado Pago

- [x] Implementar criação da assinatura mensal de R$ 9,99.
- [x] Implementar consulta e cancelamento da assinatura.
- [x] Implementar validação HMAC do webhook.
- [x] Implementar processamento idempotente e registro de falhas/tentativas.
- [x] Atualizar permissões e plano a partir do estado autoritativo do Mercado Pago.
- [x] Implementar período de tolerância e modo somente leitura após cancelamento.

### PR 7 — Segurança e lançamento

- [x] Implementar exportação completa em JSON e ZIP, incluindo áudios.
- [x] Implementar exclusão de conta, assinatura, registros e objetos R2.
- [x] Criar minutas técnicas de política de privacidade e termos de uso.
- [x] Adicionar Content Security Policy e demais cabeçalhos de segurança.
- [x] Adicionar workflow de CI para testes, lint e build.
- [x] Verificar localmente que nenhuma chave administrativa entra no bundle do frontend.
- [x] Validar todas as rotas principais no preview de produção.

## Validações automatizadas concluídas

- [x] 20 testes automatizados aprovados.
- [x] CRUD e remoção em cascata do IndexedDB testados.
- [x] Contratos de análise, persistência, Supabase e R2 testados.
- [x] Assinatura HMAC e mapeamento de estados do Mercado Pago testados.
- [x] Todas as Netlify Functions carregam e exportam um `handler` válido.
- [x] Linter executado sem erros ou avisos.
- [x] Build Vite de produção concluído.
- [x] `git diff --check` aprovado.
- [x] Rotas `/`, `/key`, `/cloud`, `/cloud/songs`, `/cloud/projects`, `/account`, `/account/subscription`, `/account/storage`, `/privacy` e `/terms` responderam HTTP 200 no preview local.

## Tarefas parcialmente concluídas

- [~] **Supabase:** cliente, autenticação, migrations e RLS estão implementados; faltam criar/vincular o projeto remoto, aplicar as migrations e homologar o isolamento entre contas.
- [~] **Netlify:** build, Functions, redirects e cabeçalhos estão configurados; faltam conectar o repositório, cadastrar variáveis e validar o deploy no domínio definitivo.
- [~] **Cloudflare R2:** assinatura de URLs, cota, checksum, upload, download e exclusão estão implementados; faltam criar os buckets, aplicar CORS e homologar com credenciais reais.
- [~] **Mercado Pago:** criação, status, cancelamento e webhook idempotente estão implementados; faltam configurar a aplicação, inserir credenciais e concluir testes de cobrança.
- [~] **Privacidade e termos:** as minutas técnicas e rotas públicas estão prontas; faltam dados do responsável e revisão jurídica.
- [~] **Cancelamento e retenção:** bloqueio de escrita, exportação e exclusão voluntária estão implementados; faltam aprovar a política, configurar avisos e autorizar a rotina pós-retenção.
- [~] **Precisão tonal:** algoritmo e testes determinísticos estão prontos; falta homologar com um catálogo representativo de músicas conhecidas.
- [~] **Lançamento:** testes automatizados e preview local passaram; faltam homologação multidispositivo, acessibilidade, observabilidade, custos e aceite final.

## Tarefas manuais pendentes

Os itens abaixo não podem ser concluídos somente pelo código do repositório. Devem ser atualizados à medida que as configurações e aprovações acontecerem.

## Supabase

- [ ] Criar um projeto Supabase para desenvolvimento/staging.
- [ ] Copiar a URL do projeto e a chave pública para `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente local e no Netlify.
- [ ] Guardar `SUPABASE_SERVICE_ROLE_KEY` somente nas variáveis protegidas das Netlify Functions; nunca usar uma variável `VITE_*` para esse segredo.
- [ ] Executar `npx supabase login` e `npx supabase link --project-ref <PROJECT_REF>` com uma conta autorizada.
- [ ] Revisar o resultado de `npx supabase db push --dry-run` e, depois, autorizar `npx supabase db push` para aplicar as migrations.
- [ ] Criar duas contas de homologação e confirmar que nenhuma delas consegue ler, alterar ou excluir músicas, projetos e arquivos da outra.
- [ ] Configurar no Supabase Auth a Site URL de produção e os redirects de desenvolvimento, preview e `/account/reset-password`.
- [ ] Personalizar e revisar os e-mails de confirmação de conta e recuperação de senha.
- [ ] Definir um provedor SMTP de produção antes do lançamento, caso os limites do envio padrão não sejam suficientes.

## Netlify e domínio

- [ ] Conectar o repositório GitHub ao site Netlify e selecionar a branch de produção.
- [ ] Cadastrar no Netlify todas as variáveis listadas em `.env.example`, separando preview e produção.
- [ ] Configurar o domínio definitivo, DNS e HTTPS.
- [ ] Confirmar manualmente que instalação PWA, rotas SPA e microfone funcionam no domínio publicado.

## Cloudflare R2

- [ ] Criar um bucket R2 privado para desenvolvimento e outro para produção.
- [ ] Criar credenciais R2 com acesso limitado aos buckets do Tapper.
- [ ] Cadastrar `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET_NAME` somente no Netlify.
- [ ] Aplicar a política CORS gerada pelo projeto usando exatamente os domínios de produção e preview aprovados.
- [ ] Homologar upload válido, MIME inválido, arquivo acima de 100 MB, cota excedida, download e exclusão no bucket real.
- [ ] Definir uma regra operacional de retenção para objetos abandonados com status `pending`.

## Mercado Pago

- [ ] Criar ou selecionar a aplicação Mercado Pago da empresa responsável pelo Tapper.
- [ ] Obter credenciais de teste e produção e cadastrar `MERCADO_PAGO_ACCESS_TOKEN` somente no Netlify.
- [ ] Gerar e cadastrar `MERCADO_PAGO_WEBHOOK_SECRET`.
- [ ] Confirmar em ambiente de teste que a `notification_url` criada pela Function aponta para o deploy público e recebe os eventos de assinatura.
- [ ] Executar o checkout completo com usuários/cartões de teste e aprovar a passagem para produção.
- [ ] Reenviar o mesmo webhook de teste e confirmar no Supabase que o evento foi processado uma única vez.
- [ ] Confirmar os dados comerciais, descrição e preço mensal de R$ 9,99 antes de ativar cobranças reais.

## Produto, jurídico e operação

- [ ] Informar razão social ou nome do responsável, CNPJ/CPF quando aplicável, endereço de contato e e-mail de privacidade/suporte.
- [ ] Revisar com responsável jurídico a política de privacidade, os termos de uso, a base legal LGPD e o fluxo de exclusão de dados.
- [ ] Substituir o aviso “Minuta técnica” em `/privacy` e `/terms` somente depois da aprovação jurídica e preencher os dados do controlador, atendimento e foro.
- [ ] Aprovar a política final de cancelamento, tolerância, retenção por 30 dias e exclusão posterior dos áudios.
- [ ] Definir o canal e o provedor para avisos de pagamento atrasado, cancelamento e exclusão iminente.
- [ ] Autorizar a ativação do job de exclusão pós-retenção somente depois que os avisos ao usuário estiverem funcionando.
- [ ] Fornecer um conjunto representativo de músicas com tonalidade conhecida para validar a precisão da detecção local.
- [ ] Executar homologação manual em Chrome, Firefox e Safari, incluindo Android e iOS.
- [ ] Validar acessibilidade por teclado e com ao menos um leitor de tela antes do lançamento.
- [ ] Autorizar uma cobrança real de baixo risco e o respectivo estorno/cancelamento antes de abrir o produto ao público.

## Aprovação final de lançamento

- [ ] Confirmar que nenhuma chave administrativa aparece nos logs públicos ou nos artefatos do deploy real do Netlify.
- [ ] Revisar métricas, alertas de custo e limites gratuitos de Netlify, Supabase e R2.
- [ ] Aprovar backups, restauração, exclusão de conta e exportação completa em ambiente de produção.
- [ ] Dar o aceite final para ativar a assinatura e divulgar o Tapper Cloud.
