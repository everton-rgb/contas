/**
 * Complemento de interface aos testes de RLS (supabase/tests e testes/api):
 * um aluno não vê nada do outro, nem abrindo os endereços diretamente, nem
 * logo depois de outra conta sair do mesmo navegador.
 */

import { expect, test } from '@playwright/test';
import { criarAluno, entrar, isoDaqui } from './apoio';

test('dois alunos no mesmo navegador não enxergam os dados um do outro', async ({ page }) => {
  const ana = await criarAluno('Laura Martins');
  const bruno = await criarAluno('Marcos Dias');

  const disciplina = await ana.cliente.from('disciplinas').insert({ nome: 'Neurofarmacologia', cor: '#6B4E9B' }).select().single();
  await ana.cliente.from('eventos').insert({ titulo: 'Prova de Laura', tipo: 'prova', data: isoDaqui(3), disciplina_id: disciplina.data!.id });
  await ana.cliente.from('tarefas').insert({ titulo: 'Tarefa de Laura' });
  const anotacao = await ana.cliente.from('anotacoes').insert({ titulo: 'Caderno de Laura', texto: 'conteúdo privado' }).select().single();

  await entrar(page, ana.email);
  await expect(page.getByRole('heading', { name: 'Prova de Laura' })).toBeVisible();
  await page.goto('/app/disciplinas');
  await expect(page.getByRole('link', { name: 'Neurofarmacologia' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar/);

  await entrar(page, bruno.email);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Marcos');
  await expect(page.getByText('Prova de Laura')).toHaveCount(0);
  await expect(page.getByText('Nenhuma prova agendada')).toBeVisible();

  await page.goto('/app/disciplinas');
  await expect(page.getByText('Você ainda não tem disciplinas')).toBeVisible();
  await page.goto('/app/tarefas');
  await expect(page.getByText('Tarefa de Laura')).toHaveCount(0);
  await page.goto('/app/anotacoes');
  await expect(page.getByText('Nenhuma anotação ainda')).toBeVisible();

  // Endereços diretos para registros da outra conta.
  await page.goto(`/app/disciplinas/${disciplina.data!.id}`);
  await expect(page.getByText('Disciplina não encontrada')).toBeVisible();
  await page.goto(`/app/anotacoes/${anotacao.data!.id}`);
  await expect(page.getByText('Anotação não encontrada')).toBeVisible();
  await page.goto(`/app/calendario?vista=semana&data=${isoDaqui(3)}`);
  await expect(page.getByText('Prova de Laura')).toHaveCount(0);
});
