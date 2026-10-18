import { describe, expect, it } from 'vitest';
import { dataValida, emailValido, horarioValido, obrigatorio, senhaValida, tamanhoMaximo } from './validacao';

describe('validacao', () => {
  it('valida e-mail', () => {
    expect(emailValido('')).toBe('Informe seu e-mail.');
    expect(emailValido('ana@')).toBe('Informe um e-mail válido.');
    expect(emailValido('ana@pucpr.edu.br')).toBeUndefined();
  });

  it('exige senha com 8 caracteres, letras e números', () => {
    expect(senhaValida('abc123')).toMatch(/8 caracteres/);
    expect(senhaValida('abcdefgh')).toMatch(/letras e números/);
    expect(senhaValida('abcd1234')).toBeUndefined();
  });

  it('valida campos obrigatórios e tamanho', () => {
    expect(obrigatorio('   ', 'O título')).toBe('O título é obrigatório.');
    expect(tamanhoMaximo('x'.repeat(161), 160)).toMatch(/160/);
  });

  it('valida data e horário', () => {
    expect(dataValida('')).toMatch(/obrigatória/);
    expect(dataValida('2026-02-31')).toMatch(/inválida/);
    expect(horarioValido('10:00', '09:00')).toMatch(/depois do início/);
    expect(horarioValido('', '09:00')).toMatch(/início/);
    expect(horarioValido('08:00', '10:00')).toBeUndefined();
  });
});
