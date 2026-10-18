/**
 * validacaoConfiguracao.ts — validação das variáveis públicas do Supabase.
 *
 * Tudo que começa com VITE_ é embutido no JavaScript enviado ao navegador.
 * Por isso a validação recusa chaves secretas. Sem dependências do Vite:
 * roda no navegador (configuracao.ts) e no build (vite.config.ts).
 */

export type Configuracao =
  | { valida: true; url: string; chave: string }
  | { valida: false; motivo: string };

function papelDoJwt(chave: string): string | null {
  const partes = chave.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const carga = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')));
    return typeof carga.role === 'string' ? carga.role : null;
  } catch {
    return null;
  }
}

export function validarConfiguracao(url: string | undefined, chave: string | undefined): Configuracao {
  if (!url || !chave) {
    return {
      valida: false,
      motivo: 'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não foram definidas.',
    };
  }

  try {
    const endereco = new URL(url);
    if (endereco.protocol !== 'https:' && endereco.hostname !== '127.0.0.1' && endereco.hostname !== 'localhost') {
      return { valida: false, motivo: 'VITE_SUPABASE_URL precisa usar https.' };
    }
  } catch {
    return { valida: false, motivo: 'VITE_SUPABASE_URL não é um endereço válido.' };
  }

  if (chave.startsWith('sb_secret_') || papelDoJwt(chave) === 'service_role') {
    return {
      valida: false,
      motivo:
        'A chave configurada é secreta (service role). Use a chave pública (publishable/anon) e gere uma nova chave secreta no painel do Supabase.',
    };
  }

  return { valida: true, url: url.replace(/\/+$/, ''), chave };
}
