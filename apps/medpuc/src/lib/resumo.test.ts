import { describe, expect, it } from 'vitest';
import type { Evento, Tarefa } from '../tipos/dominio';
import { calcularProgresso, proximaAvaliacaoPorDisciplina, proximaProva, tarefaAtrasada, tarefasPendentes } from './resumo';

function evento(parcial: Partial<Evento>): Evento {
  return {
    id: crypto.randomUUID(),
    user_id: 'u',
    disciplina_id: null,
    modelo_evento_id: null,
    titulo: 'Evento',
    tipo: 'prova',
    data: '2026-10-20',
    hora_inicio: null,
    hora_fim: null,
    descricao: null,
    cor: null,
    status: 'agendado',
    created_at: '',
    updated_at: '',
    ...parcial,
  };
}

function tarefa(parcial: Partial<Tarefa>): Tarefa {
  return {
    id: crypto.randomUUID(),
    user_id: 'u',
    disciplina_id: null,
    titulo: 'Tarefa',
    descricao: null,
    prazo: null,
    prioridade: 'media',
    status: 'pendente',
    concluida_em: null,
    created_at: '',
    updated_at: '',
    ...parcial,
  };
}

describe('resumo acadêmico', () => {
  it('calcula o progresso pelos conteúdos concluídos', () => {
    expect(calcularProgresso([])).toEqual({ total: 0, concluidos: 0, emAndamento: 0, percentual: 0 });
    expect(
      calcularProgresso([{ status: 'concluido' }, { status: 'em_andamento' }, { status: 'nao_iniciado' }]),
    ).toEqual({ total: 3, concluidos: 1, emAndamento: 1, percentual: 33 });
  });

  it('escolhe a próxima prova agendada, ignorando passadas, canceladas e outros tipos', () => {
    const certa = evento({ titulo: 'P2', data: '2026-10-22', hora_inicio: '08:00:00' });
    const eventos = [
      evento({ titulo: 'Passada', data: '2026-10-10' }),
      evento({ titulo: 'Cancelada', data: '2026-10-19', status: 'cancelado' }),
      evento({ titulo: 'Aula', data: '2026-10-19', tipo: 'aula' }),
      evento({ titulo: 'Mais tarde', data: '2026-10-22', hora_inicio: '14:00:00' }),
      certa,
    ];
    expect(proximaProva(eventos, '2026-10-18')?.titulo).toBe('P2');
  });

  it('agrupa a próxima avaliação por disciplina', () => {
    const mapa = proximaAvaliacaoPorDisciplina(
      [
        evento({ disciplina_id: 'a', titulo: 'Trabalho', tipo: 'trabalho', data: '2026-11-01' }),
        evento({ disciplina_id: 'a', titulo: 'Entrega', tipo: 'entrega', data: '2026-10-25' }),
        evento({ disciplina_id: 'b', titulo: 'Revisão', tipo: 'revisao', data: '2026-10-19' }),
      ],
      '2026-10-18',
    );
    expect(mapa.get('a')?.titulo).toBe('Entrega');
    expect(mapa.has('b')).toBe(false);
  });

  it('ordena pendências por prazo e prioridade e detecta atraso', () => {
    const lista = tarefasPendentes([
      tarefa({ titulo: 'Sem prazo' }),
      tarefa({ titulo: 'Concluída', status: 'concluida' }),
      tarefa({ titulo: 'Amanhã baixa', prazo: '2026-10-19', prioridade: 'baixa' }),
      tarefa({ titulo: 'Amanhã alta', prazo: '2026-10-19', prioridade: 'alta' }),
    ]);
    expect(lista.map((t) => t.titulo)).toEqual(['Amanhã alta', 'Amanhã baixa', 'Sem prazo']);
    expect(tarefaAtrasada({ prazo: '2026-10-17', status: 'pendente' }, '2026-10-18')).toBe(true);
    expect(tarefaAtrasada({ prazo: '2026-10-17', status: 'concluida' }, '2026-10-18')).toBe(false);
  });
});
