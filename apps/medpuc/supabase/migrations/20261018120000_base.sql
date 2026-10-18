-- ============================================================================
-- 20261018120000_base.sql — Perfis, planos, assinaturas e administradores.
--
-- Regra geral: todo dado privado pertence a auth.users e é protegido por RLS.
-- Plano e papel de administrador ficam em tabelas que o usuário só lê; quem
-- escreve nelas é o backend (service role, webhook do gateway, SQL do painel).
-- ============================================================================

create extension if not exists unaccent with schema extensions;

-- Funções internas ficam fora do schema exposto pela API (public).
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- ── updated_at automático ───────────────────────────────────────────────────

create or replace function privado.definir_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Planos ──────────────────────────────────────────────────────────────────
-- Catálogo público. `limites` guarda o teto por recurso, por exemplo
-- {"disciplinas": 20}. Recurso ausente no objeto = sem limite.

create table public.planos (
  id          text primary key check (id ~ '^[a-z0-9_]+$'),
  nome        text not null check (char_length(nome) between 1 and 60),
  descricao   text check (char_length(descricao) <= 500),
  limites     jsonb not null default '{}'::jsonb check (jsonb_typeof(limites) = 'object'),
  disponivel  boolean not null default false,  -- pode ser contratado hoje
  ordem       smallint not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Perfis ──────────────────────────────────────────────────────────────────

create table public.perfis (
  id           uuid primary key references auth.users (id) on delete cascade,
  nome         text not null check (char_length(btrim(nome)) between 1 and 120),
  instituicao  text not null default 'PUCPR' check (char_length(instituicao) <= 120),
  curso        text not null default 'Medicina' check (char_length(curso) <= 120),
  periodo      smallint check (periodo between 1 and 12),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function privado.definir_atualizado_em();

-- Perfil nasce junto com o usuário, a partir do nome informado no cadastro.
create or replace function privado.criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1), 'Estudante'), 120)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function privado.criar_perfil();

-- ── Assinaturas ─────────────────────────────────────────────────────────────
-- Sem políticas de escrita: o usuário não consegue se promover de plano pela
-- API. A integração futura com gateway grava aqui com a service role, depois
-- de validar o webhook.

create type public.status_assinatura as enum ('ativa', 'em_atraso', 'cancelada', 'expirada');

create table public.assinaturas (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  plano_id               text not null references public.planos (id),
  status                 public.status_assinatura not null default 'ativa',
  inicio                 timestamptz not null default now(),
  fim                    timestamptz,
  gateway                text,
  gateway_assinatura_id  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (gateway, gateway_assinatura_id),
  check (fim is null or fim > inicio)
);

create index assinaturas_user_idx on public.assinaturas (user_id, status);

create trigger assinaturas_atualizado_em before update on public.assinaturas
  for each row execute function privado.definir_atualizado_em();

-- ── Administradores ─────────────────────────────────────────────────────────
-- Promoção só por SQL (painel do Supabase). Ver README.

create table public.administradores (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administradores where user_id = (select auth.uid()));
$$;

-- Plano vigente: assinatura ativa e dentro da validade, senão o gratuito.
create or replace function privado.plano_do_usuario(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select a.plano_id
       from public.assinaturas a
      where a.user_id = p_user
        and a.status = 'ativa'
        and (a.fim is null or a.fim > now())
      order by a.inicio desc
      limit 1),
    'gratuito');
$$;

create or replace function public.meu_plano() returns setof public.planos
language sql stable security definer set search_path = '' as $$
  select p.* from public.planos p
   where p.id = privado.plano_do_usuario((select auth.uid()))
     and (select auth.uid()) is not null;
$$;
