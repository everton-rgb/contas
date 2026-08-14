import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export const SessaoContexto = createContext<Session | null>(null);

export function usarSessao(): Session | null {
  return useContext(SessaoContexto);
}

/** Para telas que já rodam atrás do guard de autenticação. */
export function usarUsuarioId(): string | null {
  return useContext(SessaoContexto)?.user.id ?? null;
}
