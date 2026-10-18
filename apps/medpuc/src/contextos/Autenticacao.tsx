/**
 * Autenticacao.tsx — estado da sessão para toda a aplicação.
 *
 * Ao trocar de usuário (ou sair), o cache do React Query é descartado: os
 * dados de uma conta nunca aparecem, nem por um instante, na sessão de outra.
 */

import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { observarSessao, obterSessao } from '../servicos/auth';

type EstadoAutenticacao = {
  carregando: boolean;
  sessao: Session | null;
  usuario: User | null;
};

const ContextoAutenticacao = createContext<EstadoAutenticacao | null>(null);

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const clienteConsultas = useQueryClient();
  const [estado, setEstado] = useState<EstadoAutenticacao>({ carregando: true, sessao: null, usuario: null });
  const usuarioAtual = useRef<string | null>(null);

  useEffect(() => {
    let ativo = true;

    function aplicar(sessao: Session | null) {
      const novoId = sessao?.user.id ?? null;
      if (usuarioAtual.current !== novoId) {
        clienteConsultas.clear();
        usuarioAtual.current = novoId;
      }
      setEstado({ carregando: false, sessao, usuario: sessao?.user ?? null });
    }

    const cancelar = observarSessao((_evento, sessao) => {
      if (ativo) aplicar(sessao);
    });

    obterSessao()
      .then((sessao) => ativo && aplicar(sessao))
      .catch(() => ativo && aplicar(null));

    return () => {
      ativo = false;
      cancelar();
    };
  }, [clienteConsultas]);

  return <ContextoAutenticacao.Provider value={estado}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao(): EstadoAutenticacao {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) throw new Error('useAutenticacao precisa estar dentro de ProvedorAutenticacao');
  return contexto;
}

/** Usuário logado; só usar dentro de rotas privadas. */
export function useUsuario(): User {
  const { usuario } = useAutenticacao();
  if (!usuario) throw new Error('useUsuario chamado fora de uma rota privada');
  return usuario;
}

export function ProvedorAutenticacaoTeste({ valor, children }: { valor: Partial<EstadoAutenticacao>; children: ReactNode }) {
  const estado = useMemo<EstadoAutenticacao>(
    () => ({ carregando: false, sessao: null, usuario: null, ...valor }),
    [valor],
  );
  return <ContextoAutenticacao.Provider value={estado}>{children}</ContextoAutenticacao.Provider>;
}
