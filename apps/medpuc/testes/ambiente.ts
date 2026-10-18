/**
 * Credenciais do Supabase LOCAL para os testes de API e E2E.
 *
 * Lê de `supabase status` (ou de SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY/
 * SUPABASE_SECRET_KEY). A chave secreta só é usada aqui, para criar usuários
 * de teste — nunca no app. Recusa endereços remotos para que os testes não
 * rodem por engano contra o projeto de produção.
 */

import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AmbienteLocal = { url: string; publica: string; secreta: string; mailpit: string };

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let cache: AmbienteLocal | null = null;

export function ambienteSupabaseLocal(): AmbienteLocal {
  if (cache) return cache;
  let ambiente: AmbienteLocal;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY) {
    ambiente = {
      url: process.env.SUPABASE_URL,
      publica: process.env.SUPABASE_PUBLISHABLE_KEY,
      secreta: process.env.SUPABASE_SECRET_KEY,
      mailpit: process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324',
    };
  } else {
    const saida = execSync('npx --yes supabase@2.121.0 status -o json', { cwd: raiz, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const s = JSON.parse(saida.slice(saida.indexOf('{')));
    ambiente = {
      url: s.API_URL,
      publica: s.PUBLISHABLE_KEY ?? s.ANON_KEY,
      secreta: s.SECRET_KEY ?? s.SERVICE_ROLE_KEY,
      mailpit: s.MAILPIT_URL ?? s.INBUCKET_URL,
    };
  }
  const host = new URL(ambiente.url).hostname;
  if (!['127.0.0.1', 'localhost'].includes(host)) {
    throw new Error(`Testes só rodam contra o Supabase local (recebido: ${host}).`);
  }
  cache = ambiente;
  return ambiente;
}

/** Último link enviado para o e-mail, lido do Mailpit. */
export async function linkDoEmail(email: string, contendo: string, tentativas = 40): Promise<string> {
  const { mailpit } = ambienteSupabaseLocal();
  for (let i = 0; i < tentativas; i++) {
    const busca = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then((r) => r.json());
    for (const resumo of busca.messages ?? []) {
      const mensagem = await fetch(`${mailpit}/api/v1/message/${resumo.ID}`).then((r) => r.json());
      const link = String(mensagem.Text ?? '').match(/https?:\/\/\S+/g)?.find((l: string) => l.includes(contendo));
      if (link) return link.replace(/&amp;/g, '&');
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Nenhum e-mail com "${contendo}" para ${email}`);
}
