/**
 * supabase.ts — cliente único do app, criado sob demanda.
 *
 * A criação é preguiçosa porque em MODO_LOCAL o app roda sem backend nenhum:
 * importar este módulo não pode explodir por falta de variável de ambiente.
 *
 * A sessão vive no SecureStore (Keychain no iOS), não em AsyncStorage.
 * ⚠️ O SecureStore tem teto de 2048 bytes por item e o JWT do Supabase passa
 * disso com folga quando o usuário tem claims extras. Por isso o adaptador
 * abaixo fatia o valor em pedaços e guarda a contagem num item índice.
 */

import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { MODO_LOCAL, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

const TAMANHO_PEDACO = 1800;

const armazenamentoFatiado: SupportedStorage = {
  async getItem(chave) {
    const cabecalho = await SecureStore.getItemAsync(chave);
    if (cabecalho === null) return null;

    const pedacos = Number(cabecalho);
    // Valor pequeno foi gravado inteiro, sem fatiar.
    if (!Number.isInteger(pedacos) || pedacos <= 0) return cabecalho;

    const partes: string[] = [];
    for (let i = 0; i < pedacos; i++) {
      const parte = await SecureStore.getItemAsync(`${chave}.${i}`);
      if (parte === null) return null; // fatia perdida: trata como sessão ausente
      partes.push(parte);
    }
    return partes.join('');
  },

  async setItem(chave, valor) {
    await limparFatias(chave);
    if (valor.length <= TAMANHO_PEDACO) {
      await SecureStore.setItemAsync(chave, valor);
      return;
    }
    const pedacos = Math.ceil(valor.length / TAMANHO_PEDACO);
    for (let i = 0; i < pedacos; i++) {
      await SecureStore.setItemAsync(`${chave}.${i}`, valor.slice(i * TAMANHO_PEDACO, (i + 1) * TAMANHO_PEDACO));
    }
    await SecureStore.setItemAsync(chave, String(pedacos));
  },

  async removeItem(chave) {
    await limparFatias(chave);
    await SecureStore.deleteItemAsync(chave);
  },
};

async function limparFatias(chave: string) {
  const cabecalho = await SecureStore.getItemAsync(chave);
  const pedacos = Number(cabecalho);
  if (!Number.isInteger(pedacos) || pedacos <= 0) return;
  for (let i = 0; i < pedacos; i++) {
    await SecureStore.deleteItemAsync(`${chave}.${i}`);
  }
}

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (MODO_LOCAL) {
    throw new Error('Supabase não configurado — o app está em modo local. Preencha o .env para conectar.');
  }
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: armazenamentoFatiado,
        autoRefreshToken: true,
        persistSession: true,
        // O magic link volta pelo deep link vence://, não pela URL do browser.
        detectSessionInUrl: false,
      },
    });
  }
  return cliente;
}
