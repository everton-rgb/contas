-- ============================================================================
-- rls.test.sql — Isolamento entre alunos, verificado no banco.
--
-- Simula requisições da API trocando o papel para `authenticated`/`anon` e
-- preenchendo request.jwt.claims, exatamente como o PostgREST faz.
-- Rodar com: npx supabase test db
-- ============================================================================

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(56);

-- ── Preparação ──────────────────────────────────────────────────────────────

create function pg_temp.entrar_como(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.sair() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

create function pg_temp.afetadas(p_sql text) returns integer language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.dev', '{"nome": "Ana"}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bruno@teste.dev', '{"nome": "Bruno"}', 'authenticated', 'authenticated');

-- ── Estrutura ───────────────────────────────────────────────────────────────

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'todas as tabelas de public têm RLS habilitado');

select is((select nome from perfis where id = '11111111-1111-1111-1111-111111111111'),
  'Ana', 'perfil criado no cadastro com o nome informado');

-- ── Ana cria seus dados ─────────────────────────────────────────────────────

select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');

insert into disciplinas (id, nome, cor)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Neuroanatomia', '#8C1D40');
insert into eventos (id, disciplina_id, titulo, tipo, data)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Prova 1', 'prova', current_date + 7);
insert into conteudos (id, disciplina_id, titulo)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Tronco encefálico');
insert into tarefas (id, disciplina_id, titulo)
values ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Resumo do capítulo 3');
insert into anotacoes (id, disciplina_id, titulo, texto)
values ('aaaaaaaa-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Nervos cranianos', 'Núcleos do nervo trigêmeo');

