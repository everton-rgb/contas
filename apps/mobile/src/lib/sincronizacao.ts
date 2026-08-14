/**
 * sincronizacao.ts — cola entre o banco e a fila de notificações do device.
 *
 * Os três gatilhos da §6 da spec: abertura do app, alteração de conta, e a
 * tarefa de background. Todos chamam `reconciliar()`, que cancela tudo e
 * reagenda a janela — barato e imune a bug de sincronização parcial.
 */

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { listarContas, marcarVencidas } from './db';
import { sincronizarAlertas, type ContaAlerta, type ResultadoSync } from './notificacoes';

export const TAREFA_ALERTAS = 'vence-reconciliar-alertas';

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

TaskManager.defineTask(TAREFA_ALERTAS, async () => {
  try {
    await reconciliar();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registrarTarefaDeFundo(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;

  if (await TaskManager.isTaskRegisteredAsync(TAREFA_ALERTAS)) return;
  // O iOS trata isto como piso, não como agenda: na prática roda de madrugada.
  await BackgroundTask.registerTaskAsync(TAREFA_ALERTAS, { minimumInterval: 60 * 12 });
}
