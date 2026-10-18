import { supabase } from '../lib/supabase';
import type { DadosEvento, Evento, TipoEvento } from '../tipos/dominio';
import { ouNulo, resolver } from './base';

function normalizar(dados: Partial<DadosEvento>) {
  return {
    ...dados,
    ...(dados.titulo !== undefined && { titulo: dados.titulo.trim() }),
    ...(dados.descricao !== undefined && { descricao: ouNulo(dados.descricao?.trim()) }),
    ...(dados.hora_inicio !== undefined && { hora_inicio: ouNulo(dados.hora_inicio) }),
    ...(dados.hora_fim !== undefined && { hora_fim: ouNulo(dados.hora_fim) }),
    ...(dados.disciplina_id !== undefined && { disciplina_id: ouNulo(dados.disciplina_id) }),
    ...(dados.cor !== undefined && { cor: ouNulo(dados.cor) }),
  };
}

function ordenados() {
  return supabase()
    .from('eventos')
    .select('*')
    .order('data')
    .order('hora_inicio', { nullsFirst: true })
    .order('titulo');
}

export async function listarEventosNoIntervalo(de: string, ate: string): Promise<Evento[]> {
  return resolver(ordenados().gte('data', de).lte('data', ate));
}

export async function listarEventosFuturos(
  aPartirDe: string,
  filtros: { tipos?: TipoEvento[]; disciplinaId?: string; limite?: number } = {},
): Promise<Evento[]> {
  let consulta = ordenados().gte('data', aPartirDe).neq('status', 'cancelado');
  if (filtros.tipos?.length) consulta = consulta.in('tipo', filtros.tipos);
  if (filtros.disciplinaId) consulta = consulta.eq('disciplina_id', filtros.disciplinaId);
  if (filtros.limite) consulta = consulta.limit(filtros.limite);
  return resolver(consulta);
}

export async function listarEventosDaDisciplina(disciplinaId: string): Promise<Evento[]> {
  return resolver(ordenados().eq('disciplina_id', disciplinaId));
}

export async function criarEvento(dados: DadosEvento): Promise<Evento> {
  return resolver(
    supabase()
      .from('eventos')
      .insert({ ...normalizar(dados), titulo: dados.titulo.trim(), tipo: dados.tipo, data: dados.data })
      .select('*')
      .single(),
  );
}

export async function atualizarEvento(id: string, dados: Partial<DadosEvento>): Promise<Evento> {
  return resolver(supabase().from('eventos').update(normalizar(dados)).eq('id', id).select('*').single());
}

export async function excluirEvento(id: string): Promise<void> {
  await resolver(supabase().from('eventos').delete().eq('id', id));
}
