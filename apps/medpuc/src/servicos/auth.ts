/**
 * auth.ts — autenticação com Supabase Auth (e-mail e senha).
 */

import type { Session } from '@supabase/supabase-js';
import { comoErroApp, ErroApp } from '../lib/erros';
import { supabase } from '../lib/supabase';

function urlDoApp(caminho: string): string {
  return `${window.location.origin}${caminho}`;
}

async function executar<R extends { error: unknown }>(acao: () => Promise<R>): Promise<R> {
  try {
    const resposta = await acao();
    if (resposta.error) throw comoErroApp(resposta.error);
    return resposta;
  } catch (erro) {
    throw comoErroApp(erro);
  }
}

export type ResultadoCadastro = { precisaConfirmarEmail: boolean };

export async function cadastrar(dados: { nome: string; email: string; senha: string }): Promise<ResultadoCadastro> {
  const { data: resultado } = await executar(() =>
    supabase().auth.signUp({
      email: dados.email.trim().toLowerCase(),
      password: dados.senha,
      options: {
        data: { nome: dados.nome.trim() },
        emailRedirectTo: urlDoApp('/app'),
      },
    }),
  );

  // Com confirmação de e-mail ligada, o Supabase não revela que o e-mail já
  // existe: devolve um usuário sem identidades. Tratamos como duplicado.
  if (resultado.user && resultado.user.identities?.length === 0) {
    throw new ErroApp('Já existe uma conta com este e-mail. Entre ou recupere sua senha.', { codigo: 'user_already_exists' });
  }

  return { precisaConfirmarEmail: !resultado.session };
}

export async function reenviarConfirmacao(email: string): Promise<void> {
  await executar(() =>
    supabase().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: urlDoApp('/app') },
    }),
  );
}

export async function entrar(email: string, senha: string): Promise<void> {
  await executar(() => supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha }));
}

export async function sair(): Promise<void> {
  const { error } = await supabase().auth.signOut();
  // Se o servidor não responder, a sessão local é descartada mesmo assim.
  if (error) await supabase().auth.signOut({ scope: 'local' });
}

/** Descarta só a sessão deste navegador (a conta já não existe no servidor). */
export async function encerrarSessaoLocal(): Promise<void> {
  await supabase().auth.signOut({ scope: 'local' });
}

export async function solicitarRedefinicaoSenha(email: string): Promise<void> {
  await executar(() =>
    supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: urlDoApp('/redefinir-senha'),
    }),
  );
}

export async function definirNovaSenha(senha: string): Promise<void> {
  await executar(() => supabase().auth.updateUser({ password: senha }));
}

export async function obterSessao(): Promise<Session | null> {
  const { data } = await supabase().auth.getSession();
  return data.session;
}

export function observarSessao(
  aoMudar: (evento: string, sessao: Session | null) => void,
): () => void {
  const { data } = supabase().auth.onAuthStateChange((evento, sessao) => aoMudar(evento, sessao));
  return () => data.subscription.unsubscribe();
}

/** Lê erros que o Supabase devolve no fragmento da URL (#error_code=...). */
export function erroDaUrl(hash = window.location.hash, busca = window.location.search): string | null {
  const parametros = new URLSearchParams(hash.replace(/^#/, ''));
  const daBusca = new URLSearchParams(busca);
  const codigo = parametros.get('error_code') ?? daBusca.get('error_code');
  if (!codigo) return null;
  if (codigo === 'otp_expired') return 'O link expirou ou já foi usado. Solicite um novo.';
  return 'Não foi possível validar o link. Solicite um novo.';
}
