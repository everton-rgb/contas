import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderizar } from '../../testes/utilitarios';
import { FormularioEvento } from './FormularioEvento';

const eventos = vi.hoisted(() => ({
  criarEvento: vi.fn(),
  atualizarEvento: vi.fn(),
  excluirEvento: vi.fn(),
  listarEventosNoIntervalo: vi.fn(),
  listarEventosFuturos: vi.fn(),
  listarEventosDaDisciplina: vi.fn(),
}));
vi.mock('../../servicos/eventos', () => eventos);
vi.mock('../../servicos/disciplinas', () => ({
  listarDisciplinas: vi.fn().mockResolvedValue([{ id: 'd1', nome: 'Neuroanatomia', cor: '#8C1D40', ordem: 1 }]),
}));

beforeEach(() => vi.clearAllMocks());

describe('FormularioEvento', () => {
  it('valida título e horário antes de salvar', async () => {
    const aoFechar = vi.fn();
    renderizar(<FormularioEvento aberto aoFechar={aoFechar} padrao={{ data: '2026-10-23' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('O título é obrigatório.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Título'), 'Prova 1');
    await userEvent.type(screen.getByLabelText(/Início/), '10:00');
    await userEvent.type(screen.getByLabelText(/Término/), '09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('O término precisa ser depois do início.')).toBeInTheDocument();
    expect(eventos.criarEvento).not.toHaveBeenCalled();
  });

  it('cria a prova vinculada à disciplina e fecha', async () => {
    eventos.criarEvento.mockResolvedValue({ id: 'e1' });
    const aoFechar = vi.fn();
    renderizar(<FormularioEvento aberto aoFechar={aoFechar} disciplinaFixa="d1" padrao={{ data: '2026-10-23', tipo: 'prova' }} />);
    await screen.findByRole('option', { name: 'Neuroanatomia' });
    await userEvent.type(screen.getByLabelText('Título'), 'Prova 1 — Tronco');
    await userEvent.type(screen.getByLabelText(/Início/), '08:00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(eventos.criarEvento).toHaveBeenCalledWith({
      titulo: 'Prova 1 — Tronco',
      tipo: 'prova',
      data: '2026-10-23',
      hora_inicio: '08:00',
      hora_fim: null,
      disciplina_id: 'd1',
      descricao: '',
      status: 'agendado',
      cor: null,
    });
    expect(await screen.findByText('Evento adicionado ao calendário.')).toBeInTheDocument();
  });

  it('pede confirmação antes de excluir', async () => {
    eventos.excluirEvento.mockResolvedValue(undefined);
    const evento = {
      id: 'e9', user_id: 'u', disciplina_id: null, modelo_evento_id: null, titulo: 'Revisão geral', tipo: 'revisao' as const,
      data: '2026-10-23', hora_inicio: null, hora_fim: null, descricao: null, cor: null, status: 'agendado' as const,
      created_at: '', updated_at: '',
    };
    const aoFechar = vi.fn();
    renderizar(<FormularioEvento aberto aoFechar={aoFechar} evento={evento} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(screen.getByRole('dialog', { name: 'Excluir evento?' })).toBeInTheDocument();
    expect(eventos.excluirEvento).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(eventos.excluirEvento).toHaveBeenCalledWith('e9'));
    expect(aoFechar).toHaveBeenCalled();
  });
});
