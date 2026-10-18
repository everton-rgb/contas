/**
 * datas.ts — datas acadêmicas.
 *
 * O banco guarda `date` e `time` sem fuso: uma prova "dia 10 às 8h" é na hora
 * local da turma. Aqui toda conversão trata 'AAAA-MM-DD' como data local,
 * nunca como UTC (new Date('2026-03-10') cairia no dia 9 no Brasil).
 */

import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Vista = 'mes' | 'semana' | 'dia';

const OPCOES = { locale: ptBR, weekStartsOn: 0 as const };

export function paraISO(data: Date): string {
  return format(data, 'yyyy-MM-dd');
}

export function deISO(iso: string): Date {
  return parse(iso.slice(0, 10), 'yyyy-MM-dd', new Date());
}

export function isoValida(iso: string | null | undefined): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) && isValid(deISO(iso)) && paraISO(deISO(iso)) === iso;
}

export function hojeISO(agora = new Date()): string {
  return paraISO(agora);
}


/** "14:30:00" → "14:30" */
export function formatarHora(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : '';
}

export function formatarData(iso: string, padrao = "d 'de' MMM"): string {
  return format(deISO(iso), padrao, OPCOES);
}

export function formatarDataCompleta(iso: string): string {
  return format(deISO(iso), "EEEE, d 'de' MMMM 'de' yyyy", OPCOES);
}

export function formatarDataCurta(iso: string): string {
  return format(deISO(iso), 'dd/MM/yyyy', OPCOES);
}

/** 'EEEEEE' é a forma curta em pt-BR ("dom", "seg"); 'EEE' sai por extenso. */
export function formatarDiaSemana(iso: string, padrao = 'EEEEEE'): string {
  return format(deISO(iso), padrao, OPCOES);
}

export function formatarMesAno(data: Date): string {
  return format(data, "MMMM 'de' yyyy", OPCOES);
}

export function diasAte(iso: string, agora = new Date()): number {
  return differenceInCalendarDays(deISO(iso), agora);
}

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" */
export function descreverDistancia(iso: string, agora = new Date()): string {
  const dias = diasAte(iso, agora);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  if (dias > 1) return `em ${dias} dias`;
  return `há ${-dias} dias`;
}

export type Contagem = { dias: number; horas: number; minutos: number; encerrada: boolean };

/**
 * Tempo até o início do compromisso. Sem horário, conta até o começo do dia.
 */
export function contagemRegressiva(iso: string, hora: string | null, agora = new Date()): Contagem {
  const alvo = deISO(iso);
  if (hora) {
    const [h, m] = hora.split(':').map(Number);
    alvo.setHours(h, m, 0, 0);
  }
  const restante = alvo.getTime() - agora.getTime();
  if (restante <= 0) return { dias: 0, horas: 0, minutos: 0, encerrada: true };
  const minutosTotais = Math.floor(restante / 60_000);
  return {
    dias: Math.floor(minutosTotais / 1440),
    horas: Math.floor((minutosTotais % 1440) / 60),
    minutos: minutosTotais % 60,
    encerrada: false,
  };
}

// ── Calendário ──────────────────────────────────────────────────────────────

/** 42 dias (6 semanas) cobrindo o mês, começando no domingo. */
export function gradeDoMes(referencia: Date): string[] {
  const inicio = startOfWeek(startOfMonth(referencia), OPCOES);
  return Array.from({ length: 42 }, (_, i) => paraISO(addDays(inicio, i)));
}

export function diasDaSemana(referencia: Date): string[] {
  const inicio = startOfWeek(referencia, OPCOES);
  return Array.from({ length: 7 }, (_, i) => paraISO(addDays(inicio, i)));
}

export function intervaloDaVista(vista: Vista, referencia: Date): { de: string; ate: string } {
  if (vista === 'mes') {
    const grade = gradeDoMes(referencia);
    return { de: grade[0], ate: grade[41] };
  }
  if (vista === 'semana') {
    return { de: paraISO(startOfWeek(referencia, OPCOES)), ate: paraISO(endOfWeek(referencia, OPCOES)) };
  }
  const dia = paraISO(referencia);
  return { de: dia, ate: dia };
}

export function navegar(vista: Vista, referencia: Date, passo: 1 | -1): Date {
  if (vista === 'mes') return addMonths(startOfMonth(referencia), passo);
  if (vista === 'semana') return addWeeks(referencia, passo);
  return addDays(referencia, passo);
}

export function tituloDaVista(vista: Vista, referencia: Date): string {
  if (vista === 'mes') return formatarMesAno(referencia);
  if (vista === 'dia') return formatarDataCompleta(paraISO(referencia));
  const [inicio, , , , , , fim] = diasDaSemana(referencia);
  const mesmoMes = inicio.slice(0, 7) === fim.slice(0, 7);
  return mesmoMes
    ? `${formatarData(inicio, 'd')} – ${formatarData(fim, "d 'de' MMMM 'de' yyyy")}`
    : `${formatarData(inicio, "d 'de' MMM")} – ${formatarData(fim, "d 'de' MMM 'de' yyyy")}`;
}

export function mesmoMes(iso: string, referencia: Date): boolean {
  return iso.slice(0, 7) === paraISO(referencia).slice(0, 7);
}


export const NOMES_DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
