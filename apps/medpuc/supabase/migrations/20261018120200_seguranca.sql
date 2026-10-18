-- ============================================================================
-- 20261018120200_seguranca.sql — Privilégios e políticas RLS.
--
-- Os privilégios são concedidos explicitamente (não dependemos dos defaults
-- do projeto) e o RLS decide quais linhas cada papel enxerga.
-- `anon` não acessa nada além do catálogo de planos.
-- ============================================================================

alter table public.planos              enable row level security;
alter table public.perfis              enable row level security;
alter table public.assinaturas         enable row level security;
alter table public.administradores     enable row level security;
alter table public.modelos_periodo     enable row level security;
alter table public.modelos_disciplinas enable row level security;
alter table public.modelos_eventos     enable row level security;
alter table public.disciplinas         enable row level security;
alter table public.eventos             enable row level security;
alter table public.conteudos           enable row level security;
alter table public.tarefas             enable row level security;
alter table public.anotacoes           enable row level security;

-- ── Privilégios de tabela ───────────────────────────────────────────────────

revoke all on table
  public.planos, public.perfis, public.assinaturas, public.administradores,
  public.modelos_periodo, public.modelos_disciplinas, public.modelos_eventos,
  public.disciplinas, public.eventos, public.conteudos, public.tarefas, public.anotacoes
from anon, authenticated;

grant select on table public.planos to anon, authenticated;
grant select, update on table public.perfis to authenticated;
grant select on table public.assinaturas, public.administradores to authenticated;
grant select, insert, update, delete on table
  public.modelos_periodo, public.modelos_disciplinas, public.modelos_eventos,
  public.disciplinas, public.eventos, public.conteudos, public.tarefas, public.anotacoes
to authenticated;

-- ── Catálogo de planos: leitura pública ─────────────────────────────────────

create policy planos_leitura on public.planos for select
  to anon, authenticated using (true);

-- ── Perfil: o próprio usuário lê e edita ────────────────────────────────────

create policy perfis_leitura on public.perfis for select
  to authenticated using ((select auth.uid()) = id);
create policy perfis_edicao on public.perfis for update
  to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ── Assinatura e papel: somente leitura do próprio registro ─────────────────

create policy assinaturas_leitura on public.assinaturas for select
  to authenticated using ((select auth.uid()) = user_id);
create policy administradores_leitura on public.administradores for select
  to authenticated using ((select auth.uid()) = user_id);

-- ── Modelos: alunos leem os publicados, administradores gerenciam ───────────

create policy modelos_periodo_leitura on public.modelos_periodo for select
  to authenticated using (publicado or (select public.eh_admin()));
create policy modelos_periodo_admin_insere on public.modelos_periodo for insert
  to authenticated with check ((select public.eh_admin()));
create policy modelos_periodo_admin_edita on public.modelos_periodo for update
  to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy modelos_periodo_admin_exclui on public.modelos_periodo for delete
  to authenticated using ((select public.eh_admin()));

create policy modelos_disciplinas_leitura on public.modelos_disciplinas for select
  to authenticated using (
    (select public.eh_admin())
    or exists (select 1 from public.modelos_periodo m where m.id = modelo_id and m.publicado)
  );
create policy modelos_disciplinas_admin_insere on public.modelos_disciplinas for insert
  to authenticated with check ((select public.eh_admin()));
create policy modelos_disciplinas_admin_edita on public.modelos_disciplinas for update
  to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy modelos_disciplinas_admin_exclui on public.modelos_disciplinas for delete
  to authenticated using ((select public.eh_admin()));

create policy modelos_eventos_leitura on public.modelos_eventos for select
  to authenticated using (
    (select public.eh_admin())
    or exists (
      select 1
        from public.modelos_disciplinas d
        join public.modelos_periodo m on m.id = d.modelo_id
       where d.id = modelo_disciplina_id and m.publicado
    )
  );
create policy modelos_eventos_admin_insere on public.modelos_eventos for insert
  to authenticated with check ((select public.eh_admin()));
create policy modelos_eventos_admin_edita on public.modelos_eventos for update
  to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy modelos_eventos_admin_exclui on public.modelos_eventos for delete
  to authenticated using ((select public.eh_admin()));

-- ── Dados do aluno: cada um só enxerga e altera o que é seu ─────────────────

do $$
declare t text;
begin
  foreach t in array array['disciplinas', 'eventos', 'conteudos', 'tarefas', 'anotacoes']
  loop
    execute format($f$
      create policy %1$s_leitura on public.%1$I for select
        to authenticated using ((select auth.uid()) = user_id);
      create policy %1$s_insercao on public.%1$I for insert
        to authenticated with check ((select auth.uid()) = user_id);
      create policy %1$s_edicao on public.%1$I for update
        to authenticated using ((select auth.uid()) = user_id)
        with check ((select auth.uid()) = user_id);
      create policy %1$s_exclusao on public.%1$I for delete
        to authenticated using ((select auth.uid()) = user_id);
    $f$, t);
  end loop;
end $$;

-- ── Funções: ninguém executa por padrão ─────────────────────────────────────

revoke execute on all functions in schema privado from public, anon, authenticated;
revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.meu_plano() from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.meu_plano() to authenticated;
