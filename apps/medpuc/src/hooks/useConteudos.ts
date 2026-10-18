import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  atualizarConteudo,
  criarConteudo,
  excluirConteudo,
  listarTodosConteudos,
  reordenarConteudos,
} from '../servicos/conteudos';
import type { Conteudo, DadosConteudo } from '../tipos/dominio';
import { chaves } from './chaves';

export function useConteudos() {
  return useQuery({ queryKey: chaves.conteudos, queryFn: listarTodosConteudos });
}

export function useConteudosDaDisciplina(disciplinaId: string) {
  const consulta = useConteudos();
  return {
    ...consulta,
    data: consulta.data
      ?.filter((c) => c.disciplina_id === disciplinaId)
      .sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)),
  };
}

export function useSalvarConteudo() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: DadosConteudo }) => {
      if (id) return atualizarConteudo(id, dados);
      const daDisciplina = (cliente.getQueryData<Conteudo[]>(chaves.conteudos) ?? []).filter(
        (c) => c.disciplina_id === dados.disciplina_id,
      );
      return criarConteudo(dados, daDisciplina.reduce((m, c) => Math.max(m, c.ordem), 0) + 1);
    },
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.conteudos });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

/** Troca de status com atualização otimista (o progresso responde na hora). */
export function useAlterarStatusConteudo() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: Pick<Conteudo, 'id' | 'status'>) => atualizarConteudo(id, { status }),
    onMutate: async ({ id, status }) => {
      await cliente.cancelQueries({ queryKey: chaves.conteudos });
      const anterior = cliente.getQueryData<Conteudo[]>(chaves.conteudos);
      cliente.setQueryData<Conteudo[]>(chaves.conteudos, (lista) =>
        lista?.map((c) => (c.id === id ? { ...c, status } : c)),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.conteudos, contexto.anterior);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: chaves.conteudos }),
  });
}

export function useReordenarConteudos() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reordenarConteudos(ids),
    onMutate: async (ids) => {
      await cliente.cancelQueries({ queryKey: chaves.conteudos });
      const anterior = cliente.getQueryData<Conteudo[]>(chaves.conteudos);
      const posicao = new Map(ids.map((id, i) => [id, i + 1]));
      cliente.setQueryData<Conteudo[]>(chaves.conteudos, (lista) =>
        lista?.map((c) => (posicao.has(c.id) ? { ...c, ordem: posicao.get(c.id)! } : c)),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.conteudos, contexto.anterior);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: chaves.conteudos }),
  });
}

export function useExcluirConteudo() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirConteudo(id),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.conteudos });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}
