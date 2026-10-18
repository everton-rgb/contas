import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atualizarTarefa, criarTarefa, excluirTarefa, listarTarefas } from '../servicos/tarefas';
import type { DadosTarefa, Tarefa } from '../tipos/dominio';
import { chaves } from './chaves';

export function useTarefas() {
  return useQuery({ queryKey: chaves.tarefas, queryFn: listarTarefas });
}

export function useSalvarTarefa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: DadosTarefa }) =>
      id ? atualizarTarefa(id, dados) : criarTarefa(dados),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.tarefas });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

export function useConcluirTarefa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, concluida }: { id: string; concluida: boolean }) =>
      atualizarTarefa(id, { status: concluida ? 'concluida' : 'pendente' }),
    onMutate: async ({ id, concluida }) => {
      await cliente.cancelQueries({ queryKey: chaves.tarefas });
      const anterior = cliente.getQueryData<Tarefa[]>(chaves.tarefas);
      cliente.setQueryData<Tarefa[]>(chaves.tarefas, (lista) =>
        lista?.map((t) => (t.id === id ? { ...t, status: concluida ? 'concluida' : 'pendente' } : t)),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.tarefas, contexto.anterior);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: chaves.tarefas }),
  });
}

export function useExcluirTarefa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirTarefa(id),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.tarefas });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}
