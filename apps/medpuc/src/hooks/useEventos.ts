import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  atualizarEvento,
  criarEvento,
  excluirEvento,
  listarEventosDaDisciplina,
  listarEventosFuturos,
  listarEventosNoIntervalo,
} from '../servicos/eventos';
import type { DadosEvento } from '../tipos/dominio';
import { chaves } from './chaves';

export function useEventosNoIntervalo(de: string, ate: string) {
  return useQuery({
    queryKey: chaves.eventosIntervalo(de, ate),
    queryFn: () => listarEventosNoIntervalo(de, ate),
    placeholderData: (anterior) => anterior,
  });
}

export function useEventosFuturos(hoje: string) {
  return useQuery({ queryKey: chaves.eventosFuturos(hoje), queryFn: () => listarEventosFuturos(hoje) });
}

export function useEventosDaDisciplina(disciplinaId: string) {
  return useQuery({
    queryKey: chaves.eventosDisciplina(disciplinaId),
    queryFn: () => listarEventosDaDisciplina(disciplinaId),
  });
}

export function useSalvarEvento() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: DadosEvento }) =>
      id ? atualizarEvento(id, dados) : criarEvento(dados),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.eventos });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

export function useExcluirEvento() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirEvento(id),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.eventos });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}
