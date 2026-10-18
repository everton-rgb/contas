import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUsuario } from '../contextos/Autenticacao';
import {
  atualizarPerfil,
  contarUso,
  listarPlanosDisponiveis,
  obterMeuPlano,
  obterPerfil,
  verificarAdmin,
  type DadosPerfil,
} from '../servicos/perfil';
import { chaves } from './chaves';

export function usePerfil() {
  const usuario = useUsuario();
  return useQuery({ queryKey: chaves.perfil(usuario.id), queryFn: () => obterPerfil(usuario.id) });
}

export function useAtualizarPerfil() {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosPerfil) => atualizarPerfil(usuario.id, dados),
    onSuccess: (perfil) => cliente.setQueryData(chaves.perfil(usuario.id), perfil),
  });
}

export function useMeuPlano() {
  return useQuery({ queryKey: chaves.plano, queryFn: obterMeuPlano, staleTime: 5 * 60_000 });
}

export function useUso() {
  return useQuery({ queryKey: chaves.uso, queryFn: contarUso });
}

export function useEhAdmin() {
  return useQuery({ queryKey: chaves.admin, queryFn: verificarAdmin, staleTime: 5 * 60_000 });
}

export function usePlanosDisponiveis() {
  return useQuery({ queryKey: chaves.planosPublicos, queryFn: listarPlanosDisponiveis, staleTime: 10 * 60_000 });
}

/** Limite do plano para um recurso (null = sem limite). */
export function limiteDe(limites: unknown, recurso: string): number | null {
  if (!limites || typeof limites !== 'object') return null;
  const valor = (limites as Record<string, unknown>)[recurso];
  return typeof valor === 'number' ? valor : null;
}
