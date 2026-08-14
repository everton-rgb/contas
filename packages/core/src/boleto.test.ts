/**
 * Suite de testes do motor de boletos. Roda sem dependências:
 *   node --experimental-strip-types boleto.test.ts
 */

import {
  parseBoleto,
  fatorParaData,
  mod10,
  mod11Barras,
  mod11Arrecadacao,
  linhaParaBarrasBancario,
  barrasParaLinhaBancario,
  barrasParaLinhaArrecadacao,
  linhaParaBarrasArrecadacao,
  formatarLinhaDigitavel,
  extrairDeTexto,
  type BoletoOk,
} from './boleto.ts';

let passou = 0;
let falhou = 0;

function t(nome: string, fn: () => void) {
  try {
    fn();
    passou++;
    console.log(`  ✓ ${nome}`);
  } catch (e) {
    falhou++;
    console.log(`  ✗ ${nome}\n      ${(e as Error).message}`);
  }
}

function eq(atual: unknown, esperado: unknown, msg = '') {
  const a = JSON.stringify(atual);
  const b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${msg} esperado ${b}, obtido ${a}`);
}

function grupo(nome: string) {
  console.log(`\n${nome}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: monta boletos sintéticos com DVs corretos
// ─────────────────────────────────────────────────────────────────────────────

function montarBancario(banco: string, fator: number, centavos: number, livre25: string): string {
  const semDV =
    banco + '9' + String(fator).padStart(4, '0') + String(centavos).padStart(10, '0') + livre25;
  const dv = mod11Barras(semDV);
  const cb = banco + '9' + dv + semDV.slice(4);
  return barrasParaLinhaBancario(cb);
}

function montarArrecadacao(segmento: number, ident: number, valor11: string, resto29: string): string {
  const corpo = '8' + segmento + ident + '0' + valor11 + resto29; // DV geral provisório
  const semDV = corpo.slice(0, 3) + corpo.slice(4);
  const dv = ident === 6 || ident === 7 ? mod10(semDV) : mod11Arrecadacao(semDV);
  const cb = corpo.slice(0, 3) + dv + corpo.slice(4);
  return barrasParaLinhaArrecadacao(cb);
}

const HOJE = new Date(Date.UTC(2026, 7, 14)); // 14/08/2026, determinístico

// ─────────────────────────────────────────────────────────────────────────────

grupo('Dígitos verificadores');

t('mod10 conhecido (conferido à mão)', () => {
  // 0019 → 9×2=18→9, 1×1=1, 0, 0 = soma 10 → DV (10-0)%10 = 0
  eq(mod10('0019'), 0);
  // 123456789 → 9,8,5,6,1,4,6,2,2 = soma 43 → DV 10-3 = 7
  eq(mod10('123456789'), 7);
  eq(mod10('00000000000'), 0);
});

t('mod11Barras nunca devolve 0, 10 ou 11', () => {
  for (let i = 0; i < 300; i++) {
    const s = Array.from({ length: 43 }, () => String(Math.floor(Math.random() * 10))).join('');
    const dv = mod11Barras(s);
    if (dv < 1 || dv > 9) throw new Error(`DV fora da faixa 1..9: ${dv}`);
  }
});

t('mod11Arrecadacao sempre em 0..9', () => {
  for (let i = 0; i < 300; i++) {
    const s = Array.from({ length: 11 }, () => String(Math.floor(Math.random() * 10))).join('');
    const dv = mod11Arrecadacao(s);
    if (dv < 0 || dv > 9) throw new Error(`DV fora da faixa 0..9: ${dv}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

grupo('Fator de vencimento — âncoras oficiais FEBRABAN');

t('base ANTIGA: fator 1000 = 03/07/2000', () => {
  // Referência histórica. Fora da janela de plausibilidade em 2026,
  // então validamos a aritmética da base diretamente.
  const ms = Date.UTC(1997, 9, 7) + 1000 * 86400000;
  eq(new Date(ms).toISOString().slice(0, 10), '2000-07-03');
});

t('base ANTIGA: fator 9999 = 21/02/2025 (último dia antes da virada)', () => {
  const ms = Date.UTC(1997, 9, 7) + 9999 * 86400000;
  eq(new Date(ms).toISOString().slice(0, 10), '2025-02-21');
});

t('base NOVA: fator 1000 = 22/02/2025 (primeiro dia após a virada)', () => {
  const ms = Date.UTC(2022, 4, 29) + 1000 * 86400000;
  eq(new Date(ms).toISOString().slice(0, 10), '2025-02-22');
});

t('fator 1000 hoje resolve para 2025, NÃO para 2000', () => {
  eq(fatorParaData(1000, HOJE), '2025-02-22');
});

t('fator 1600 resolve pela base nova', () => {
  const esperado = new Date(Date.UTC(2022, 4, 29) + 1600 * 86400000).toISOString().slice(0, 10);
  eq(fatorParaData(1600, HOJE), esperado);
  eq(fatorParaData(1600, HOJE), '2026-10-15');
});

t('fator 9998 (boleto legado, pré-virada) resolve pela base antiga', () => {
  eq(fatorParaData(9998, HOJE), '2025-02-20');
});

t('fator 0000 = sem vencimento', () => {
  eq(fatorParaData(0, HOJE), null);
});

t('bases distam ~24,6 anos — sem ambiguidade em janela de 20 anos', () => {
  const delta = (Date.UTC(2022, 4, 29) - Date.UTC(1997, 9, 7)) / 86400000;
  if (delta < 8900 || delta > 9100) throw new Error(`delta inesperado: ${delta} dias`);
});

// ─────────────────────────────────────────────────────────────────────────────

grupo('Boleto bancário');

const ldBanco = montarBancario('341', 1600, 125045, '1234567890123456789012345');

t('round-trip linha ⇄ barras', () => {
  const cb = linhaParaBarrasBancario(ldBanco);
  eq(cb.length, 44);
  eq(barrasParaLinhaBancario(cb), ldBanco);
});

t('parse extrai valor e vencimento corretos', () => {
  const r = parseBoleto(ldBanco, HOJE) as BoletoOk;
  eq(r.ok, true);
  eq(r.tipo, 'bancario');
  eq(r.valor, 1250.45);
  eq(r.vencimento, '2026-10-15');
  eq(r.codigoBanco, '341');
  eq(r.nomeBanco, 'Itaú');
  eq(r.pendencias, { vencimento: false, valor: false });
});

t('aceita linha digitável formatada com pontos e espaços', () => {
  const formatada = formatarLinhaDigitavel(ldBanco);
  if (!formatada.includes('.')) throw new Error('formatação não aplicada');
  const r = parseBoleto(formatada, HOJE) as BoletoOk;
  eq(r.ok, true);
  eq(r.linhaDigitavel, ldBanco);
});

t('aceita o código de barras de 44 dígitos direto (leitura por câmera)', () => {
  const cb = linhaParaBarrasBancario(ldBanco);
  const r = parseBoleto(cb, HOJE) as BoletoOk;
  eq(r.ok, true);
  eq(r.valor, 1250.45);
  eq(r.vencimento, '2026-10-15');
});

t('rejeita erro de um dígito (DV de campo)', () => {
  const corrompido = ldBanco.slice(0, 3) + ((Number(ldBanco[3]) + 1) % 10) + ldBanco.slice(4);
  const r = parseBoleto(corrompido, HOJE);
  eq(r.ok, false);
});

t('detecta troca de dígitos adjacentes na maioria dos casos', () => {
  let detectados = 0;
  let total = 0;
  for (let i = 0; i < 46; i++) {
    if (ldBanco[i] === ldBanco[i + 1]) continue;
    total++;
    const t2 = ldBanco.slice(0, i) + ldBanco[i + 1] + ldBanco[i] + ldBanco.slice(i + 2);
    if (!parseBoleto(t2, HOJE).ok) detectados++;
  }
  if (detectados / total < 0.8) {
    throw new Error(`detecção baixa: ${detectados}/${total}`);
  }
});

t('boleto sem valor definido sinaliza pendência', () => {
  const ld = montarBancario('001', 1600, 0, '1234567890123456789012345');
  const r = parseBoleto(ld, HOJE) as BoletoOk;
  eq(r.valor, null);
  eq(r.pendencias.valor, true);
  if (!r.avisos.some((a) => a.includes('valor'))) throw new Error('aviso ausente');
});

t('fuzz: 500 boletos sintéticos fazem round-trip e parse', () => {
  for (let i = 0; i < 500; i++) {
    const fator = 1000 + Math.floor(Math.random() * 1500);
    const centavos = Math.floor(Math.random() * 99999999);
    const livre = Array.from({ length: 25 }, () => Math.floor(Math.random() * 10)).join('');
    const ld = montarBancario('237', fator, centavos, livre);
    const r = parseBoleto(ld, HOJE);
    if (!r.ok) throw new Error(`falhou no boleto ${i}: ${r.erro}`);
    eq(r.valor, centavos === 0 ? null : centavos / 100);
    eq(r.vencimento, fatorParaData(fator, HOJE));
  }
});

// ─────────────────────────────────────────────────────────────────────────────

grupo('Boleto de arrecadação');

const ldAgua = montarArrecadacao(2, 8, '00000008790', '12345678901234567890123456789');

t('round-trip linha ⇄ barras (48 dígitos)', () => {
  eq(ldAgua.length, 48);
  const cb = linhaParaBarrasArrecadacao(ldAgua);
  eq(cb.length, 44);
  eq(barrasParaLinhaArrecadacao(cb), ldAgua);
});

t('identifica segmento e sugere categoria', () => {
  const r = parseBoleto(ldAgua, HOJE) as BoletoOk;
  eq(r.ok, true);
  eq(r.tipo, 'arrecadacao');
  eq(r.segmento, 2);
  eq(r.nomeSegmento, 'Saneamento');
  eq(r.categoriaSugerida, 'utilidades');
});

t('valor efetivo (ident 8) é lido em reais', () => {
  const r = parseBoleto(ldAgua, HOJE) as BoletoOk;
  eq(r.valor, 87.9);
  eq(r.pendencias.valor, false);
});

t('VENCIMENTO É SEMPRE NULL — exige OCR ou digitação', () => {
  const r = parseBoleto(ldAgua, HOJE) as BoletoOk;
  eq(r.vencimento, null);
  eq(r.pendencias.vencimento, true);
  if (!r.avisos.some((a) => a.includes('vencimento'))) throw new Error('aviso ausente');
});

t('ident 6/7 usam módulo 10; 8/9 usam módulo 11', () => {
  for (const ident of [6, 7, 8, 9]) {
    const ld = montarArrecadacao(3, ident, '00000012345', '99887766554433221100998877665');
    const r = parseBoleto(ld, HOJE);
    if (!r.ok) throw new Error(`ident ${ident} falhou: ${r.erro}`);
  }
});

t('ident 7/9 (quantidade de moeda) não expõe valor em reais', () => {
  const ld = montarArrecadacao(1, 9, '00000012345', '99887766554433221100998877665');
  const r = parseBoleto(ld, HOJE) as BoletoOk;
  eq(r.valor, null);
  eq(r.pendencias.valor, true);
});

t('rejeita DV de bloco corrompido', () => {
  const i = 11; // DV do primeiro bloco
  const mau = ldAgua.slice(0, i) + ((Number(ldAgua[i]) + 3) % 10) + ldAgua.slice(i + 1);
  eq(parseBoleto(mau, HOJE).ok, false);
});

t('fuzz: 500 boletos de arrecadação', () => {
  for (let i = 0; i < 500; i++) {
    const seg = [1, 2, 3, 4, 5, 6, 7][Math.floor(Math.random() * 7)];
    const ident = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
    const valor = String(Math.floor(Math.random() * 99999999)).padStart(11, '0');
    const resto = Array.from({ length: 29 }, () => Math.floor(Math.random() * 10)).join('');
    const ld = montarArrecadacao(seg, ident, valor, resto);
    const r = parseBoleto(ld, HOJE);
    if (!r.ok) throw new Error(`falhou no ${i} (seg ${seg}, ident ${ident}): ${r.erro}`);
    if (r.vencimento !== null) throw new Error('arrecadação não pode ter vencimento');
  }
});

// ─────────────────────────────────────────────────────────────────────────────

grupo('Roteamento e extração de texto');

t('rejeita tamanhos inválidos', () => {
  eq(parseBoleto('123', HOJE).ok, false);
  eq(parseBoleto('', HOJE).ok, false);
  eq(parseBoleto('1'.repeat(46), HOJE).ok, false);
});

t('extrai boleto de dentro de texto livre (e-mail / OCR)', () => {
  const texto = `Prezado cliente, segue o boleto referente a agosto.
    Linha digitável: ${formatarLinhaDigitavel(ldBanco)}
    Em caso de dúvidas ligue 0800 123 4567.`;
  const achados = extrairDeTexto(texto, HOJE);
  if (achados.length === 0) throw new Error('nada extraído');
  if (!achados.some((a) => a.linhaDigitavel === ldBanco)) {
    throw new Error('boleto correto não encontrado');
  }
});

t('não inventa boleto em texto sem boleto', () => {
  eq(extrairDeTexto('Ligue 0800 123 4567 ou 41 99999-8888 hoje mesmo.', HOJE).length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`${passou} passaram, ${falhou} falharam`);
if (falhou > 0) process.exit(1);
