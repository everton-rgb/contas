import { expect, test } from '@playwright/test';
import { criarAluno, entrar, SENHA } from './apoio';

test('perfil é atualizado e a conta pode ser excluída com confirmação', async ({ page }) => {
  const aluno = await criarAluno('Sofia Barros');
  await aluno.cliente.from('disciplinas').insert({ nome: 'Sentidos', cor: '#A3367D' });
  await entrar(page, aluno.email);

  await page.goto('/app/perfil');
  await expect(page.getByText('1 de 20')).toBeVisible();
  await page.getByLabel('Nome').fill('Sofia Barros Lima');
  await page.getByLabel(/Período atual/).selectOption('3');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Perfil atualizado.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome')).toHaveValue('Sofia Barros Lima');
  await expect(page.getByLabel(/Período atual/)).toHaveValue('3');

  await page.getByRole('button', { name: 'Excluir minha conta' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Excluir conta definitivamente?' });
  await expect(dialogo.getByRole('button', { name: 'Excluir tudo' })).toBeDisabled();
  await dialogo.getByLabel('Confirmação').fill('EXCLUIR');
  await dialogo.getByRole('button', { name: 'Excluir tudo' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(aluno.email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
});
