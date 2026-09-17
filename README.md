# Tapper

Aplicação web voltada para análise musical, reunindo ferramentas para detecção de andamento e tonalidade.

## Funcionalidades

### Tap BPM

Permite estimar o BPM (batidas por minuto) de uma música a partir de toques realizados pelo usuário.

### Key Detector

Analisa arquivos de áudio ou gravações curtas do microfone para estimar:

- tônica;
- modo maior ou menor;
- código Camelot;
- nível de confiança;
- tonalidade alternativa.

A análise principal de áudio é executada diretamente no navegador.

## Processamento de áudio

O Tapper utiliza recursos nativos da Web Audio API para processamento de áudio no dispositivo.

De forma simplificada, o processo de detecção de tonalidade envolve:

```text
Áudio
  ↓
Decodificação
  ↓
Análise espectral
  ↓
Extração de características tonais
  ↓
Estimativa da tonalidade
  ↓
Resultado
```

Arquivos selecionados para análise são processados localmente no navegador, evitando uploads desnecessários.

Gravações realizadas pelo microfone também são processadas no dispositivo.

## Persistência local

O Tapper permite armazenar localmente análises e projetos no navegador.

O usuário pode:

- consultar análises anteriores;
- excluir dados armazenados;
- exportar um backup;
- importar backups anteriormente exportados.

## Tapper Cloud

O projeto também possui recursos de conta e sincronização em nuvem.

Entre as funcionalidades implementadas estão:

- cadastro e autenticação;
- recuperação de conta;
- persistência de sessão;
- armazenamento de projetos;
- gerenciamento de arquivos;
- controle de assinatura;
- exclusão de conta e dados associados.

A arquitetura separa operações disponíveis ao cliente de operações administrativas executadas no backend.

Credenciais e segredos administrativos não são armazenados no código do frontend.

## Tecnologias

Entre as principais tecnologias utilizadas no projeto estão:

- React;
- JavaScript;
- Web Audio API;
- IndexedDB;
- Supabase;
- Netlify Functions;
- Cloudflare R2;
- Mercado Pago.

## Desenvolvimento

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

### Validação

```bash
npm run lint
npm test
npm run build
```

## Configuração

Variáveis públicas necessárias para integrações externas devem ser configuradas através de variáveis de ambiente.

Utilize o arquivo `.env.example` como referência para configurar o ambiente local.

> Segredos, credenciais administrativas e chaves privadas não devem ser adicionados ao repositório.

## Limitações da análise

A detecção de tonalidade é uma estimativa baseada em análise de características tonais do áudio.

Alguns casos podem apresentar ambiguidade, especialmente:

- músicas com mudanças de tonalidade;
- composições modais;
- trechos com pouca informação harmônica;
- tonalidades relativas, como C maior e A menor.

Por esse motivo, o Tapper pode apresentar uma tonalidade alternativa e um indicador de confiança juntamente com o resultado principal.

## Privacidade

O processamento principal dos arquivos utilizados pelo Key Detector ocorre localmente no navegador.

Recursos que dependem da conta e da sincronização em nuvem utilizam serviços externos apenas quando necessário para essas funcionalidades.

## Licença

Este projeto é um software proprietário.

O código-fonte está disponível publicamente apenas para fins de portfólio, análise educacional e avaliação.

Não é concedida permissão para copiar, modificar, distribuir, sublicenciar, vender ou utilizar este software ou qualquer parte de seu código-fonte sem autorização expressa do autor.

Consulte o arquivo LICENSE para obter detalhes.

Copyright © 2026 Bruno Victor Oliveira. Todos os direitos reservados.
