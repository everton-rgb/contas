import { expect, test } from '@playwright/test';
import { linkDoEmail } from '../ambiente';
import { criarAluno, emailUnico, entrar, SENHA } from './apoio';

test('cadastro com confirmação por e-mail leva ao painel', async ({ page }) => {
  const email = emailUnico('cadastro');
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Carla Mendes');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByLabel('Confirmar senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible();

  // Antes de confirmar, o login é recusado com mensagem clara.
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirme seu e-mail');

  await page.goto(await linkDoEmail(email, 'type=signup'));
  await expect(page).toHaveURL(/\/app#?$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Carla');
  await expect(page.getByText('Configure seu período')).toBeVisible();
});

test('login, logout e proteção das páginas privadas', async ({ page }) => {
  const aluno = await criarAluno('Diego Lima');

  await page.goto('/app/calendario');
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Fapp%2Fcalendario/);

  await page.getByLabel('E-mail').fill(aluno.email);
  await page.getByLabel('Senha').fill('senhaErrada1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');

  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\/calendario/);

  // A sessão persiste ao recarregar.
  await page.reload();
  await expect(page).toHaveURL(/\/app\/calendario/);
  await expect(page.getByRole('button', { name: 'Novo evento', exact: true })).toBeVisible();

  // Logado, a tela de login redireciona para o app.
  await page.goto('/entrar');
  await expect(page).toHaveURL(/\/app$/);

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await page.goto('/app/disciplinas');
  await expect(page).toHaveURL(/\/entrar\?voltar=/);
  expect(await page.evaluate(() => localStorage.getItem('medpuc-sessao'))).toBeNull();
});

test('recuperação de senha pelo link enviado por e-mail', async ({ page }) => {
  const aluno = await criarAluno('Elisa Prado');
  const novaSenha = 'novaSenha456';

  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await page.getByLabel('E-mail').fill(aluno.email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  await expect(page.getByText(/Se existir uma conta/)).toBeVisible();

  await page.goto(await linkDoEmail(aluno.email, 'type=recovery'));
  await expect(page).toHaveURL(/\/redefinir-senha/);
  await expect(page.getByRole('heading', { name: 'Criar nova senha' })).toBeVisible();
  await page.getByLabel('Nova senha', { exact: true }).fill(novaSenha);
  await page.getByLabel('Confirmar nova senha').fill(novaSenha);
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await page.getByLabel('E-mail').fill(aluno.email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');

  await entrar(page, aluno.email, novaSenha);
});

test('link de redefinição inválido mostra orientação', async ({ page }) => {
  await page.goto('/redefinir-senha#error=access_denied&error_code=otp_expired&error_description=expired');
  await expect(page.getByText('O link expirou ou já foi usado. Solicite um novo.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Solicitar novo link' })).toBeVisible();
});
