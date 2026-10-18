import type { Session, User } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { ProvedorAutenticacaoTeste } from '../contextos/Autenticacao';
import { ProvedorNotificacoes } from '../contextos/Notificacoes';

export const usuarioTeste = { id: '11111111-1111-1111-1111-111111111111', email: 'ana@teste.dev' } as User;
export const sessaoTeste = { user: usuarioTeste, access_token: 'x' } as Session;

export function criarClienteConsultas() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

type Opcoes = { rota?: string; caminho?: string; logado?: boolean; rotasExtras?: RouteObject[] };

/** Renderiza com React Query, avisos, sessão simulada e roteador em memória. */
export function renderizar(elemento: ReactElement, { rota = '/', caminho = '/', logado = true, rotasExtras = [] }: Opcoes = {}) {
  const cliente = criarClienteConsultas();
  const roteador = createMemoryRouter([{ path: caminho, element: elemento }, ...rotasExtras], { initialEntries: [rota] });
  const sessao = logado ? { sessao: sessaoTeste, usuario: usuarioTeste } : {};
  function Provedores({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={cliente}>
        <ProvedorNotificacoes>
          <ProvedorAutenticacaoTeste valor={sessao}>{children}</ProvedorAutenticacaoTeste>
        </ProvedorNotificacoes>
      </QueryClientProvider>
    );
  }
  return { ...render(<RouterProvider router={roteador} />, { wrapper: Provedores }), roteador, cliente };
}
