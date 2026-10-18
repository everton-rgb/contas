-- ============================================================================
-- 20261018120100_academico.sql — Modelos do administrador e dados do aluno.
--
-- `eventos` é a fonte única de provas, trabalhos e compromissos: a aba
-- "Avaliações e datas" da disciplina e o calendário leem a mesma tabela.
--
-- As tabelas filhas referenciam a disciplina por (disciplina_id, user_id).
-- Isso impede, no próprio banco, vincular um registro à disciplina de outro
-- aluno, mesmo que alguém descubra o UUID dela.
-- ============================================================================

create type public.tipo_evento as enum (
  'prova', 'avaliacao_pratica', 'trabalho', 'entrega', 'aula', 'revisao', 'outro'
);
create type public.status_evento as enum ('agendado', 'concluido', 'cancelado');
create type public.status_conteudo as enum ('nao_iniciado', 'em_andamento', 'concluido');
create type public.prioridade_tarefa as enum ('baixa', 'media', 'alta');
create type public.status_tarefa as enum ('pendente', 'em_andamento', 'concluida');

-- ── Modelos (configurados pelo administrador) ───────────────────────────────

create table public.modelos_periodo (
  id           uuid primary key default gen_random_uuid(),
  instituicao  text not null check (char_length(instituicao) between 1 and 120),
  curso        text not null check (char_length(curso) between 1 and 120),
  periodo      smallint not null check (periodo between 1 and 12),
  titulo       text not null check (char_length(titulo) between 1 and 160),
  descricao    text check (char_length(descricao) <= 2000),
  publicado    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.modelos_disciplinas (
  id          uuid primary key default gen_random_uuid(),
  modelo_id   uuid not null references public.modelos_periodo (id) on delete cascade,
  nome        text not null check (char_length(btrim(nome)) between 1 and 120),
  cor         text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (modelo_id, nome)
);

create index modelos_disciplinas_modelo_idx on public.modelos_disciplinas (modelo_id, ordem);

create table public.modelos_eventos (
  id                    uuid primary key default gen_random_uuid(),
  modelo_disciplina_id  uuid not null references public.modelos_disciplinas (id) on delete cascade,
  titulo                text not null check (char_length(btrim(titulo)) between 1 and 160),
  tipo                  public.tipo_evento not null default 'prova',
  data                  date not null,
  hora_inicio           time,
  hora_fim              time,
  descricao             text check (char_length(descricao) <= 4000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (hora_fim is null or (hora_inicio is not null and hora_fim > hora_inicio))
);

create index modelos_eventos_disciplina_idx on public.modelos_eventos (modelo_disciplina_id, data);

-- ── Disciplinas do aluno ────────────────────────────────────────────────────

create table public.disciplinas (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  modelo_disciplina_id  uuid references public.modelos_disciplinas (id) on delete set null,
  nome                  text not null check (char_length(btrim(nome)) between 1 and 120),
  cor                   text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  professor             text check (char_length(professor) <= 120),
  descricao             text check (char_length(descricao) <= 2000),
  ordem                 integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  -- Uma disciplina do modelo só entra uma vez na conta do aluno.
  unique (user_id, modelo_disciplina_id)
);

create index disciplinas_user_idx on public.disciplinas (user_id, ordem);

-- ── Eventos (fonte única de verdade do calendário) ──────────────────────────

create table public.eventos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  disciplina_id     uuid,
  modelo_evento_id  uuid references public.modelos_eventos (id) on delete set null,
  titulo            text not null check (char_length(btrim(titulo)) between 1 and 160),
  tipo              public.tipo_evento not null default 'outro',
  data              date not null,
  hora_inicio       time,
  hora_fim          time,
  descricao         text check (char_length(descricao) <= 4000),
  cor               text check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  status            public.status_evento not null default 'agendado',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (disciplina_id, user_id) references public.disciplinas (id, user_id) on delete cascade,
  check (hora_fim is null or (hora_inicio is not null and hora_fim > hora_inicio)),
  -- Reimportar as datas de um modelo não duplica eventos.
  unique (user_id, modelo_evento_id)
);

create index eventos_user_data_idx on public.eventos (user_id, data);
create index eventos_disciplina_idx on public.eventos (disciplina_id, data);

-- ── Conteúdos de estudo ─────────────────────────────────────────────────────

create table public.conteudos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  disciplina_id  uuid not null,
  titulo         text not null check (char_length(btrim(titulo)) between 1 and 200),
  data_prevista  date,
  status         public.status_conteudo not null default 'nao_iniciado',
  observacoes    text check (char_length(observacoes) <= 4000),
  ordem          integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (disciplina_id, user_id) references public.disciplinas (id, user_id) on delete cascade
);

create index conteudos_disciplina_idx on public.conteudos (disciplina_id, ordem);
create index conteudos_user_idx on public.conteudos (user_id, data_prevista);

-- ── Tarefas ─────────────────────────────────────────────────────────────────

create table public.tarefas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  disciplina_id  uuid,
  titulo         text not null check (char_length(btrim(titulo)) between 1 and 200),
  descricao      text check (char_length(descricao) <= 4000),
  prazo          date,
  prioridade     public.prioridade_tarefa not null default 'media',
  status         public.status_tarefa not null default 'pendente',
  concluida_em   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (disciplina_id, user_id) references public.disciplinas (id, user_id) on delete cascade
);

create index tarefas_user_idx on public.tarefas (user_id, status, prazo);
create index tarefas_disciplina_idx on public.tarefas (disciplina_id);

create or replace function privado.marcar_conclusao_tarefa() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'concluida' then
    if tg_op = 'INSERT' or old.status is distinct from 'concluida' then
      new.concluida_em := now();
    end if;
  else
    new.concluida_em := null;
  end if;
  return new;
end $$;

create trigger tarefas_conclusao before insert or update of status on public.tarefas
  for each row execute function privado.marcar_conclusao_tarefa();

-- ── Anotações ───────────────────────────────────────────────────────────────
-- Gerais e de disciplina usam a mesma tabela: disciplina_id nulo = geral.
-- `conteudo` é o documento do editor; `texto` é a versão em texto puro,
-- usada na pesquisa. Remover a disciplina preserva a anotação.

create table public.anotacoes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  disciplina_id  uuid,
  titulo         text not null default 'Sem título' check (char_length(titulo) <= 200),
  conteudo       jsonb not null default '{"type": "doc", "content": []}'::jsonb
                 check (jsonb_typeof(conteudo) = 'object' and octet_length(conteudo::text) <= 1000000),
  texto          text not null default '' check (char_length(texto) <= 200000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (disciplina_id, user_id) references public.disciplinas (id, user_id)
    on delete set null (disciplina_id)
);

create index anotacoes_user_idx on public.anotacoes (user_id, updated_at desc);
create index anotacoes_disciplina_idx on public.anotacoes (disciplina_id, updated_at desc);

-- ── updated_at ──────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'modelos_periodo', 'modelos_disciplinas', 'modelos_eventos',
    'disciplinas', 'eventos', 'conteudos', 'tarefas', 'anotacoes'
  ]
  loop
    execute format(
      'create trigger %1$s_atualizado_em before update on public.%1$I
         for each row execute function privado.definir_atualizado_em()', t);
  end loop;
end $$;
