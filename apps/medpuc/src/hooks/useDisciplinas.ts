import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  atualizarDisciplina,
  criarDisciplina,
  excluirDisciplina,
  listarDisciplinas,
} from '../servicos/disciplinas';
import type { DadosDisciplina, Disciplina } from '../tipos/dominio';
import { chaves } from './chaves';

export function useDisciplinas() {
  return useQuery({ queryKey: chaves.disciplinas, queryFn: listarDisciplinas });
}

/** Mapa id → disciplina, para colorir eventos e tarefas. */
export function useMapaDisciplinas(): Map<string, Disciplina> {
  const { data } = useDisciplinas();
  return new Map((data ?? []).map((d) => [d.id, d]));
}

export function useSalvarDisciplina() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: DadosDisciplina }) => {
      if (id) return atualizarDisciplina(id, dados);
      const atuais = cliente.getQueryData<Disciplina[]>(chaves.disciplinas) ?? [];
      return criarDisciplina(dados, atuais.reduce((m, d) => Math.max(m, d.ordem), 0) + 1);
    },
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.disciplinas });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

export function useExcluirDisciplina() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirDisciplina(id),
    onSuccess: () => {
      // Conteúdos, avaliações e tarefas saem em cascata; anotações ficam sem disciplina.
      for (const chave of [chaves.disciplinas, chaves.eventos, chaves.conteudos, chaves.tarefas, chaves.anotacoes, chaves.uso]) {
        cliente.invalidateQueries({ queryKey: chave });
      }
    },
  });
}
