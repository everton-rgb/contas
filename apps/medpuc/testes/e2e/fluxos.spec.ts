import { expect, test } from '@playwright/test';
import { criarAluno, entrar, isoDaqui } from './apoio';

test('cria e edita uma disciplina personalizada, com conteúdos e progresso', async ({ page }) => {
  const aluno = await criarAluno('Fábio Rocha');
  await entrar(page, aluno.email);

  await page.goto('/app/disciplinas');
  await expect(page.getByText('Você ainda não tem disciplinas')).toBeVisible();
  await page.getByRole('button', { name: 'Nova disciplina' }).first().click();
  const dialogo = page.getByRole('dialog', { name: 'Nova disciplina' });
  await dialogo.getByLabel('Nome').fill('Bioética');
  await dialogo.getByRole('radio', { name: 'Cor #0F766E' }).click();
  await dialogo.getByLabel(/Professor/).fill('Profa. Helena');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('link', { name: 'Bioética' })).toBeVisible();

  await page.getByRole('link', { name: 'Bioética' }).click();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('dialog', { name: 'Editar disciplina' }).getByLabel('Nome').fill('Bioética e Humanidades');
  await page.getByRole('dialog', { name: 'Editar disciplina' }).getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bioética e Humanidades' })).toBeVisible();

  await page.getByRole('link', { name: 'Conteúdos', exact: true }).click();
  for (const titulo of ['Princípios da bioética', 'Consentimento informado']) {
    await page.getByLabel('Novo conteúdo').fill(titulo);
    await page.getByLabel('Novo conteúdo').press('Enter');
    await expect(page.getByText(titulo, { exact: true })).toBeVisible();
  }
  await page.getByLabel('Status de Princípios da bioética').selectOption('concluido');
  await expect(page.getByText('1 de 2 concluídos')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Bioética e Humanidades' })).toBeVisible();
  await expect(page.getByText('1 de 2 concluídos')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progresso de conteúdos' })).toHaveAttribute('aria-valuenow', '50');
});

test('prova cadastrada na disciplina aparece no calendário e no painel, sem duplicar', async ({ page }) => {
  const aluno = await criarAluno('Gabriela Souza');
  await entrar(page, aluno.email);
  const data = isoDaqui(6);

  await page.goto('/app/configuracao');
  await page.getByRole('button', { name: 'Adicionar 8 disciplinas' }).click();
  await expect(page).toHaveURL(/\/app\/disciplinas$/);
  await expect(page.getByRole('link', { name: 'Neuroanatomia' })).toBeVisible();

  await page.getByRole('link', { name: 'Neuroanatomia' }).click();
  await page.getByRole('link', { name: 'Avaliações e datas' }).click();
  await page.getByRole('button', { name: 'Nova avaliação ou data' }).click();
  const formulario = page.getByRole('dialog', { name: 'Novo evento' });
  await formulario.getByLabel('Título').fill('Prova 1 — Tronco encefálico');
  await formulario.getByLabel('Data').fill(data);
  await formulario.getByLabel(/Início/).fill('08:00');
  await formulario.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Evento adicionado ao calendário.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Prova 1 — Tronco encefálico/ })).toBeVisible();

  // Calendário mensal: uma única ocorrência, na data certa.
  await page.goto(`/app/calendario?vista=mes&data=${data}`);
  const celula = page.locator(`[role="group"][data-data="${data}"]`);
  await expect(celula.getByRole('button', { name: /Prova 1 — Tronco encefálico/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Prova 1 — Tronco encefálico/ })).toHaveCount(1);

  // Editar pelo calendário reflete na disciplina (mesmo registro).
  await celula.getByRole('button', { name: /Prova 1 — Tronco encefálico/ }).click();
  await page.getByRole('dialog', { name: 'Editar evento' }).getByLabel('Título').fill('Prova 1 — Tronco e cerebelo');
  await page.getByRole('dialog', { name: 'Editar evento' }).getByRole('button', { name: 'Salvar' }).click();
  await expect(celula.getByRole('button', { name: /Prova 1 — Tronco e cerebelo/ })).toBeVisible();

  await page.goto(`/app/calendario?vista=semana&data=${data}`);
  await expect(page.locator(`section[data-data="${data}"]`).getByText('Prova 1 — Tronco e cerebelo')).toBeVisible();
  await page.goto(`/app/calendario?vista=dia&data=${data}`);
  await expect(page.getByText('Prova 1 — Tronco e cerebelo')).toBeVisible();

  // Filtro por disciplina: escondida quando outra disciplina é escolhida.
  await page.goto(`/app/calendario?vista=mes&data=${data}`);
  await page.getByRole('button', { name: /^Filtros/ }).click();
  await page.getByRole('button', { name: 'Sentidos' }).click();
  await expect(page.getByRole('button', { name: /Prova 1 — Tronco e cerebelo/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByRole('button', { name: /Prova 1 — Tronco e cerebelo/ })).toHaveCount(1);

  await page.goto('/app');
  await expect(page.getByText('Próxima prova').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prova 1 — Tronco e cerebelo' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveAttribute('aria-label', /Faltam (5|6) dias/);

  await page.goto('/app/disciplinas');
  await expect(page.getByRole('article').filter({ hasText: 'Neuroanatomia' })).toContainText('Prova');

  // Exclusão com confirmação remove do calendário.
  await page.goto(`/app/calendario?vista=mes&data=${data}`);
  await celula.getByRole('button', { name: /Prova 1 — Tronco e cerebelo/ }).click();
  await page.getByRole('dialog', { name: 'Editar evento' }).getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('dialog', { name: 'Excluir evento?' }).getByRole('button', { name: 'Excluir' }).click();
  await expect(page.getByRole('button', { name: /Prova 1 — Tronco e cerebelo/ })).toHaveCount(0);
});

test('anotação é salva automaticamente, persiste ao recarregar e aparece na pesquisa', async ({ page }) => {
  const aluno = await criarAluno('Heitor Alves');
  await entrar(page, aluno.email);

  await page.goto('/app/anotacoes');
  await page.getByRole('button', { name: 'Nova anotação' }).first().click();
  await expect(page).toHaveURL(/\/app\/anotacoes\/nova/);
  await page.getByLabel('Título da anotação').fill('Nervos cranianos');
  await page.getByRole('textbox', { name: 'Conteúdo da anotação' }).click();
  await page.keyboard.type('Núcleos do trigêmeo');
  await page.getByRole('button', { name: 'Checklist' }).click();
  await page.keyboard.type('Revisar vias aferentes');

  await expect(page.getByRole('status').filter({ hasText: /Salvo às/ })).toBeVisible();
  await expect(page).toHaveURL(/\/app\/anotacoes\/[0-9a-f-]{36}$/);

  await page.reload();
  await expect(page.getByLabel('Título da anotação')).toHaveValue('Nervos cranianos');
  const editor = page.getByRole('textbox', { name: 'Conteúdo da anotação' });
  await expect(editor).toContainText('Núcleos do trigêmeo');
  await expect(editor.locator('ul[data-type="taskList"]')).toContainText('Revisar vias aferentes');

  await page.goto('/app/anotacoes');
  await page.getByLabel('Pesquisar anotações').fill('trigemeo');
  await expect(page.getByRole('link', { name: /Nervos cranianos/ })).toBeVisible();
  await page.getByLabel('Pesquisar anotações').fill('farmacocinética');
  await expect(page.getByText('Nenhuma anotação encontrada')).toBeVisible();
});

test('abrir uma anotação nova e desistir não cria registro vazio', async ({ page }) => {
  const aluno = await criarAluno('Íris Campos');
  await entrar(page, aluno.email);
  await page.goto('/app/anotacoes');
  await page.getByRole('button', { name: 'Nova anotação' }).first().click();
  await expect(page.getByLabel('Título da anotação')).toBeVisible();
  await page.getByRole('link', { name: 'Voltar' }).click();
  await expect(page.getByText('Nenhuma anotação ainda')).toBeVisible();
  const { count } = await aluno.cliente.from('anotacoes').select('id', { count: 'exact', head: true });
  expect(count).toBe(0);
});

test('tarefa é criada, concluída e continua concluída após recarregar', async ({ page }) => {
  const aluno = await criarAluno('João Pereira');
  await entrar(page, aluno.email);

  await page.goto('/app/tarefas');
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Nova tarefa' });
  await dialogo.getByLabel('Título').fill('Lista de exercícios de neurofisiologia');
  await dialogo.getByLabel(/Prazo/).fill(isoDaqui(2));
  await dialogo.getByLabel('Prioridade').selectOption('alta');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();

  const item = page.getByRole('listitem').filter({ hasText: 'Lista de exercícios de neurofisiologia' });
  await expect(item).toContainText('Alta');
  await item.getByRole('checkbox', { name: /Concluir/ }).click();
  await expect(page.getByText('Tarefa concluída.')).toBeVisible();
  await expect(item).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Nenhuma tarefa por aqui')).toBeVisible();
  await page.getByRole('button', { name: 'Concluídas' }).click();
  await expect(page.getByRole('checkbox', { name: /Reabrir "Lista de exercícios de neurofisiologia"/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  await page.goto('/app');
  await expect(page.getByText('Nenhuma tarefa pendente. Bom trabalho!')).toBeVisible();
});
