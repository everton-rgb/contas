/**
 * resumo.ts — cálculos do painel e dos cartões de disciplina.
 *
 * Funções puras sobre os registros do aluno; nenhum número é inventado.
 */

import { TIPOS_AVALIACAO, TIPOS_PROVA, type Conteudo, type Evento, type Tarefa } from '../tipos/dominio';

export type Progresso = { total: number; concluidos: number; emAndamento: number; percentual: number };

export function calcularProgresso(conteudos: Pick<Conteudo, 'status'>[]): Progresso {
  const total = conteudos.length;
  const concluidos = conteudos.filter((c) => c.status === 'concluido').length;
  const emAndamento = conteudos.filter((c) => c.status === 'em_andamento').length;
  return { total, concluidos, emAndamento, percentual: total ? Math.round((concluidos / total) * 100) : 0 };
}

export function progressoPorDisciplina(conteudos: Conteudo[]): Map<string, Progresso> {
  const grupos = new Map<string, Conteudo[]>();
  for (const c of conteudos) {
    const lista = grupos.get(c.disciplina_id) ?? [];
    lista.push(c);
    grupos.set(c.disciplina_id, lista);
  }
  return new Map([...grupos].map(([id, lista]) => [id, calcularProgresso(lista)]));
}

/** Compara eventos por data e horário (sem horário vem antes, como "dia todo"). */
export function compararEventos(a: Pick<Evento, 'data' | 'hora_inicio'>, b: Pick<Evento, 'data' | 'hora_inicio'>): number {
  return a.data.localeCompare(b.data) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '');
}

function pendente(e: Evento, hoje: string): boolean {
  return e.status === 'agendado' && e.data >= hoje;
}

export function proximaProva(eventos: Evento[], hoje: string): Evento | null {
  return (
    eventos.filter((e) => pendente(e, hoje) && TIPOS_PROVA.includes(e.tipo)).sort(compararEventos)[0] ?? null
  );
}

export function proximaAvaliacaoPorDisciplina(eventos: Evento[], hoje: string): Map<string, Evento> {
  const mapa = new Map<string, Evento>();
  for (const e of eventos.filter((e) => pendente(e, hoje) && TIPOS_AVALIACAO.includes(e.tipo)).sort(compararEventos)) {
    if (e.disciplina_id && !mapa.has(e.disciplina_id)) mapa.set(e.disciplina_id, e);
  }
  return mapa;
}

export function proximosCompromissos(eventos: Evento[], hoje: string, limite = 5): Evento[] {
  return eventos.filter((e) => pendente(e, hoje)).sort(compararEventos).slice(0, limite);
}

export function tarefasPendentes(tarefas: Tarefa[]): Tarefa[] {
  const peso = { alta: 0, media: 1, baixa: 2 } as const;
  return tarefas
    .filter((t) => t.status !== 'concluida')
    .sort(
      (a, b) =>
        (a.prazo ?? '9999-12-31').localeCompare(b.prazo ?? '9999-12-31') || peso[a.prioridade] - peso[b.prioridade],
    );
}

export function pendentesPorDisciplina(tarefas: Tarefa[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const t of tarefas) {
    if (t.status !== 'concluida' && t.disciplina_id) mapa.set(t.disciplina_id, (mapa.get(t.disciplina_id) ?? 0) + 1);
  }
  return mapa;
}

export function tarefaAtrasada(tarefa: Pick<Tarefa, 'prazo' | 'status'>, hoje: string): boolean {
  return tarefa.status !== 'concluida' && !!tarefa.prazo && tarefa.prazo < hoje;
}