select is((select user_id from disciplinas where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid, 'user_id preenchido automaticamente com auth.uid()');
select is((select count(*)::int from eventos), 1, 'Ana vê o próprio evento');

-- ── Bruno não enxerga nada da Ana ───────────────────────────────────────────

select pg_temp.entrar_como('22222222-2222-2222-2222-222222222222');

select is((select count(*)::int from disciplinas), 0, 'Bruno não lê disciplinas da Ana');
select is((select count(*)::int from eventos), 0, 'Bruno não lê eventos da Ana');
select is((select count(*)::int from conteudos), 0, 'Bruno não lê conteúdos da Ana');
select is((select count(*)::int from tarefas), 0, 'Bruno não lê tarefas da Ana');
select is((select count(*)::int from anotacoes), 0, 'Bruno não lê anotações da Ana');
select is((select count(*)::int from perfis), 1, 'Bruno lê apenas o próprio perfil');
select is((select count(*)::int from buscar_anotacoes('trigemeo')), 0, 'pesquisa não devolve anotações da Ana');

-- ── Bruno não altera nem exclui dados da Ana ────────────────────────────────

select is(pg_temp.afetadas($q$update disciplinas set nome = 'invadido'$q$),
  0, 'update em disciplina alheia não afeta linhas');
select is(pg_temp.afetadas($q$update eventos set titulo = 'invadido'$q$),
  0, 'update em evento alheio não afeta linhas');
select is(pg_temp.afetadas($q$update conteudos set status = 'concluido'$q$),
  0, 'update em conteúdo alheio não afeta linhas');
select is(pg_temp.afetadas($q$update tarefas set status = 'concluida'$q$),
  0, 'update em tarefa alheia não afeta linhas');
select is(pg_temp.afetadas($q$update anotacoes set texto = 'invadido'$q$),
  0, 'update em anotação alheia não afeta linhas');
select is(pg_temp.afetadas($q$update perfis set nome = 'invadido' where id = '11111111-1111-1111-1111-111111111111'$q$),
  0, 'update em perfil alheio não afeta linhas');

select is(pg_temp.afetadas($q$delete from disciplinas$q$), 0, 'delete de disciplina alheia não afeta linhas');
select is(pg_temp.afetadas($q$delete from eventos$q$), 0, 'delete de evento alheio não afeta linhas');
select is(pg_temp.afetadas($q$delete from conteudos$q$), 0, 'delete de conteúdo alheio não afeta linhas');
select is(pg_temp.afetadas($q$delete from tarefas$q$), 0, 'delete de tarefa alheia não afeta linhas');
select is(pg_temp.afetadas($q$delete from anotacoes$q$), 0, 'delete de anotação alheia não afeta linhas');

select reordenar_conteudos(array['aaaaaaaa-0000-0000-0000-000000000003'::uuid, gen_random_uuid()]);
select pg_temp.sair();
select is((select ordem from conteudos where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0,
  'reordenar não altera conteúdos de outro aluno');
select pg_temp.entrar_como('22222222-2222-2222-2222-222222222222');

-- ── Bruno não grava em nome da Ana ──────────────────────────────────────────

select throws_ok(
  $$ insert into disciplinas (user_id, nome, cor) values ('11111111-1111-1111-1111-111111111111', 'x', '#000000') $$,
  '42501', null, 'insert com user_id alheio é bloqueado');
select throws_ok(
  $$ insert into anotacoes (user_id, titulo) values ('11111111-1111-1111-1111-111111111111', 'x') $$,
  '42501', null, 'insert de anotação com user_id alheio é bloqueado');
select throws_ok(
  $$ insert into eventos (disciplina_id, titulo, data) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', current_date) $$,
  '23503', null, 'evento não pode apontar para disciplina de outro aluno');
select throws_ok(
  $$ insert into tarefas (disciplina_id, titulo) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x') $$,
  '23503', null, 'tarefa não pode apontar para disciplina de outro aluno');

insert into disciplinas (id, nome, cor) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Sentidos', '#A3367D');
select throws_ok(
  $$ update disciplinas set user_id = '11111111-1111-1111-1111-111111111111' where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  '42501', null, 'não é possível transferir uma linha para outro usuário');

-- ── Plano e papel não são editáveis pelo aluno ──────────────────────────────

select throws_ok(
  $$ insert into assinaturas (user_id, plano_id) values ('22222222-2222-2222-2222-222222222222', 'premium') $$,
  '42501', null, 'aluno não cria a própria assinatura');
select throws_ok(
  $$ update assinaturas set plano_id = 'premium' $$,
  '42501', null, 'aluno não altera assinatura');
select throws_ok(
  $$ insert into administradores (user_id) values ('22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'aluno não se torna administrador');
select throws_ok(
  $$ update planos set limites = '{}' $$,
  '42501', null, 'aluno não altera limites dos planos');
select is((select id from meu_plano()), 'gratuito', 'sem assinatura, o plano é o gratuito');
select is(eh_admin(), false, 'aluno comum não é administrador');

-- ── Modelos: só leitura para aluno ──────────────────────────────────────────

select throws_ok(
  $$ insert into modelos_periodo (instituicao, curso, periodo, titulo) values ('X', 'Y', 1, 'Z') $$,
  '42501', null, 'aluno não cria modelo');
select is(pg_temp.afetadas($q$update modelos_disciplinas set nome = 'invadido'$q$),
  0, 'aluno não edita disciplinas do modelo');
select is((select count(*)::int from modelos_disciplinas), 8, 'aluno lê as 8 disciplinas do modelo publicado');

-- ── Importação do modelo ────────────────────────────────────────────────────

select is((select count(*)::int from importar_modelo(array(select id from modelos_disciplinas), true)),
  8, 'importa as 8 disciplinas do modelo');
select is((select count(*)::int from importar_modelo(array(select id from modelos_disciplinas), true)),
  8, 'reimportar devolve as mesmas disciplinas');
select is((select count(*)::int from disciplinas), 9, 'reimportar não duplica disciplinas');

-- ── Anônimo não acessa dados ────────────────────────────────────────────────

select pg_temp.sair();
select set_config('role', 'anon', true);
select throws_ok($$ select * from disciplinas $$, '42501', null, 'anon não lê disciplinas');
select throws_ok($$ select * from anotacoes $$, '42501', null, 'anon não lê anotações');
select throws_ok($$ select * from buscar_anotacoes('x') $$, '42501', null, 'anon não executa a pesquisa');
select isnt_empty($$ select * from planos where disponivel $$, 'anon lê o catálogo de planos');

-- ── Ana continua com tudo intacto ───────────────────────────────────────────

select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
select is((select nome from disciplinas where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Neuroanatomia', 'disciplina da Ana intacta');
select is((select count(*)::int from buscar_anotacoes('TRIGEMEO')), 1, 'pesquisa ignora acentos e maiúsculas');
select is((select count(*)::int from buscar_anotacoes('100%')), 0, 'curingas do LIKE são tratados como texto');

-- ── Limite do plano ─────────────────────────────────────────────────────────

select pg_temp.sair();
update planos set limites = '{"disciplinas": 2}' where id = 'gratuito';
select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
insert into disciplinas (nome, cor) values ('Segunda', '#000000');
select throws_ok(
  $$ insert into disciplinas (nome, cor) values ('Terceira', '#000000') $$,
  'MP001', null, 'limite do plano gratuito é aplicado no banco');

select pg_temp.sair();
insert into assinaturas (user_id, plano_id) values ('11111111-1111-1111-1111-111111111111', 'premium');
select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
select is((select id from meu_plano()), 'premium', 'assinatura gravada pelo backend muda o plano');
select lives_ok(
  $$ insert into disciplinas (nome, cor) values ('Terceira', '#000000') $$,
  'plano sem limite permite novos registros');

-- ── Administrador gerencia modelos ──────────────────────────────────────────

select pg_temp.sair();
insert into administradores (user_id) values ('11111111-1111-1111-1111-111111111111');
select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
select is(eh_admin(), true, 'administrador reconhecido');
select lives_ok(
  $$ insert into modelos_periodo (instituicao, curso, periodo, titulo) values ('PUCPR', 'Medicina', 4, 'Rascunho') $$,
  'administrador cria modelo');

select pg_temp.entrar_como('22222222-2222-2222-2222-222222222222');
select is((select count(*)::int from modelos_periodo where not publicado), 0, 'aluno não vê modelo não publicado');

-- ── Exclusão de conta remove apenas os dados do próprio usuário ─────────────

select lives_ok($$ select excluir_minha_conta() $$, 'Bruno exclui a própria conta');
select pg_temp.sair();
select is((select count(*)::int from disciplinas where user_id = '22222222-2222-2222-2222-222222222222'), 0, 'dados do Bruno removidos em cascata');
select is((select count(*)::int from disciplinas where user_id = '11111111-1111-1111-1111-111111111111'), 3, 'dados da Ana preservados');

select * from finish();
rollback;
