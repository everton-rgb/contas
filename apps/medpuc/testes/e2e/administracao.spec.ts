import { expect, test } from '@playwright/test';
import { admin, criarAluno, entrar } from './apoio';

const TITULO = `Modelo E2E ${Date.now()}`;

test.afterAll(async () => {
  await admin.from('modelos_periodo').delete().eq('titulo', TITULO);
});

test('aluno comum não acessa a administração', async ({ page }) => {
  const aluno = await criarAluno('Otávio Nunes');
  await entrar(page, aluno.email);
  await page.goto('/app/admin');
  await expect(page.getByText('Área restrita')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Administração' })).toHaveCount(0);
});

test('administrador publica modelo com datas e o aluno importa para a própria conta', async ({ browser }) => {
  const responsavel = await criarAluno('Paula Reis');
  await admin.from('administradores').insert({ user_id: responsavel.id });

  const paginaAdmin = await browser.newPage();
  await entrar(paginaAdmin, responsavel.email);
  await paginaAdmin.getByRole('link', { name: 'Administração' }).click();
  await paginaAdmin.getByRole('button', { name: 'Novo modelo' }).click();
  const formulario = paginaAdmin.getByRole('dialog', { name: 'Novo modelo de período' });
  await formulario.getByLabel('Título').fill(TITULO);
  await formulario.getByLabel('Período').selectOption('4');
  await formulario.getByLabel('Publicado para os alunos').check();
  await formulario.getByRole('button', { name: 'Salvar' }).click();

  const cartao = paginaAdmin.locator('section').filter({ hasText: TITULO });
  await cartao.getByRole('button', { name: 'Importar' }).click();
  const importacao = paginaAdmin.getByRole('dialog', { name: 'Importar disciplinas e datas' });
  await importacao.getByLabel(/Disciplinas/).fill('Bioquímica;#2F5D8A\nImunologia');
  await importacao.getByLabel(/Datas oficiais/).fill('Bioquímica;Prova;Prova de enzimas;10/03/2027;08:00;10:00\nFarmacologia;Prova;X;10/03/2027');
  await expect(importacao.getByRole('alert')).toContainText('Disciplina "Farmacologia" não está no modelo.');
  await importacao.getByLabel(/Datas oficiais/).fill('Bioquímica;Prova;Prova de enzimas;10/03/2027;08:00;10:00');
  await importacao.getByRole('button', { name: /Importar 2 disciplina\(s\) e 1 data\(s\)/ }).click();
  await expect(cartao.getByText('Prova de enzimas · Prova · 08:00')).toBeVisible();
  await paginaAdmin.close();

  const paginaAluno = await browser.newPage();
  const aluno = await criarAluno('Rafael Torres');
  await entrar(paginaAluno, aluno.email);
  await paginaAluno.goto('/app/configuracao');
  const modelo = paginaAluno.locator('section').filter({ hasText: TITULO });
  await expect(modelo.getByText('1 data cadastrada', { exact: true })).toBeVisible();
  await modelo.getByRole('checkbox').nth(1).uncheck(); // Imunologia
  await expect(modelo.getByText('Importar também 1 data cadastrada no modelo')).toBeVisible();
  await modelo.getByRole('button', { name: 'Adicionar 1 disciplina' }).click();
  await expect(paginaAluno.getByRole('link', { name: 'Bioquímica' })).toBeVisible();
  await expect(paginaAluno.getByRole('link', { name: 'Imunologia' })).toHaveCount(0);

  await paginaAluno.goto('/app/calendario?vista=mes&data=2027-03-10');
  await expect(paginaAluno.locator('[data-data="2027-03-10"]').getByRole('button', { name: /Prova de enzimas/ })).toBeVisible();

  // A cópia é do aluno: renomear não altera o modelo.
  await paginaAluno.goto('/app/disciplinas');
  await paginaAluno.getByRole('link', { name: 'Bioquímica' }).click();
  await paginaAluno.getByRole('button', { name: 'Editar' }).click();
  await paginaAluno.getByRole('dialog', { name: 'Editar disciplina' }).getByLabel('Nome').fill('Bioquímica — Turma B');
  await paginaAluno.getByRole('dialog', { name: 'Editar disciplina' }).getByRole('button', { name: 'Salvar' }).click();
  await expect(paginaAluno.getByRole('heading', { level: 1, name: 'Bioquímica — Turma B' })).toBeVisible();
  const { data: original } = await admin.from('modelos_disciplinas').select('nome').eq('nome', 'Bioquímica');
  expect(original).toHaveLength(1);
  await paginaAluno.close();
});
