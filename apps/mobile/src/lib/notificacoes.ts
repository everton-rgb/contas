/**
 * notificacoes.ts — Agendamento de alertas locais com re-hidratação de fila.
 *
 * ⚠️ Restrição do iOS: no máximo 64 notificações locais PENDENTES por app.
 * Com 3 alertas por conta, isso estoura em ~21 contas. A estratégia aqui é
 * manter no device apenas a janela mais próxima e re-hidratar sempre que o app
 * abre, quando uma conta muda, e em background.
 *
 * Não usa push: nada de APNs, servidor ou certificado. Funciona offline.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const LIMITE_IOS = 64;
/** Margem de segurança: outras features podem agendar notificações também. */
export const COTA_CONTAS = 56;

/** Quantos dias antes do vencimento avisar. 0 = no próprio dia. */
export const DIAS_ALERTA = [3, 1, 0] as const;
/** Hora local do disparo. */
export const HORA_ALERTA = 8;
export const MINUTO_ALERTA = 0;

export interface ContaAlerta {
  id: string;
  descricao: string;
  valor: number | null;
  vencimento: string; // YYYY-MM-DD
  linhaDigitavel: string | null;
}

interface AlertaPlanejado {
  contaId: string;
  diasAntes: number;
  quando: Date;
  titulo: string;
  corpo: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function configurarHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('vencimentos', {
      name: 'Vencimentos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function pedirPermissao(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: novo } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return novo === 'granted';
}

// ─────────────────────────────────────────────────────────────────────────────

function brl(v: number | null): string {
  if (v === null) return 'valor a confirmar';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Data/hora local do alerta, sem armadilha de fuso. */
function momentoAlerta(vencimentoISO: string, diasAntes: number): Date {
  const [ano, mes, dia] = vencimentoISO.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia, HORA_ALERTA, MINUTO_ALERTA, 0, 0);
  d.setDate(d.getDate() - diasAntes);
  return d;
}

function planejar(contas: ContaAlerta[], agora = new Date()): AlertaPlanejado[] {
  const planejados: AlertaPlanejado[] = [];

  for (const c of contas) {
    for (const dias of DIAS_ALERTA) {
      const quando = momentoAlerta(c.vencimento, dias);
      if (quando <= agora) continue; // não agenda passado

      const titulo =
        dias === 0
          ? `Vence hoje: ${c.descricao}`
          : dias === 1
            ? `Vence amanhã: ${c.descricao}`
            : `Vence em ${dias} dias: ${c.descricao}`;

      const corpo = c.linhaDigitavel
        ? `${brl(c.valor)} · toque para copiar o código de barras`
        : brl(c.valor);

      planejados.push({ contaId: c.id, diasAntes: dias, quando, titulo, corpo });
    }
  }

  // Mais urgentes primeiro — são os que entram na cota.
  return planejados.sort((a, b) => a.quando.getTime() - b.quando.getTime());
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ResultadoSync {
  agendados: number;
  planejados: number;
  truncado: boolean;
  /** Data até a qual a fila do device está coberta. */
  cobertoAte: Date | null;
}

/**
 * Reconcilia o device com a lista de contas em aberto.
 * Chame em: abertura do app, mudança de conta, e background task.
 *
 * Estratégia simples e correta: cancela tudo e reagenda a janela.
 * Com ≤64 itens o custo é irrelevante e elimina a classe inteira de bugs de
 * sincronização parcial.
 */
export async function sincronizarAlertas(
  contas: ContaAlerta[],
  agora = new Date(),
): Promise<ResultadoSync> {
  const planejados = planejar(contas, agora);
  const janela = planejados.slice(0, COTA_CONTAS);

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const p of janela) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: p.titulo,
        body: p.corpo,
        data: { contaId: p.contaId, diasAntes: p.diasAntes },
        ...(Platform.OS === 'android' ? { channelId: 'vencimentos' } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.quando },
    });
  }

  return {
    agendados: janela.length,
    planejados: planejados.length,
    truncado: planejados.length > janela.length,
    cobertoAte: janela.length ? janela[janela.length - 1].quando : null,
  };
}

/** Diagnóstico — útil numa tela de debug enquanto o app amadurece. */
export async function inspecionarFila() {
  const pendentes = await Notifications.getAllScheduledNotificationsAsync();
  return {
    total: pendentes.length,
    limite: LIMITE_IOS,
    proximas: pendentes.slice(0, 5),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportado para teste puro (sem depender do runtime do Expo)
// ─────────────────────────────────────────────────────────────────────────────

export const _internos = { planejar, momentoAlerta, brl };
