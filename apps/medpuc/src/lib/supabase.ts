/**
 * supabase.ts — cliente único da aplicação.
 *
 * Só a camada de serviços importa daqui. Componentes falam com os serviços
 * (via hooks), nunca com o cliente diretamente.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../tipos/banco';
import { configuracao } from './configuracao';

export type ClienteSupabase = SupabaseClient<Database>;

let cliente: ClienteSupabase | null = null;

export function supabase(): ClienteSupabase {
  if (!configuracao.valida) {
    throw new Error(configuracao.motivo);
  }
  cliente ??= createClient<Database>(configuracao.url, configuracao.chave, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'medpuc-sessao',
    },
  });
  return cliente;
}
