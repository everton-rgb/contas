/**
 * Junta disciplinas, eventos futuros, tarefas e conteúdos e calcula os
 * resumos do painel e dos cartões. Cada fonte tem a própria consulta (e o
 * próprio cache); aqui só se combinam os resultados.
 */

import { useMemo } from 'react';
import { hojeISO } from '../lib/datas';
import {
  pendentesPorDisciplina,
  progressoPorDisciplina,
  proximaAvaliacaoPorDisciplina,
} from '../lib/resumo';
import { useConteudos } from './useConteudos';
import { useDisciplinas } from './useDisciplinas';
import { useEventosFuturos } from './useEventos';
import { useTarefas } from './useTarefas';

export function useResumoAcademico() {
  const hoje = hojeISO();
  const disciplinas = useDisciplinas();
  const eventos = useEventosFuturos(hoje);
  const tarefas = useTarefas();
  const conteudos = useConteudos();

  const consultas = [disciplinas, eventos, tarefas, conteudos];

  const resumo = useMemo(
    () => ({
      progresso: progressoPorDisciplina(conteudos.data ?? []),
      proximaAvaliacao: proximaAvaliacaoPorDisciplina(eventos.data ?? [], hoje),
      pendentes: pendentesPorDisciplina(tarefas.data ?? []),
    }),
    [conteudos.data, eventos.data, tarefas.data, hoje],
  );

  return {
    hoje,
    disciplinas: disciplinas.data ?? [],
    eventos: eventos.data ?? [],
    tarefas: tarefas.data ?? [],
    conteudos: conteudos.data ?? [],
    ...resumo,
    carregando: consultas.some((c) => c.isPending),
    erro: consultas.find((c) => c.isError)?.error ?? null,
    recarregar: () => consultas.forEach((c) => c.refetch()),
  };
}
