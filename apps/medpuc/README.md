# MedPUC

Plataforma web de organização acadêmica para estudantes de Medicina: calendário de provas, disciplinas com conteúdos e
progresso, tarefas e caderno digital — cada aluno com a própria conta e os dados isolados no banco.

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · React Router 7 · TanStack Query · Supabase (Auth + Postgres + RLS) ·
TipTap · Vitest · Playwright · Netlify.

> O MedPUC é uma ferramenta independente e não é um serviço oficial da PUCPR. Nenhuma data oficial vem cadastrada: o
> modelo do 3º período traz só os nomes das disciplinas, e cada aluno registra as datas da própria turma.

---

## Funcionalidades

| Área | O que faz |
| --- | --- |
| **Contas** | Cadastro (nome, e-mail, senha) com confirmação por e-mail, login, logout, recuperação e redefinição de senha, sessão persistente, páginas privadas protegidas, mensagens em português. |
| **Painel** | Saudação, data, próxima prova com contagem regressiva, compromissos da semana, próximos compromissos, tarefas pendentes, progresso de estudo e resumo das disciplinas. Atalhos para prova, anotação e tarefa. |
| **Calendário** | Visões mensal, semanal e diária; criar, editar e excluir (com confirmação); tipos prova, avaliação prática, trabalho, entrega, aula, revisão e outro; cor da disciplina; filtros por disciplina e tipo; camadas de prazos de tarefas e de estudos planejados. |
| **Disciplinas** | Cartões com cor, próxima avaliação, tarefas pendentes e progresso. Página da disciplina com abas *Visão geral*, *Conteúdos*, *Avaliações e datas*, *Anotações* e *Tarefas*. |
| **Conteúdos** | Assunto, data prevista, status (não iniciado / em andamento / concluído), observações, edição, exclusão e reordenação. O progresso é calculado a partir deles. |
| **Caderno digital** | Editor com títulos, subtítulos, listas e checklists; salvamento automático com indicador ("Salvando…", "Salvo às 14:32", erro com "Tentar novamente"); detecção de edição em outro dispositivo; pesquisa por título e conteúdo, sem diferenciar acentos; filtro por disciplina e ordenação. |
| **Tarefas** | Título, prazo, prioridade, status e descrição; conclusão com um toque; filtros. |
| **Configuração inicial** | O aluno copia disciplinas (e, se houver, datas) de um modelo publicado para a própria conta e depois ajusta nomes, cores e datas. |
| **Administração** | Administradores criam modelos de período, cadastram disciplinas e datas oficiais — uma a uma ou colando listas de uma planilha. |
| **Perfil** | Nome, instituição, curso e período; troca de senha; plano e uso por recurso; exclusão definitiva da conta. |
| **Página do produto** | Apresentação comercial e página de planos (lida do banco). |

