-- ============================================================================
-- 0001_init.sql — Schema base do controle de despesas
-- RLS habilitado desde o primeiro dia, mesmo em uso individual.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────

create type conta_status as enum (
  'rascunho',      -- lida, mas com pendência (vencimento/valor a confirmar)
  'agendada',      -- confirmada, alerta ativo
  'paga',
  'vencida',
  'cancelada'
);

create type origem_leitura as enum (
  'camera',        -- código de barras ITF via VisionCamera
  'clipboard',
  'pdf_texto',     -- extração nativa do PDF
  'pdf_ocr',       -- vision model
  'manual',
  'recorrencia'    -- gerada automaticamente
);

create type tipo_boleto as enum ('bancario', 'arrecadacao', 'sem_boleto');

-- ── Categorias ──────────────────────────────────────────────────────────────

create table categorias (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  nome         text not null,
  slug         text not null,
  cor          text not null default '#6B7280',
  icone        text,
  orcamento_mensal numeric(12,2),
  created_at   timestamptz not null default now(),
  unique (user_id, slug)
);

-- ── Contas ──────────────────────────────────────────────────────────────────

create table contas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  categoria_id      uuid references categorias(id) on delete set null,
  recorrencia_id    uuid,  -- FK adicionada depois (dependência circular)

  descricao         text not null,
  beneficiario      text,

  tipo              tipo_boleto not null default 'sem_boleto',
  linha_digitavel   text,
  codigo_barras     text,

  valor             numeric(12,2),
  valor_pago        numeric(12,2),
  vencimento        date,

  status            conta_status not null default 'rascunho',
  origem            origem_leitura not null default 'manual',

  -- Rastreabilidade da leitura automática
  confianca         numeric(3,2) check (confianca between 0 and 1),
  pendencia_vencimento boolean not null default false,
  pendencia_valor      boolean not null default false,
  avisos            jsonb not null default '[]'::jsonb,
  payload_bruto     jsonb,   -- saída completa do parser, para auditoria

  observacoes       text,
  pago_em           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Um boleto só pode ser cadastrado uma vez (evita duplicata ao reler o PDF)
  constraint contas_linha_unica unique (user_id, linha_digitavel),

  -- Só pode sair de 'rascunho' com data e valor resolvidos
  constraint contas_agendavel check (
    status = 'rascunho'
    or status = 'cancelada'
    or (vencimento is not null and valor is not null)
  )
);

create index on contas (user_id, vencimento) where status in ('agendada', 'vencida');
create index on contas (user_id, status);
create index on contas (user_id, categoria_id);

-- ── Recorrências (contas fixas: aluguel, internet, condomínio) ──────────────

create table recorrencias (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  categoria_id   uuid references categorias(id) on delete set null,
  descricao      text not null,
  beneficiario   text,
  valor_estimado numeric(12,2),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  ativa          boolean not null default true,
  inicio         date not null default current_date,
  fim            date,
  created_at     timestamptz not null default now()
);

alter table contas
  add constraint contas_recorrencia_fk
  foreign key (recorrencia_id) references recorrencias(id) on delete set null;

-- ── Anexos (PDF do boleto, comprovante de pagamento) ────────────────────────

create table anexos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  conta_id    uuid not null references contas(id) on delete cascade,
  storage_path text not null,
  tipo        text not null check (tipo in ('boleto', 'comprovante', 'outro')),
  mime        text,
  tamanho_bytes bigint,
  created_at  timestamptz not null default now()
);

create index on anexos (conta_id);

-- ── Alertas agendados (espelho do que está no device) ───────────────────────
-- O iOS limita 64 notificações locais pendentes por app. Esta tabela é a fila
-- completa; o device hidrata apenas a janela mais próxima.

create table alertas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  conta_id      uuid not null references contas(id) on delete cascade,
  disparar_em   timestamptz not null,
  dias_antes    smallint not null,
  agendado_no_device boolean not null default false,
  device_notification_id text,
  disparado_em  timestamptz,
  created_at    timestamptz not null default now(),
  unique (conta_id, dias_antes)
);

create index on alertas (user_id, disparar_em) where disparado_em is null;

-- ── updated_at automático ───────────────────────────────────────────────────

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger contas_updated_at before update on contas
  for each row execute function set_updated_at();

-- ── Marca contas vencidas (chamada pelo app na abertura, ou por cron) ───────

create or replace function marcar_vencidas() returns void
language sql security invoker as $$
  update contas
     set status = 'vencida'
   where status = 'agendada'
     and vencimento < current_date;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table categorias   enable row level security;
alter table contas       enable row level security;
alter table recorrencias enable row level security;
alter table anexos       enable row level security;
alter table alertas      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categorias','contas','recorrencias','anexos','alertas']
  loop
    execute format($f$
      create policy %1$s_select on %1$I for select
        using (auth.uid() = user_id);
      create policy %1$s_insert on %1$I for insert
        with check (auth.uid() = user_id);
      create policy %1$s_update on %1$I for update
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
      create policy %1$s_delete on %1$I for delete
        using (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- ── Storage ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('boletos', 'boletos', false)
on conflict (id) do nothing;

create policy "boletos_owner_all" on storage.objects for all
  using (bucket_id = 'boletos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'boletos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Categorias padrão para novos usuários ───────────────────────────────────

create or replace function seed_categorias() returns trigger
language plpgsql security definer as $$
begin
  insert into categorias (user_id, nome, slug, cor) values
    (new.id, 'Moradia',       'moradia',    '#0F766E'),
    (new.id, 'Utilidades',    'utilidades', '#0369A1'),
    (new.id, 'Telecom',       'telecom',    '#7C3AED'),
    (new.id, 'Impostos',      'impostos',   '#B91C1C'),
    (new.id, 'Veículo',       'veiculo',    '#C2410C'),
    (new.id, 'Saúde',         'saude',      '#059669'),
    (new.id, 'Educação',      'educacao',   '#2563EB'),
    (new.id, 'Cartão',        'cartao',     '#4B5563'),
    (new.id, 'Outros',        'outros',     '#6B7280');
  return new;
end $$;

create trigger on_user_created after insert on auth.users
  for each row execute function seed_categorias();
