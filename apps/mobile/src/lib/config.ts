/**
 * config.ts — de onde vêm os dados.
 *
 * Sem as duas variáveis do Supabase o app entra em MODO LOCAL: guarda tudo
 * num arquivo no próprio aparelho, sem login e sem rede. Serve para testar o
 * ciclo colar → confirmar → alerta antes de existir backend, e é o que torna
 * o app utilizável no Expo Go sem nenhuma configuração.
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const MODO_LOCAL = SUPABASE_URL === '' || SUPABASE_ANON_KEY === '';
