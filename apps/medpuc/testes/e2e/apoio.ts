import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { addDays, format } from 'date-fns';
import type { Database } from '../../src/tipos/banco';
import { ambienteSupabaseLocal } from '../ambiente';

const ambiente = ambienteSupabaseLocal();
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin = createClient<Database>(ambiente.url, ambiente.secreta, opcoes);

export const SENHA = 'senhaTeste123';

export function emailUnico(prefixo: string): string {
  const local = prefixo.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${local}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@teste.dev`;
}

/** Usuário já confirmado (atalho para testes que não são de cadastro). */
export async function criarAluno(nome: string) {
  const email = emailUnico(nome.split(' ')[0]);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) throw error;
  const cliente = createClient<Database>(ambiente.url, ambiente.publica, opcoes);
  await cliente.auth.signInWithPassword({ email, password: SENHA });
  return { id: data.user.id, email, nome, cliente };
}

export async function entrar(page: Page, email: string, senha = SENHA) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app/);
}

/** Data local (fuso dos testes) daqui a `dias` dias, em AAAA-MM-DD. */
export function isoDaqui(dias: number): string {
  return format(addDays(new Date(), dias), 'yyyy-MM-dd');
}
