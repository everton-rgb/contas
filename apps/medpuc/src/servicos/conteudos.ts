import { supabase } from '../lib/supabase';
import type { Conteudo, DadosConteudo } from '../tipos/dominio';
import { ouNulo, resolver } from './base';

function normalizar(dados: Partial<DadosConteudo>) {
  return {
    ...dados,
    ...(dados.titulo !== undefined && { titulo: dados.titulo.trim() }),
    ...(dados.observacoes !== undefined && { observacoes: ouNulo(dados.observacoes?.trim()) }),
    ...(dados.data_prevista !== undefined && { data_prevista: ouNulo(dados.data_prevista) }),
  };
}


/** Todos os conteúdos do aluno, para calcular progresso e o calendário. */
export async function listarTodosConteudos(): Promise<Conteudo[]> {
  return resolver(supabase().from('conteudos').select('*').order('ordem').order('created_at'));
}

export async function criarConteudo(dados: DadosConteudo, ordem: number): Promise<Conteudo> {
  return resolver(
    supabase()
      .from('conteudos')
      .insert({ ...normalizar(dados), titulo: dados.titulo.trim(), disciplina_id: dados.disciplina_id, ordem })
      .select('*')
      .single(),
  );
}

export async function atualizarConteudo(id: string, dados: Partial<DadosConteudo>): Promise<Conteudo> {
  return resolver(supabase().from('conteudos').update(normalizar(dados)).eq('id', id).select('*').single());
}

export async function excluirConteudo(id: string): Promise<void> {
  await resolver(supabase().from('conteudos').delete().eq('id', id));
}

export async function reordenarConteudos(ids: string[]): Promise<void> {
  await resolver(supabase().rpc('reordenar_conteudos', { p_ids: ids }));
}
