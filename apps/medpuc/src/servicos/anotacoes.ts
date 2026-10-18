import type { Json } from '../tipos/banco';
import { comoErroApp, ErroApp } from '../lib/erros';
import { supabase } from '../lib/supabase';
import type { Anotacao, ResumoAnotacao } from '../tipos/dominio';
import { resolver } from './base';

export const DOCUMENTO_VAZIO: NonNullable<Json> = { type: 'doc', content: [] };

export async function buscarAnotacoes(termo: string, disciplinaId?: string | null): Promise<ResumoAnotacao[]> {
  return resolver(
    supabase().rpc('buscar_anotacoes', {
      p_termo: termo.trim() || undefined,
      p_disciplina: disciplinaId ?? undefined,
    }),
  );
}

export async function obterAnotacao(id: string): Promise<Anotacao | null> {
  return resolver(supabase().from('anotacoes').select('*').eq('id', id).maybeSingle());
}

export type ConteudoAnotacao = {
  titulo: string;
  conteudo: NonNullable<Json>;
  texto: string;
  disciplina_id: string | null;
};

export async function criarAnotacao(dados: ConteudoAnotacao): Promise<Anotacao> {
  return resolver(
    supabase()
      .from('anotacoes')
      .insert({ ...dados, titulo: dados.titulo.trim() || 'Sem título' })
      .select('*')
      .single(),
  );
}

export type ResultadoSalvamento = { situacao: 'salvo'; versao: string } | { situacao: 'conflito' };

/**
 * Salva somente se a anotação não mudou desde `versao` (o updated_at lido).
 * Evita que um segundo dispositivo apague, sem aviso, o que o primeiro salvou.
 * Sem `versao`, sobrescreve.
 */
export async function salvarAnotacao(
  id: string,
  dados: ConteudoAnotacao,
  versao: string | null,
): Promise<ResultadoSalvamento> {
  const titulo = dados.titulo.trim() || 'Sem título';
  let consulta = supabase()
    .from('anotacoes')
    .update({ ...dados, titulo })
    .eq('id', id);
  if (versao) consulta = consulta.eq('updated_at', versao);

  const linhas = await resolver(consulta.select('updated_at'));
  if (linhas.length > 0) return { situacao: 'salvo', versao: linhas[0].updated_at };

  const { data, error } = await supabase().from('anotacoes').select('id').eq('id', id).maybeSingle();
  if (error) throw comoErroApp(error);
  if (!data) throw new ErroApp('Esta anotação foi excluída em outro dispositivo.', { codigo: 'excluida' });
  return { situacao: 'conflito' };
}

export async function excluirAnotacao(id: string): Promise<void> {
  await resolver(supabase().from('anotacoes').delete().eq('id', id));
}
