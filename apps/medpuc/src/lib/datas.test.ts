import { describe, expect, it } from 'vitest';
import {
  contagemRegressiva,
  deISO,
  descreverDistancia,
  diasDaSemana,
  gradeDoMes,
  intervaloDaVista,
  isoValida,
  navegar,
  paraISO,
  tituloDaVista,
} from './datas';

describe('datas', () => {
  it('lê AAAA-MM-DD como data local, sem cair no dia anterior', () => {
    const d = deISO('2026-03-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(10);
    expect(paraISO(d)).toBe('2026-03-10');
  });

  it('valida datas inexistentes', () => {
    expect(isoValida('2026-02-30')).toBe(false);
    expect(isoValida('2026-13-01')).toBe(false);
    expect(isoValida('10/03/2026')).toBe(false);
    expect(isoValida('2028-02-29')).toBe(true);
  });

  it('monta a grade do mês com 42 dias começando no domingo', () => {
    const grade = gradeDoMes(deISO('2026-10-18'));
    expect(grade).toHaveLength(42);
    expect(grade[0]).toBe('2026-09-27');
    expect(deISO(grade[0]).getDay()).toBe(0);
    expect(grade).toContain('2026-10-01');
    expect(grade).toContain('2026-10-31');
  });

  it('calcula a semana e os intervalos de cada visão', () => {
    expect(diasDaSemana(deISO('2026-10-21'))).toEqual([
      '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24',
    ]);
    expect(intervaloDaVista('dia', deISO('2026-10-21'))).toEqual({ de: '2026-10-21', ate: '2026-10-21' });
    expect(intervaloDaVista('semana', deISO('2026-10-21'))).toEqual({ de: '2026-10-18', ate: '2026-10-24' });
    expect(intervaloDaVista('mes', deISO('2026-10-21'))).toEqual({ de: '2026-09-27', ate: '2026-11-07' });
  });

  it('navega entre meses, semanas e dias', () => {
    expect(paraISO(navegar('mes', deISO('2026-01-31'), 1))).toBe('2026-02-01');
    expect(paraISO(navegar('semana', deISO('2026-10-18'), -1))).toBe('2026-10-11');
    expect(paraISO(navegar('dia', deISO('2026-12-31'), 1))).toBe('2027-01-01');
  });

  it('gera títulos em português', () => {
    expect(tituloDaVista('mes', deISO('2026-10-18'))).toBe('outubro de 2026');
    expect(tituloDaVista('semana', deISO('2026-10-21'))).toBe('18 – 24 de outubro de 2026');
  });

  it('faz a contagem regressiva até o horário da prova', () => {
    const agora = new Date(2026, 9, 18, 10, 0);
    expect(contagemRegressiva('2026-10-20', '08:30:00', agora)).toEqual({ dias: 1, horas: 22, minutos: 30, encerrada: false });
    expect(contagemRegressiva('2026-10-18', '09:00', agora).encerrada).toBe(true);
    expect(contagemRegressiva('2026-10-19', null, agora)).toEqual({ dias: 0, horas: 14, minutos: 0, encerrada: false });
  });

  it('descreve a distância em dias', () => {
    const agora = new Date(2026, 9, 18, 23, 59);
    expect(descreverDistancia('2026-10-18', agora)).toBe('hoje');
    expect(descreverDistancia('2026-10-19', agora)).toBe('amanhã');
    expect(descreverDistancia('2026-10-25', agora)).toBe('em 7 dias');
    expect(descreverDistancia('2026-10-16', agora)).toBe('há 2 dias');
  });
});
