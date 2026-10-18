import { describe, expect, it } from 'vitest';
import { validarConfiguracao } from './validacaoConfiguracao';

function jwt(carga: object) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(carga)}.assinatura`;
}

describe('validarConfiguracao', () => {
  it('aceita a chave pública', () => {
    expect(validarConfiguracao('https://abc.supabase.co/', 'sb_publishable_123')).toEqual({
      valida: true,
      url: 'https://abc.supabase.co',
      chave: 'sb_publishable_123',
    });
    expect(validarConfiguracao('https://abc.supabase.co', jwt({ role: 'anon' })).valida).toBe(true);
  });

  it('recusa chaves secretas para não expô-las no navegador', () => {
    expect(validarConfiguracao('https://abc.supabase.co', 'sb_secret_123').valida).toBe(false);
    expect(validarConfiguracao('https://abc.supabase.co', jwt({ role: 'service_role' })).valida).toBe(false);
  });

  it('exige variáveis e https fora do ambiente local', () => {
    expect(validarConfiguracao(undefined, 'x').valida).toBe(false);
    expect(validarConfiguracao('http://abc.supabase.co', 'sb_publishable_1').valida).toBe(false);
    expect(validarConfiguracao('http://127.0.0.1:54321', 'sb_publishable_1').valida).toBe(true);
    expect(validarConfiguracao('não é url', 'sb_publishable_1').valida).toBe(false);
  });
});
