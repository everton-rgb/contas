-- ============================================================================
-- 20261018120300_funcoes.sql — Limites por plano e funções chamadas pelo app.
--
-- As RPCs de dados do aluno são `security invoker`: rodam com o RLS de quem
-- chama, então não abrem nenhum caminho novo para dados alheios.
-- ============================================================================

-- ── Limite de recursos por plano ────────────────────────────────────────────
-- Dispara antes do insert e conta os registros do dono da linha. O nome do
-- recurso é o nome da tabela; se o plano não define limite para ele, passa.
-- Erro com código próprio (MP001) para o app traduzir a mensagem.

create or replace function privado.verificar_limite_plano() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_plano  text := privado.plano_do_usuario(new.user_id);
  v_limite integer;
  v_total  integer;
begin
  select (p.limites ->> tg_table_name)::integer into v_limite
    from public.planos p where p.id = v_plano;

  if v_limite is null then
    return new;
  end if;

  -- Serializa inserts concorrentes do mesmo usuário nesta tabela.
  perform pg_advisory_xact_lock(hashtext(tg_table_name || ':' || new.user_id::text));

  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
    into v_total using new.user_id;

  if v_total >= v_limite then
    raise exception 'Limite do plano atingido para %', tg_table_name
      using errcode = 'MP001',
            detail = json_build_object('recurso', tg_table_name, 'limite', v_limite, 'plano', v_plano)::text;
  end if;

  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['disciplinas', 'eventos', 'conteudos', 'tarefas', 'anotacoes']
  loop
    execute format(
      'create trigger %1$s_limite_plano before insert on public.%1$I
         for each row execute function privado.verificar_limite_plano()', t);
  end loop;
end $$;

-- ── Adicionar disciplinas de um modelo à conta do aluno ─────────────────────
-- Copia as disciplinas escolhidas (e, se pedido, as datas cadastradas pelo
-- administrador) para a conta de quem chama. As cópias são do aluno: ele pode
-- renomear, recolorir, apagar e ajustar datas sem afetar o modelo.
-- Repetir a chamada não duplica nada.

create or replace function public.importar_modelo(
  p_modelo_disciplinas uuid[],
  p_importar_datas boolean default true
) returns setof public.disciplinas
language plpgsql security invoker set search_path = '' as $$
declare
  v_user  uuid := (select auth.uid());
  v_ordem integer;
begin
  if v_user is null then
    raise exception 'Sessão expirada' using errcode = '42501';
  end if;

  select coalesce(max(ordem), -1) + 1 into v_ordem from public.disciplinas where user_id = v_user;

  insert into public.disciplinas (user_id, modelo_disciplina_id, nome, cor, ordem)
  select v_user, md.id, md.nome, md.cor, v_ordem + row_number() over (order by md.ordem, md.nome)
    from public.modelos_disciplinas md
    join public.modelos_periodo mp on mp.id = md.modelo_id
   where md.id = any (p_modelo_disciplinas)
     and mp.publicado
     and not exists (
       select 1 from public.disciplinas d
        where d.user_id = v_user and d.modelo_disciplina_id = md.id
     )
  on conflict (user_id, modelo_disciplina_id) do nothing;

  if p_importar_datas then
    insert into public.eventos (
      user_id, disciplina_id, modelo_evento_id, titulo, tipo, data, hora_inicio, hora_fim, descricao
    )
    select v_user, d.id, me.id, me.titulo, me.tipo, me.data, me.hora_inicio, me.hora_fim, me.descricao
      from public.modelos_eventos me
      join public.disciplinas d
        on d.modelo_disciplina_id = me.modelo_disciplina_id and d.user_id = v_user
     where me.modelo_disciplina_id = any (p_modelo_disciplinas)
    on conflict (user_id, modelo_evento_id) do nothing;
  end if;

  return query
    select d.* from public.disciplinas d
     where d.user_id = v_user and d.modelo_disciplina_id = any (p_modelo_disciplinas)
     order by d.ordem;
end $$;

-- ── Pesquisa de anotações ───────────────────────────────────────────────────
-- Busca parcial, sem diferenciar maiúsculas nem acentos, em título e texto.
-- Devolve só o trecho inicial do texto: a listagem não precisa do documento.

create or replace function public.buscar_anotacoes(
  p_termo text default null,
  p_disciplina uuid default null,
  p_limite integer default 200
) returns table (
  id uuid,
  disciplina_id uuid,
  titulo text,
  trecho text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  with termo as (
    select '%' || replace(replace(replace(
             extensions.unaccent('extensions.unaccent', lower(btrim(coalesce(p_termo, '')))),
             '\', '\\'), '%', '\%'), '_', '\_') || '%' as padrao,
           btrim(coalesce(p_termo, '')) = '' as vazio
  )
  select a.id, a.disciplina_id, a.titulo, left(a.texto, 240), a.created_at, a.updated_at
    from public.anotacoes a, termo t
   where a.user_id = (select auth.uid())
     and (p_disciplina is null or a.disciplina_id = p_disciplina)
     and (t.vazio or extensions.unaccent('extensions.unaccent', lower(a.titulo || ' ' || a.texto)) like t.padrao escape '\')
   order by a.updated_at desc
   limit least(greatest(coalesce(p_limite, 200), 1), 500);
$$;

-- ── Reordenar conteúdos ─────────────────────────────────────────────────────

create or replace function public.reordenar_conteudos(p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.conteudos c
     set ordem = x.posicao
    from unnest(p_ids) with ordinality as x(id, posicao)
   where c.id = x.id
     and c.user_id = (select auth.uid());
$$;

-- ── Excluir a própria conta ─────────────────────────────────────────────────
-- Apaga o usuário em auth.users; o cascade remove todos os dados dele.

create or replace function public.excluir_minha_conta() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Sessão expirada' using errcode = '42501';
  end if;
  delete from auth.users where id = v_user;
end $$;

-- ── Execução ────────────────────────────────────────────────────────────────

revoke execute on function privado.verificar_limite_plano() from public, anon, authenticated;
revoke execute on function public.importar_modelo(uuid[], boolean) from public, anon;
revoke execute on function public.buscar_anotacoes(text, uuid, integer) from public, anon;
revoke execute on function public.reordenar_conteudos(uuid[]) from public, anon;
revoke execute on function public.excluir_minha_conta() from public, anon;

grant execute on function public.importar_modelo(uuid[], boolean) to authenticated;
grant execute on function public.buscar_anotacoes(text, uuid, integer) to authenticated;
grant execute on function public.reordenar_conteudos(uuid[]) to authenticated;
grant execute on function public.excluir_minha_conta() to authenticated;
