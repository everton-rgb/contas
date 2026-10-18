import { describe, expect, it } from 'vitest';
import { lerDisciplinas, lerEventos } from './importacao';

describe('importação do administrador', () => {
  it('lê disciplinas com e sem cor, ignorando comentários', () => {
    const { itens, erros } = lerDisciplinas('# lista\nNeuroanatomia;#8C1D40\n\nSentidos\nSentidos\nX;azul');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toEqual({ nome: 'Neuroanatomia', cor: '#8C1D40' });
    expect(itens[1].cor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(erros.map((e) => e.linha)).toEqual([5, 6]);
  });

  it('lê datas no formato brasileiro e por tabulação', () => {
    const texto = 'Neuroanatomia;Prova;Prova 1;10/03/2027;8:00;10:00\nsentidos\tAvaliação prática\tOSCE\t2027-04-02';
    const { itens, erros } = lerEventos(texto, ['Neuroanatomia', 'Sentidos']);
    expect(erros).toEqual([]);
    expect(itens).toEqual([
      { disciplina: 'Neuroanatomia', tipo: 'prova', titulo: 'Prova 1', data: '2027-03-10', hora_inicio: '08:00', hora_fim: '10:00' },
      { disciplina: 'Sentidos', tipo: 'avaliacao_pratica', titulo: 'OSCE', data: '2027-04-02', hora_inicio: null, hora_fim: null },
    ]);
  });

  it('aponta erros por linha', () => {
    const texto = [
      'Bioquímica;Prova;P1;10/03/2027',
      'Neuroanatomia;Seminário;P1;10/03/2027',
      'Neuroanatomia;Prova;;10/03/2027',
      'Neuroanatomia;Prova;P1;31/02/2027',
      'Neuroanatomia;Prova;P1;10/03/2027;10:00;09:00',
    ].join('\n');
    const { itens, erros } = lerEventos(texto, ['Neuroanatomia']);
    expect(itens).toEqual([]);
    expect(erros.map((e) => e.linha)).toEqual([1, 2, 3, 4, 5]);
  });
});
