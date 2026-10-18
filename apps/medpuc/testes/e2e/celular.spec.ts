import { expect, test, type Page } from '@playwright/test';
import { criarAluno, entrar, isoDaqui } from './apoio';

async function semRolagemHorizontal(page: Page) {
  const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(larguras.documento, `rolagem horizontal em ${page.url()}`).toBeLessThanOrEqual(larguras.janela);
}

test('páginas públicas cabem na tela do celular', async ({ page }) => {
  for (const rota of ['/', '/entrar', '/cadastro', '/recuperar-senha', '/planos']) {
    await page.goto(rota);
    await page.waitForLoadState('networkidle');
    await semRolagemHorizontal(page);
  }
});

test('uso no celular: navegação inferior, calendário e formulário', async ({ page }) => {
  const aluno = await criarAluno('Nina Freitas');
  await aluno.cliente.from('disciplinas').insert({ nome: 'Fisiologia do Sistema Locomotor', cor: '#0F766E' });
  await entrar(page, aluno.email);

  const navegacao = page.getByRole('navigation', { name: 'Principal' }).last();
  await expect(navegacao).toBeVisible();
  await expect(page.locator('aside')).toBeHidden();

  for (const [rotulo, caminho] of [
    ['Calendário', '/app/calendario'],
    ['Disciplinas', '/app/disciplinas'],
    ['Anotações', '/app/anotacoes'],
    ['Tarefas', '/app/tarefas'],
    ['Painel', '/app'],
  ] as const) {
    await navegacao.getByRole('link', { name: rotulo }).tap();
    await expect(page).toHaveURL(new RegExp(`${caminho}$`));
    await page.waitForLoadState('networkidle');
    await semRolagemHorizontal(page);
  }

  await page.goto('/app/perfil');
  await semRolagemHorizontal(page);

  // Criar um evento pelo calendário no celular.
  const data = isoDaqui(2);
  await page.goto(`/app/calendario?vista=mes&data=${data}`);
  await page.getByRole('button', { name: 'Novo evento', exact: true }).tap();
  const dialogo = page.getByRole('dialog', { name: 'Novo evento' });
  await expect(dialogo).toBeVisible();
  await dialogo.getByLabel('Título').fill('Avaliação prática — marcha');
  await dialogo.getByLabel('Tipo').selectOption('avaliacao_pratica');
  await dialogo.getByLabel('Disciplina').selectOption({ label: 'Fisiologia do Sistema Locomotor' });
  await dialogo.getByLabel('Data').fill(data);
  await dialogo.getByRole('button', { name: 'Salvar' }).tap();
  await expect(dialogo).toBeHidden();

  // No mês, o celular mostra pontos; tocar no dia abre a visão diária.
  const celula = page.locator(`[role="group"][data-data="${data}"]`);
  await celula.getByRole('button', { name: /1 compromisso/ }).tap();
  await expect(page).toHaveURL(/vista=dia/);
  await expect(page.getByText('Avaliação prática — marcha')).toBeVisible();
  await semRolagemHorizontal(page);
});
