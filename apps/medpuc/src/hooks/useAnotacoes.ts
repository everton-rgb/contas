import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buscarAnotacoes, excluirAnotacao, obterAnotacao } from '../servicos/anotacoes';
import { chaves } from './chaves';

export function useBuscaAnotacoes(termo: string, disciplinaId: string | null = null) {
  return useQuery({
    queryKey: chaves.buscaAnotacoes(termo.trim(), disciplinaId),
    queryFn: () => buscarAnotacoes(termo, disciplinaId),
    placeholderData: (anterior) => anterior,
  });
}

export function useAnotacao(id: string | null) {
  return useQuery({
    queryKey: chaves.anotacao(id ?? ''),
    queryFn: () => obterAnotacao(id!),
    enabled: !!id,
    // O editor mantém o próprio estado; recarregar por foco sobrescreveria a digitação.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

export function useExcluirAnotacao() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirAnotacao(id),
    onSuccess: (_r, id) => {
      cliente.removeQueries({ queryKey: chaves.anotacao(id) });
      cliente.invalidateQueries({ queryKey: ['anotacoes', 'busca'] });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}
