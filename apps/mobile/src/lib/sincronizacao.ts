/**
 * sincronizacao.ts — cola entre o banco e a fila de notificações do device.
 *
 * Os três gatilhos da §6 da spec: abertura do app, alteração de conta, e a
 * tarefa de background. Todos chamam `reconciliar()`, que cancela tudo e
 * reagenda a janela — barato e imune a bug de sincronização parcial.
 *
 * A tarefa de fundo depende de código nativo que o Expo Go não carrega. Ela é
 * registrada sob try/catch: sem ela o app perde só a reconciliação noturna,
 * porque abertura e alteração de conta continuam reagendando.
 */

import * as TaskManager from 'expo-task-manager';
import { listarContas, marcarVencidas } from './db';
import { sincronizarAlertas, type ContaAlerta, type ResultadoSync } from './notificacoes';

export const TAREFA_ALERTAS = 'vence-reconciliar-alertas';

type ModuloBackgroundTask = typeof import('expo-background-task');

let BackgroundTask: ModuloBackgroundTask | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  BackgroundTask = require('expo-background-task') as ModuloBackgroundTask;
} catch {
  BackgroundTask = null;
}

/** true quando o build atual consegue rodar a reconciliação em background. */
export const BACKGROUND_DISPONIVEL = BackgroundTask !== null;

export async function reconciliar(): Promise<ResultadoSync> {
  const contas = await listarContas();

  const agendaveis: ContaAlerta[] = contas
    .filter((c) => c.status === 'agendada' && c.vencimento !== null)
    .map((c) => ({
      id: c.id,
      descricao: c.descricao,
      valor: c.valor,
      vencimento: c.vencimento as string,
      linhaDigitavel: c.linha_digitavel,
    }));

  return sincronizarAlertas(agendaveis);
}

/** Chamado na abertura: primeiro reclassifica o que venceu, depois reagenda. */
export async function aoAbrirApp(): Promise<ResultadoSync> {
  try {
    await marcarVencidas();
  } catch {
    // Reclassificar é oportunista: sem rede, os alertas locais seguem valendo.
  }
  return reconciliar();
}

if (BackgroundTask) {
  const modulo = BackgroundTask;
  TaskManager.defineTask(TAREFA_ALERTAS, async () => {
    try {
      await reconciliar();
      return modulo.BackgroundTaskResult.Success;
    } catch {
      return modulo.BackgroundTaskResult.Failed;
    }
  });
}

export async function registrarTarefaDeFundo(): Promise<void> {
  if (!BackgroundTask) return;

  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;

    if (await TaskManager.isTaskRegisteredAsync(TAREFA_ALERTAS)) return;
    // O iOS trata isto como piso, não como agenda: na prática roda de madrugada.
    await BackgroundTask.registerTaskAsync(TAREFA_ALERTAS, { minimumInterval: 60 * 12 });
  } catch {
    // Sem tarefa de fundo o app segue: abertura e edição já reconciliam.
  }
}
