import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { deISO } from '../../lib/datas';
import type { Conteudo, Disciplina, Evento, Tarefa } from '../../tipos/dominio';
import { agruparPorDia, montarItens, type FiltrosCalendario } from './itens';
import { VistaMes } from './Vistas';

const neuro = { id: 'd1', nome: 'Neuroanatomia', cor: '#8C1D40' } as Disciplina;
const sentidos = { id: 'd2', nome: 'Sentidos', cor: '#A3367D' } as Disciplina;
const disciplinas = new Map([
  [neuro.id, neuro],
  [sentidos.id, sentidos],
]);

const prova = {
  id: 'e1', disciplina_id: 'd1', titulo: 'Prova 1', tipo: 'prova', data: '2026-10-23', hora_inicio: '08:00:00',
  hora_fim: null, status: 'agendado', cor: null,
} as Evento;
const aula = { id: 'e2', disciplina_id: 'd2', titulo: 'Aula prática', tipo: 'aula', data: '2026-10-21', hora_inicio: null, hora_fim: null, status: 'agendado', cor: null } as Evento;
const tarefa = { id: 't1', disciplina_id: 'd1', titulo: 'Resumo', prazo: '2026-10-21', status: 'pendente' } as Tarefa;
const conteudo = { id: 'c1', disciplina_id: 'd2', titulo: 'Retina', data_prevista: '2026-10-22', status: 'nao_iniciado' } as Conteudo;

const todos: FiltrosCalendario = { disciplinas: new Set(), tipo: '', tarefas: true, estudos: true };
const intervalo = { de: '2026-09-27', ate: '2026-11-07' };
const fontes = { eventos: [prova, aula], tarefas: [tarefa], conteudos: [conteudo] };

describe('itens do calendário', () => {
  it('junta eventos, prazos e estudos sem duplicar, com a cor da disciplina', () => {
    const itens = montarItens(fontes, disciplinas, todos, intervalo);
    expect(itens.map((i) => `${i.tipo}:${i.id}`)).toEqual(['evento:e2', 'tarefa:t1', 'conteudo:c1', 'evento:e1']);
    expect(itens.find((i) => i.id === 'e1')?.cor).toBe('#8C1D40');
  });

  it('filtra por disciplina, por tipo e por camada', () => {
    const soNeuro = montarItens(fontes, disciplinas, { ...todos, disciplinas: new Set(['d1']) }, intervalo);
    expect(soNeuro.map((i) => i.id)).toEqual(['t1', 'e1']);
    const soProvas = montarItens(fontes, disciplinas, { ...todos, tipo: 'prova' }, intervalo);
    expect(soProvas.map((i) => i.id)).toEqual(['e1']);
    const semCamadas = montarItens(fontes, disciplinas, { ...todos, tarefas: false, estudos: false }, intervalo);
    expect(semCamadas.map((i) => i.id)).toEqual(['e2', 'e1']);
  });

  it('mostra a prova na célula da data certa e abre ao clicar', async () => {
    const aoAbrir = vi.fn();
    const porDia = agruparPorDia(montarItens(fontes, disciplinas, todos, intervalo));
    const { container } = render(
      <VistaMes referencia={deISO('2026-10-18')} porDia={porDia} aoAbrir={aoAbrir} aoNovo={vi.fn()} aoIrParaDia={vi.fn()} />,
    );
    const celula = container.querySelector<HTMLElement>('[data-data="2026-10-23"]')!;
    const botao = within(celula).getByRole('button', { name: /Prova 1/ });
    await userEvent.click(botao);
    expect(aoAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', tipo: 'evento' }));
    expect(within(container.querySelector<HTMLElement>('[data-data="2026-10-22"]')!).queryByRole('button', { name: /Prova 1/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /Prova 1/ })).toHaveLength(1);
  });
});