Notificações por e-mail/push, recorrência de eventos e cobrança **não** estão implementadas (ver
[Pendências](#funcionalidades-que-dependem-de-configuração-externa-ou-ainda-não-existem)).

---

## Arquitetura

```
Navegador (React SPA, Netlify)
  ├─ páginas e componentes ── só falam com hooks
  ├─ hooks (TanStack Query) ── cache, carregamento, invalidação após salvar
  ├─ serviços ─────────────── única camada que conhece o Supabase e os nomes de coluna
  └─ supabase-js (chave PÚBLICA) ──► Supabase
                                       ├─ Auth (e-mail e senha)
                                       └─ Postgres + RLS (a barreira real)
```

Decisões principais:

- **Segurança no banco, não na tela.** Toda tabela com dado privado tem RLS para `select`, `insert`, `update` e
  `delete` com `auth.uid() = user_id`. As tabelas filhas referenciam a disciplina por `(disciplina_id, user_id)`: é
  impossível, no próprio banco, ligar um registro à disciplina de outro aluno.
- **Fonte única de eventos.** Provas, trabalhos e aulas vivem só em `eventos`. A aba *Avaliações e datas* e o calendário
  leem a mesma tabela, então nada é duplicado. Prazos de tarefas e datas de estudo aparecem no calendário como camadas
  de leitura das próprias tabelas.
- **Anotações num modelo só.** Gerais e de disciplina usam `anotacoes` (`disciplina_id` nulo = geral). O documento do
  editor fica em `conteudo` (JSON) e o texto puro em `texto`, usado pela pesquisa.
- **Plano não é editável pelo aluno.** O plano vigente sai de `assinaturas`, que o aluno só lê; os limites ficam em
  `planos.limites` e são aplicados por gatilho no banco (erro `MP001`, traduzido na interface).
- **Chave secreta nunca vai ao navegador.** O app só lê `VITE_SUPABASE_PUBLISHABLE_KEY` e se recusa a iniciar se receber
  uma chave secreta/service role.

### Estrutura

```
apps/medpuc/
├─ index.html, vite.config.ts, tsconfig*.json, playwright.config.ts, vitest.api.config.ts
├─ public/                     favicon, robots.txt
├─ src/
│  ├─ main.tsx, App.tsx        entrada e rotas
│  ├─ index.css                tema (bordô, cinzas quentes, Fraunces + Inter)
│  ├─ lib/                     configuração, cliente Supabase, erros, datas, cores, validação, resumo, importação
│  ├─ tipos/                   banco.ts (gerado) e dominio.ts (tipos e rótulos)
│  ├─ servicos/                acesso ao Supabase: auth, perfil, disciplinas, eventos, conteúdos, tarefas, anotações, modelos
│  ├─ hooks/                   React Query por recurso, salvamento automático, utilitários
│  ├─ contextos/               sessão e avisos
│  ├─ rotas/                   guardas (privada, visitante, admin)
│  ├─ componentes/             ui/, layout/, calendario/, eventos/, disciplinas/, conteudos/, tarefas/, anotacoes/, marketing/
│  ├─ paginas/                 publicas/, app/ (painel, calendário, disciplinas, anotações…), admin/
│  └─ testes/                  utilitários de teste
├─ supabase/
│  ├─ config.toml              ambiente local
│  ├─ migrations/              SQL versionado (ver abaixo)
│  ├─ templates/               e-mails do Auth em português
│  └─ tests/database/          testes pgTAP de RLS
└─ testes/
   ├─ api/                     isolamento verificado pela API REST
   └─ e2e/                     Playwright (desktop e celular)
```

O repositório também contém o app **Vence** (`apps/mobile`, `packages/core`, `supabase/` na raiz), que é independente:
o MedPUC tem `package-lock.json` próprio e não faz parte dos workspaces da raiz.

---

## Banco de dados

### Arquivos SQL (aplicar nesta ordem)

| Migration | Conteúdo |
| --- | --- |
| `supabase/migrations/20261018120000_base.sql` | `planos`, `perfis` (criado no cadastro), `assinaturas`, `administradores`, `eh_admin()`, `meu_plano()`, schema `privado` |
| `supabase/migrations/20261018120100_academico.sql` | enums, `modelos_periodo`, `modelos_disciplinas`, `modelos_eventos`, `disciplinas`, `eventos`, `conteudos`, `tarefas`, `anotacoes`, índices, gatilhos de `updated_at` |
| `supabase/migrations/20261018120200_seguranca.sql` | privilégios explícitos e todas as políticas RLS |
| `supabase/migrations/20261018120300_funcoes.sql` | limites por plano, `importar_modelo`, `buscar_anotacoes`, `reordenar_conteudos`, `excluir_minha_conta` |
| `supabase/migrations/20261018120400_dados_iniciais.sql` | planos Gratuito (até 20 disciplinas) e Premium (indisponível), modelo do 3º período com as 8 disciplinas, sem datas |

### Tabelas

| Tabela | Dono | Aluno pode |
| --- | --- | --- |
| `perfis` | o usuário (`id`) | ler e editar o próprio |
| `planos` | catálogo | ler (inclusive sem login) |
| `assinaturas` | o usuário | **só ler** a própria — escrita apenas pelo backend |
| `administradores` | o usuário | **só ler** o próprio registro |
| `modelos_*` | administração | ler os publicados; administradores gerenciam |
| `disciplinas`, `eventos`, `conteudos`, `tarefas`, `anotacoes` | o usuário | ler, criar, editar e excluir os próprios |

Remover uma disciplina exclui seus conteúdos, avaliações e tarefas; as anotações ficam, como gerais.

---

## Variáveis de ambiente

| Variável | Onde | Valor |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env.local` e Netlify | `https://<projeto>.supabase.co` (Project Settings → API) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` e Netlify | chave **publishable** (`sb_publishable_…`) ou a `anon` legada |

Copie `.env.example` para `.env.local`. **Nunca** use a secret key / service role aqui: tudo que começa com `VITE_` é
embutido no JavaScript público. Se uma chave secreta for detectada, o app mostra "Configuração incompleta" em vez de
iniciar. `VITE_SUPABASE_ANON_KEY` também é aceita, para projetos com as chaves legadas.

---

## Executar localmente

Pré-requisitos: Node 20.19+ (testado com 22) e, para o Supabase local, Docker.

```bash
cd apps/medpuc
npm install

# Opção A — Supabase local (recomendado para desenvolver e testar)
npm run db:start                 # sobe Postgres, Auth, API e Mailpit e aplica as migrations
npm run supabase -- status       # mostra API_URL e PUBLISHABLE_KEY
# crie .env.local com:
#   VITE_SUPABASE_URL=http://127.0.0.1:54321
#   VITE_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY do status>
npm run dev                      # http://localhost:5173

# E-mails de confirmação e de senha chegam no Mailpit: http://127.0.0.1:54324

# Opção B — projeto Supabase na nuvem
# configure o projeto (seção abaixo) e preencha .env.local com a URL e a chave pública dele
npm run dev
```

Outros comandos: `npm run build`, `npm run preview`, `npm run db:reset` (recria o banco local),
`npm run db:types` (regenera `src/tipos/banco.ts` depois de mudar o esquema).

---

## Configurar o Supabase (produção)

1. **Criar o projeto** em [supabase.com](https://supabase.com) (região São Paulo, `sa-east-1`, fica mais perto dos
   alunos).
2. **Aplicar as migrations** — escolha uma forma:
   - CLI: `cd apps/medpuc && npm run supabase -- login`, depois `npm run supabase -- link --project-ref <ref>` e
     `npm run supabase -- db push`.
   - Ou no painel: *SQL Editor* → execute os cinco arquivos de `supabase/migrations/` na ordem da tabela acima.
3. **Authentication → URL Configuration**
   - *Site URL*: o endereço do Netlify (ex.: `https://medpuc.netlify.app` ou seu domínio).
   - *Redirect URLs*: `https://SEU-DOMINIO/**` e, para desenvolver, `http://localhost:5173/**`.
     Sem isso, os links de confirmação e de redefinição de senha não voltam para o app.
4. **Authentication → Providers → Email**: mantenha *Confirm email* ligado; em *Password requirements*, defina mínimo de
   8 caracteres com letras e números (o app já valida isso antes de enviar).
5. **Authentication → Emails → Templates**: cole o conteúdo de `supabase/templates/confirmacao.html`,
   `recuperacao.html` e `troca-email.html` nos modelos *Confirm signup*, *Reset password* e *Change email address*
   (assuntos sugeridos estão em `supabase/config.toml`).
6. **SMTP próprio** (*Authentication → Emails → SMTP Settings*): o servidor de e-mail padrão do Supabase tem limite baixo
   de envios por hora e serve só para testes. Para uso real, configure um provedor (Resend, Amazon SES, SendGrid, etc.).
7. **Primeiro administrador** (para gerenciar os modelos): no *SQL Editor*, depois de criar sua conta no app:
   ```sql
   insert into public.administradores (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com';
   ```
8. Depois de aplicar as migrations, confira *Advisors → Security* no painel do projeto.

Para mudar limites de plano: `update public.planos set limites = '{"disciplinas": 30}' where id = 'gratuito';`.

---

## Publicar no Netlify

O arquivo `netlify.toml` fica na **raiz do repositório** e já define:

- base `apps/medpuc`, comando `npm run build`, publicação de `dist`, Node 22;
- redirecionamento de todas as rotas para `index.html` (SPA);
- cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, etc.) e cache longo para `/assets/*`.

No Netlify, o build **falha de propósito** se `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` estiverem ausentes
ou se a chave for secreta, com a mensagem `[MedPUC] …` no log. Assim um site quebrado (ou com a chave secreta exposta)
nunca chega a ser publicado.

Passo a passo:

1. **Antes**: tenha o projeto Supabase de produção pronto (seção anterior), com as migrations aplicadas.
2. Netlify → *Add new project* → *Import an existing project* → GitHub → escolha este repositório e o branch `main`.
3. Na tela de configuração do build:
   - o repositório é um monorepo (também contém o app Vence). Se o Netlify perguntar qual projeto publicar ou mostrar
     o campo *Base directory*, informe **`apps/medpuc`**;
   - os demais campos vêm do `netlify.toml` (*Build command* `npm run build`, *Publish directory* `dist`); deixe-os
     como estão.
4. Ainda nessa tela (ou depois, em *Project configuration → Environment variables*), crie:
   - `VITE_SUPABASE_URL` = `https://<projeto>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = a chave **publishable** (`sb_publishable_…`) ou a `anon` legada.
   Não defina `NODE_ENV=production` nas variáveis: o build precisa das devDependencies (Vite, TypeScript).
5. *Deploy*. Se o log mostrar `[MedPUC] …`, corrija a variável indicada e use *Retry deploy*.
6. Copie o endereço publicado (ex.: `https://medpuc.netlify.app`) para *Site URL* e *Redirect URLs* do Supabase
   (`https://medpuc.netlify.app/**`). Para que cadastro e recuperação de senha funcionem também nos *Deploy Previews*,
   acrescente `https://**--medpuc.netlify.app/**` (troque `medpuc` pelo nome do seu projeto no Netlify).
7. Teste no endereço publicado: cadastro (o e-mail de confirmação precisa chegar), login, criação de uma prova, uma
   anotação (recarregue a página e confira que continua lá) e uma rota direta como `/app/calendario`.

Observações:

- Os *Deploy Previews* de pull requests usam as mesmas variáveis e, portanto, o mesmo banco de produção. Se preferir
  isolar, crie um segundo projeto Supabase e defina as variáveis com escopo *Deploy Previews* no Netlify.
- Com domínio próprio no Netlify, inclua-o também nas *Redirect URLs* do Supabase.
- Se usar domínio próprio no Supabase (custom domain), acrescente-o em `connect-src` na CSP do `netlify.toml`.

---

## Testes

```bash
cd apps/medpuc
npm run typecheck     # TypeScript
npm test              # unitários e de componentes (Vitest + Testing Library)
npm run db:start      # os próximos precisam do Supabase local
npm run test:db       # pgTAP: RLS e regras no banco
npm run test:api      # isolamento pela API REST, com dois usuários reais
npm run test:e2e      # Playwright, desktop e celular (faz build e sobe o preview sozinho)
npm run test:tudo     # todos acima, em sequência
```

Os testes de API e E2E usam a chave secreta **do Supabase local** apenas para criar usuários de teste e se recusam a
rodar contra um endereço que não seja `127.0.0.1`/`localhost`.

| Fluxo pedido | Onde é verificado |
| --- | --- |
| 1. Cadastro | E2E `autenticacao` (com e-mail de confirmação lido do Mailpit); unitário da tela |
| 2. Login e logout | E2E `autenticacao` |
| 3. Recuperação de senha | E2E `autenticacao` (link real do e-mail, nova senha, senha antiga recusada); link expirado |
| 4. Proteção das páginas privadas | E2E `autenticacao`; unitário das guardas |
| 5. Criação e edição de disciplina | E2E `fluxos` |
| 6. Prova exibida no calendário | E2E `fluxos` (uma única ocorrência, mês/semana/dia, filtro, edição pelo calendário, painel); unitário do calendário |
| 7. Criação e persistência de anotação | E2E `fluxos` (salvamento automático, recarregar, pesquisa sem acento) |
| 8. Criação e conclusão de tarefa | E2E `fluxos` |
| 9. Dados após recarregar | E2E `fluxos` e `autenticacao` |
| 10. Isolamento entre dois usuários | pgTAP (56 verificações), API (24 testes) e E2E `isolamento` |
| 11. Telas de celular | E2E `celular` (390×844: navegação inferior, sem rolagem horizontal, criação de evento) |
| 12. Build de produção | `npm run build`; também com clone limpo + `npm ci` + `netlify build` (CLI oficial), e a suíte E2E rodada contra esse build com as regras do `netlify.toml` |

Também há testes de administração de modelos (importação em lote e cópia para o aluno) e de perfil/exclusão de conta.

---

## Preparação para comercialização

- **Planos**: `planos` (catálogo público, com `limites` por recurso) e `assinaturas` (por usuário, com `gateway` e
  `gateway_assinatura_id`). O aluno não consegue gravar nessas tabelas — testado por pgTAP e pela API.
- **Controle de recursos**: gatilho `privado.verificar_limite_plano` em disciplinas, eventos, conteúdos, tarefas e
  anotações; a interface mostra o uso no perfil e traduz o erro de limite.
- **Gateway de pagamento (futuro)**: criar uma Edge Function que recebe o webhook do gateway, **valida a assinatura do
  webhook** e só então grava em `assinaturas` com a service role (que fica no servidor, nunca no app). Nenhum plano pago
  é ativado sem esse passo.
- **Página de apresentação e planos**: `/` e `/planos`. O plano Premium existe no catálogo como indisponível e a página
  diz claramente que não há cobrança hoje.

---

## Funcionalidades que dependem de configuração externa ou ainda não existem

- **Publicação**: o deploy no Netlify e o projeto Supabase de produção ainda precisam ser criados e configurados
  (passos acima). Nada foi publicado a partir deste repositório.
- **E-mail em produção**: depende de SMTP próprio no Supabase para não esbarrar no limite do servidor padrão.
- **Datas oficiais do período**: não vêm cadastradas. Um administrador pode incluí-las na página de administração; até
  lá, cada aluno cadastra as suas.
- **Notificações** (e-mail/push) de provas e prazos: não implementadas.
- **Pagamentos**: só a estrutura de dados e as regras de acesso; nenhuma cobrança.
- **Eventos recorrentes** (aulas semanais) e uso offline: não implementados.
- Conflito de edição simultânea é detectado nas anotações; nas demais telas vale o último salvamento.
