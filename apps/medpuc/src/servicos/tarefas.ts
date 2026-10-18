import { supabase } from '../lib/supabase';
import type { DadosTarefa, Tarefa } from '../tipos/dominio';
import { ouNulo, resolver } from './base';

function normalizar(dados: Partial<DadosTarefa>) {
  return {
    ...dados,
    ...(dados.titulo !== undefined && { titulo: dados.titulo.trim() }),
    ...(dados.descricao !== undefined && { descricao: ouNulo(dados.descricao?.trim()) }),
    ...(dados.prazo !== undefined && { prazo: ouNulo(dados.prazo) }),
    ...(dados.disciplina_id !== undefined && { disciplina_id: ouNulo(dados.disciplina_id) }),
  };
}

/** Todas as tarefas do aluno; filtros e ordenação ficam na interface. */
export async function listarTarefas(): Promise<Tarefa[]> {
  return resolver(
    supabase()
      .from('tarefas')
      .select('*')
      .order('prazo', { nullsFirst: false })
      .order('created_at', { ascending: false }),
  );
}

export async function criarTarefa(dados: DadosTarefa): Promise<Tarefa> {
  return resolver(
    supabase().from('tarefas').insert({ ...normalizar(dados), titulo: dados.titulo.trim() }).select('*').single(),
  );
}

export async function atualizarTarefa(id: string, dados: Partial<DadosTarefa>): Promise<Tarefa> {
  return resolver(supabase().from('tarefas').update(normalizar(dados)).eq('id', id).select('*').single());
}

export async function excluirTarefa(id: string): Promise<void> {
  await resolver(supabase().from('tarefas').delete().eq('id', id));
}
