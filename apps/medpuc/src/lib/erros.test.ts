import { describe, expect, it } from 'vitest';
import { comoErroApp, ErroApp, MENSAGEM_PADRAO, MENSAGEM_SEM_CONEXAO, traduzirErro } from './erros';

describe('traduzirErro', () => {
  it('traduz erros do Supabase Auth pelo código', () => {
    expect(traduzirErro({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('E-mail ou senha incorretos.');
    expect(traduzirErro({ code: 'email_not_confirmed' })).toMatch(/Confirme seu e-mail/);
    expect(traduzirErro({ code: 'weak_password' })).toMatch(/senha é fraca/);
  });

  it('traduz mensagens antigas sem código', () => {
    expect(traduzirErro({ message: 'User already registered' })).toBe('Já existe uma conta com este e-mail.');
    expect(traduzirErro({ message: 'TypeError: Failed to fetch' })).toBe(MENSAGEM_SEM_CONEXAO);
  });

  it('traduz erros do banco e o limite do plano', () => {
    expect(traduzirErro({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/permissão/);
    expect(traduzirErro({ code: 'MP001', details: '{"recurso": "disciplinas", "limite": 20, "plano": "gratuito"}' })).toBe(
      'Seu plano atual permite até 20 disciplinas. Remova algum item ou conheça os planos.',
    );
  });

  it('não expõe mensagens técnicas desconhecidas', () => {
    expect(traduzirErro({ code: 'XX000', message: 'internal error at line 3' })).toBe(MENSAGEM_PADRAO);
    expect(traduzirErro(null)).toBe(MENSAGEM_PADRAO);
  });

  it('preserva código e causa em ErroApp', () => {
    const original = { code: 'email_not_confirmed', message: 'Email not confirmed' };
    const erro = comoErroApp(original);
    expect(erro).toBeInstanceOf(ErroApp);
    expect(erro.codigo).toBe('email_not_confirmed');
    expect(erro.causa).toBe(original);
    expect(comoErroApp(erro)).toBe(erro);
  });
});
