/**
 * modelos.ts — modelos de período configurados pelo administrador.
 *
 * Alunos leem os publicados e copiam disciplinas para a própria conta.
 * Escrita só passa no banco para administradores (RLS com eh_admin()).
 */

import { supabase } from '../lib/supabase';
import type { Disciplina, ModeloDisciplina, ModeloEvento, ModeloPeriodo, TipoEvento } from '../tipos/dominio';
import { ouNulo, resolver } from './base';

export type ModeloDisciplinaComDatas = ModeloDisciplina & { modelos_eventos: ModeloEvento[] };
export type ModeloCompleto = ModeloPeriodo & { modelos_disciplinas: ModeloDisciplinaComDatas[] };

const SELECAO_COMPLETA = '*, modelos_disciplinas(*, modelos_eventos(*))';

function ordenar(modelo: ModeloCompleto): ModeloCompleto {
  return {
    ...modelo,
    modelos_disciplinas: [...modelo.modelos_disciplinas]
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((d) => ({
        ...d,
        modelos_eventos: [...d.modelos_eventos].sort((a, b) => a.data.localeCompare(b.data)),
      })),
  };
}

export async function listarModelos(somentePublicados: boolean): Promise<ModeloCompleto[]> {
  let consulta = supabase()
    .from('modelos_periodo')
    .select(SELECAO_COMPLETA)
    .order('periodo')
    .order('titulo');
  if (somentePublicados) consulta = consulta.eq('publicado', true);
  const modelos = await resolver(consulta);
  return (modelos as unknown as ModeloCompleto[]).map(ordenar);
}

export async function importarDoModelo(idsDisciplinas: string[], importarDatas: boolean): Promise<Disciplina[]> {
  return resolver(
    supabase().rpc('importar_modelo', {
      p_modelo_disciplinas: idsDisciplinas,
      p_importar_datas: importarDatas,
    }),
  );
}

// ── Administração ───────────────────────────────────────────────────────────

export type DadosModelo = Pick<ModeloPeriodo, 'instituicao' | 'curso' | 'periodo' | 'titulo' | 'descricao' | 'publicado'>;

export async function salvarModelo(dados: DadosModelo, id?: string): Promise<ModeloPeriodo> {
  const linha = { ...dados, titulo: dados.titulo.trim(), descricao: ouNulo(dados.descricao?.trim()) };
  const consulta = id
    ? supabase().from('modelos_periodo').update(linha).eq('id', id)
    : supabase().from('modelos_periodo').insert(linha);
  return resolver(consulta.select('*').single());
}

export async function excluirModelo(id: string): Promise<void> {
  await resolver(supabase().from('modelos_periodo').delete().eq('id', id));
}

export async function salvarModeloDisciplina(
  dados: { modelo_id: string; nome: string; cor: string; ordem?: number },
  id?: string,
): Promise<ModeloDisciplina> {
  const linha = { ...dados, nome: dados.nome.trim() };
  const consulta = id
    ? supabase().from('modelos_disciplinas').update(linha).eq('id', id)
    : supabase().from('modelos_disciplinas').insert(linha);
  return resolver(consulta.select('*').single());
}

export async function excluirModeloDisciplina(id: string): Promise<void> {
  await resolver(supabase().from('modelos_disciplinas').delete().eq('id', id));
}

export type DadosModeloEvento = {
  modelo_disciplina_id: string;
  titulo: string;
  tipo: TipoEvento;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  descricao?: string | null;
};

function linhaEvento(dados: DadosModeloEvento) {
  return {
    ...dados,
    titulo: dados.titulo.trim(),
    hora_inicio: ouNulo(dados.hora_inicio),
    hora_fim: ouNulo(dados.hora_fim),
    descricao: ouNulo(dados.descricao?.trim()),
  };
}

export async function salvarModeloEvento(dados: DadosModeloEvento, id?: string): Promise<ModeloEvento> {
  const consulta = id
    ? supabase().from('modelos_eventos').update(linhaEvento(dados)).eq('id', id)
    : supabase().from('modelos_eventos').insert(linhaEvento(dados));
  return resolver(consulta.select('*').single());
}

export async function excluirModeloEvento(id: string): Promise<void> {
  await resolver(supabase().from('modelos_eventos').delete().eq('id', id));
}

/** Importação em lote (já validada pela interface). */
export async function importarEmLote(
  modeloId: string,
  disciplinas: { nome: string; cor: string }[],
  eventos: (Omit<DadosModeloEvento, 'modelo_disciplina_id'> & { disciplina: string })[],
  existentes: ModeloDisciplina[],
): Promise<{ disciplinas: number; eventos: number }> {
  const porNome = new Map(existentes.map((d) => [d.nome.toLocaleLowerCase('pt-BR'), d.id]));
  const novas = disciplinas.filter((d) => !porNome.has(d.nome.toLocaleLowerCase('pt-BR')));
  const ordemInicial = existentes.reduce((m, d) => Math.max(m, d.ordem), 0) + 1;

  if (novas.length) {
    const criadas = await resolver(
      supabase()
        .from('modelos_disciplinas')
        .insert(novas.map((d, i) => ({ modelo_id: modeloId, nome: d.nome.trim(), cor: d.cor, ordem: ordemInicial + i })))
        .select('*'),
    );
    for (const d of criadas) porNome.set(d.nome.toLocaleLowerCase('pt-BR'), d.id);
  }

  if (eventos.length) {
    await resolver(
      supabase()
        .from('modelos_eventos')
        .insert(
          eventos.map(({ disciplina, ...e }) =>
            linhaEvento({ ...e, modelo_disciplina_id: porNome.get(disciplina.toLocaleLowerCase('pt-BR'))! }),
          ),
        ),
    );
  }

  return { disciplinas: novas.length, eventos: eventos.length };
}
