import { supabase } from '../lib/supabase';
import type { DadosDisciplina, Disciplina } from '../tipos/dominio';
import { ouNulo, resolver } from './base';

function normalizar(dados: Partial<DadosDisciplina>) {
  return {
    ...dados,
    ...(dados.nome !== undefined && { nome: dados.nome.trim() }),
    ...(dados.professor !== undefined && { professor: ouNulo(dados.professor?.trim()) }),
    ...(dados.descricao !== undefined && { descricao: ouNulo(dados.descricao?.trim()) }),
  };
}

export async function listarDisciplinas(): Promise<Disciplina[]> {
  return resolver(
    supabase().from('disciplinas').select('*').order('ordem').order('nome'),
  );
}


export async function criarDisciplina(dados: DadosDisciplina, ordem: number): Promise<Disciplina> {
  return resolver(
    supabase()
      .from('disciplinas')
      .insert({ ...normalizar(dados), nome: dados.nome.trim(), cor: dados.cor, ordem })
      .select('*')
      .single(),
  );
}

export async function atualizarDisciplina(id: string, dados: Partial<DadosDisciplina>): Promise<Disciplina> {
  return resolver(
    supabase().from('disciplinas').update(normalizar(dados)).eq('id', id).select('*').single(),
  );
}

export async function excluirDisciplina(id: string): Promise<void> {
  await resolver(supabase().from('disciplinas').delete().eq('id', id));
}
