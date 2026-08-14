/**
 * supabase.ts — cliente único do app.
 *
 * A sessão vive no SecureStore (Keychain no iOS), não em AsyncStorage.
 * ⚠️ O SecureStore tem teto de 2048 bytes por item e o JWT do Supabase passa
 * disso com folga quando o usuário tem claims extras. Por isso o adaptador
 * abaixo fatia o valor em pedaços e guarda a contagem num item índice.
 */

import 'react-native-url-polyfill/auto';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !CHAVE) {
  throw new Error(
    'Faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY. Copie .env.example para .env.',
  );
}

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

export const supabase = createClient(URL, CHAVE, {
  auth: {
    storage: armazenamentoFatiado,
    autoRefreshToken: true,
    persistSession: true,
    // O magic link volta pelo deep link vence://, não pela URL do browser.
    detectSessionInUrl: false,
  },
});
