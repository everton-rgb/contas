/**
 * configuracao.ts — configuração do Supabase lida do build (VITE_*).
 * Com configuração inválida o app mostra uma tela explicativa em vez de iniciar.
 */

import { validarConfiguracao } from './validacaoConfiguracao';

export const configuracao = validarConfiguracao(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
);
