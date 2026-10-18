-- ============================================================================
-- 20261018120400_dados_iniciais.sql — Catálogo de planos e modelo inicial.
--
-- O modelo do 3º período traz apenas os nomes das disciplinas informados pelo
-- responsável pela plataforma. Nenhuma data oficial é cadastrada aqui: cada
-- aluno registra as datas da própria turma, ou um administrador as adiciona
-- ao modelo pela página de administração quando houver calendário oficial.
-- ============================================================================

insert into public.planos (id, nome, descricao, limites, disponivel, ordem) values
  ('gratuito', 'Gratuito',
   'Calendário, disciplinas, conteúdos, tarefas e caderno digital.',
   '{"disciplinas": 20}'::jsonb, true, 0),
  ('premium', 'Premium',
   'Plano em desenvolvimento. Ainda não pode ser contratado.',
   '{}'::jsonb, false, 1)
on conflict (id) do nothing;

with modelo as (
  insert into public.modelos_periodo (instituicao, curso, periodo, titulo, descricao, publicado)
  values (
    'PUCPR', 'Medicina', 3,
    '3º período — Medicina PUCPR',
    'Disciplinas do 3º período. As datas de provas variam por turma: cadastre as suas na página de cada disciplina ou no calendário.',
    true
  )
  returning id
)
insert into public.modelos_disciplinas (modelo_id, nome, cor, ordem)
select modelo.id, d.nome, d.cor, d.ordem
  from modelo,
       (values
         ('Neuroanatomia',                    '#8C1D40', 1),
         ('Neurofarmacologia',                '#6B4E9B', 2),
         ('Neurofisiologia',                  '#2F5D8A', 3),
         ('Fisiologia do Sistema Locomotor',  '#0F766E', 4),
         ('Anatomia do Sistema Locomotor',    '#B45309', 5),
         ('Genética e Patologia',             '#5B7B2A', 6),
         ('Sentidos',                         '#A3367D', 7),
         ('Método Científico',                '#475569', 8)
       ) as d (nome, cor, ordem);
