/**
 * boleto.ts — Motor determinístico de parsing de boletos (FEBRABAN)
 *
 * Zero dependências. Roda em Node, React Native (Hermes) e Deno (Supabase Edge).
 *
 * Cobre os dois universos:
 *   1. Boleto BANCÁRIO      — linha digitável 47 dígitos, código de barras 44.
 *   2. Boleto de ARRECADAÇÃO — linha digitável 48 dígitos, código de barras 44,
 *      inicia com "8" (concessionárias, tributos, IPTU, multas).
 *
 * ⚠️ Ponto crítico — VIRADA DO FATOR DE VENCIMENTO
 * O fator é um contador de dias desde uma data base. Atingiu 9999 em 21/02/2025
 * e reiniciou em 1000 no dia 22/02/2025, com nova data base. Bibliotecas
 * escritas antes de 2025 calculam TODA data pós-virada com ~24,6 anos de erro.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type TipoBoleto = 'bancario' | 'arrecadacao';

export type ErroCodigo =
  | 'VAZIO'
  | 'TAMANHO_INVALIDO'
  | 'CARACTERE_INVALIDO'
  | 'DV_CAMPO_INVALIDO'
  | 'DV_GERAL_INVALIDO'
  | 'DV_BLOCO_INVALIDO'
  | 'FATOR_IMPLAUSIVEL';

/** O que ainda precisa de confirmação humana antes de virar um alerta. */
export interface Pendencias {
  /** true = a data NÃO veio do código; precisa de OCR ou digitação. */
  vencimento: boolean;
  /** true = o valor NÃO é monetário confiável (valor referência ou zerado). */
  valor: boolean;
}

export interface BoletoOk {
  ok: true;
  tipo: TipoBoleto;
  linhaDigitavel: string;
  codigoBarras: string;
  /** Em reais. null quando o boleto não carrega valor monetário. */
  valor: number | null;
  /** ISO `YYYY-MM-DD`. null quando o código não carrega vencimento. */
  vencimento: string | null;
  /** Só boleto bancário. Código COMPE de 3 dígitos. */
  codigoBanco: string | null;
  nomeBanco: string | null;
  /** Só arrecadação. 1..9 */
  segmento: number | null;
  nomeSegmento: string | null;
  /** Categoria sugerida para pré-preencher o formulário. */
  categoriaSugerida: string | null;
  pendencias: Pendencias;
  avisos: string[];
}

export interface BoletoErro {
  ok: false;
  codigo: ErroCodigo;
  erro: string;
}

export type ResultadoBoleto = BoletoOk | BoletoErro;

// ─────────────────────────────────────────────────────────────────────────────
// Datas base do fator de vencimento
// ─────────────────────────────────────────────────────────────────────────────

/** Base original FEBRABAN: fator 1000 = 03/07/2000. Válida até fator 9999 = 21/02/2025. */
export const BASE_FATOR_ANTIGA = Date.UTC(1997, 9, 7); // 07/10/1997
/** Base pós-virada: fator 1000 = 22/02/2025. */
export const BASE_FATOR_NOVA = Date.UTC(2022, 4, 29); // 29/05/2022

const DIA_MS = 86_400_000;

/** Janela de plausibilidade para desambiguar as duas bases. */
const ANOS_PASSADO = 5;
const ANOS_FUTURO = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Dígitos verificadores
// ─────────────────────────────────────────────────────────────────────────────

/** Módulo 10 — pesos 2,1,2,1… da direita para a esquerda, somando dígitos de produtos > 9. */
export function mod10(bloco: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    let produto = Number(bloco[i]) * peso;
    if (produto > 9) produto = Math.floor(produto / 10) + (produto % 10);
    soma += produto;
    peso = peso === 2 ? 1 : 2;
  }
  return (10 - (soma % 10)) % 10;
}

/**
 * Módulo 11 do código de barras BANCÁRIO (posição 5 dos 44 dígitos).
 * Pesos 2..9 cíclicos da direita para a esquerda sobre os 43 dígitos restantes.
 * Resto 0, 1 ou 10 ⇒ DV = 1.
 */
export function mod11Barras(bloco43: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = bloco43.length - 1; i >= 0; i--) {
    soma += Number(bloco43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

/**
 * Módulo 11 dos blocos de ARRECADAÇÃO.
 * Pesos 2..9 cíclicos; DV 10 ou 11 ⇒ 0.
 *
 * ⚠️ Existem duas convenções em circulação para resto = 1 (DV 0 vs DV 1).
 * Adotamos DV = 0 (manual FEBRABAN de arrecadação) e mantemos o modo tolerante
 * em `validarArrecadacao` para não rejeitar boleto legítimo por causa disso.
 */
export function mod11Arrecadacao(bloco: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    soma += Number(bloco[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const dv = 11 - (soma % 11);
  return dv === 10 || dv === 11 ? 0 : dv;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fator de vencimento
// ─────────────────────────────────────────────────────────────────────────────

function isoDe(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Converte o fator de vencimento (4 dígitos) em data ISO.
 * Testa as duas bases e escolhe a única candidata plausível.
 * As bases distam ~9.000 dias (≈24,6 anos), então nunca há empate real
 * dentro de uma janela de 20 anos.
 *
 * @param hoje injetável para testes determinísticos.
 */
export function fatorParaData(fator: number, hoje: Date = new Date()): string | null {
  if (fator === 0) return null; // "contra apresentação" / sem vencimento

  const agora = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const limiteInferior = agora - ANOS_PASSADO * 365.25 * DIA_MS;
  const limiteSuperior = agora + ANOS_FUTURO * 365.25 * DIA_MS;

  const candidatos = [
    BASE_FATOR_NOVA + fator * DIA_MS,
    BASE_FATOR_ANTIGA + fator * DIA_MS,
  ];

  const plausiveis = candidatos.filter((c) => c >= limiteInferior && c <= limiteSuperior);

  if (plausiveis.length === 1) return isoDe(plausiveis[0]);

  if (plausiveis.length > 1) {
    // Empate teórico: escolhe a mais próxima de hoje.
    plausiveis.sort((a, b) => Math.abs(a - agora) - Math.abs(b - agora));
    return isoDe(plausiveis[0]);
  }

  // Nenhuma plausível (boleto muito antigo). Devolve a mais recente possível.
  return isoDe(Math.max(...candidatos));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabelas auxiliares
// ─────────────────────────────────────────────────────────────────────────────

const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '070': 'BRB',
  '077': 'Inter',
  '104': 'Caixa Econômica Federal',
  '212': 'Banco Original',
  '237': 'Bradesco',
  '260': 'Nubank',
  '336': 'C6 Bank',
  '341': 'Itaú',
  '380': 'PicPay',
  '422': 'Safra',
  '655': 'Votorantim',
  '745': 'Citibank',
  '748': 'Sicredi',
  '756': 'Sicoob',
};

const SEGMENTOS: Record<number, { nome: string; categoria: string }> = {
  1: { nome: 'Prefeituras', categoria: 'impostos' },
  2: { nome: 'Saneamento', categoria: 'utilidades' },
  3: { nome: 'Energia elétrica e gás', categoria: 'utilidades' },
  4: { nome: 'Telecomunicações', categoria: 'telecom' },
  5: { nome: 'Órgãos governamentais', categoria: 'impostos' },
  6: { nome: 'Carnês e assemelhados', categoria: 'outros' },
  7: { nome: 'Multas de trânsito', categoria: 'veiculo' },
  9: { nome: 'Uso exclusivo do banco', categoria: 'outros' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalização e roteamento
// ─────────────────────────────────────────────────────────────────────────────

/** Remove tudo que não for dígito. Aceita linha digitável formatada, com espaços, pontos etc. */
export function normalizar(entrada: string): string {
  return (entrada ?? '').replace(/\D/g, '');
}

/**
 * Ponto de entrada único. Aceita linha digitável (47/48) OU código de barras (44).
 */
export function parseBoleto(entrada: string, hoje: Date = new Date()): ResultadoBoleto {
  const bruto = (entrada ?? '').trim();
  if (!bruto) return { ok: false, codigo: 'VAZIO', erro: 'Entrada vazia.' };

  const d = normalizar(bruto);

  if (d.length === 47) return parseBancarioLinha(d, hoje);
  if (d.length === 48) return parseArrecadacaoLinha(d, hoje);

  if (d.length === 44) {
    return d[0] === '8'
      ? parseArrecadacaoLinha(barrasParaLinhaArrecadacao(d), hoje)
      : parseBancarioLinha(barrasParaLinhaBancario(d), hoje);
  }

  return {
    ok: false,
    codigo: 'TAMANHO_INVALIDO',
    erro: `Esperado 44, 47 ou 48 dígitos; recebido ${d.length}.`,
  };
}

/** Extrai a primeira sequência válida de um texto livre (e-mail, OCR, PDF). */
export function extrairDeTexto(texto: string, hoje: Date = new Date()): ResultadoBoleto[] {
  const candidatos = new Set<string>();
  // Sequências de dígitos possivelmente separadas por espaço, ponto ou hífen.
  const re = /(?:\d[\s.\-]?){43,60}\d/g;
  for (const m of texto.matchAll(re)) {
    const d = normalizar(m[0]);
    // Janela deslizante: o OCR frequentemente cola dígitos extras nas bordas.
    for (const tam of [48, 47, 44]) {
      for (let i = 0; i + tam <= d.length; i++) {
        const fatia = d.slice(i, i + tam);
        const r = parseBoleto(fatia, hoje);
        if (r.ok) candidatos.add(fatia);
      }
    }
  }
  return [...candidatos].map((c) => parseBoleto(c, hoje)).filter((r): r is BoletoOk => r.ok);
}

// ─────────────────────────────────────────────────────────────────────────────
// Boleto bancário
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Layout da linha digitável (47 dígitos, índices 0-based):
 *   [0..3]   banco(3) + moeda(1)
 *   [4..8]   campo livre parte 1 (5)
 *   [9]      DV campo 1 (mod 10)
 *   [10..19] campo livre parte 2 (10)
 *   [20]     DV campo 2 (mod 10)
 *   [21..30] campo livre parte 3 (10)
 *   [31]     DV campo 3 (mod 10)
 *   [32]     DV geral do código de barras (mod 11)
 *   [33..36] fator de vencimento
 *   [37..46] valor (centavos)
 */
export function linhaParaBarrasBancario(ld: string): string {
  return (
    ld.slice(0, 4) + // banco + moeda
    ld[32] + // DV geral
    ld.slice(33, 47) + // fator + valor
    ld.slice(4, 9) + // campo livre 1
    ld.slice(10, 20) + // campo livre 2
    ld.slice(21, 31) // campo livre 3
  );
}

export function barrasParaLinhaBancario(cb: string): string {
  const banco = cb.slice(0, 4);
  const dvGeral = cb[4];
  const fatorValor = cb.slice(5, 19);
  const livre = cb.slice(19, 44);

  const c1 = banco + livre.slice(0, 5);
  const c2 = livre.slice(5, 15);
  const c3 = livre.slice(15, 25);

  return c1 + mod10(c1) + c2 + mod10(c2) + c3 + mod10(c3) + dvGeral + fatorValor;
}

function parseBancarioLinha(ld: string, hoje: Date): ResultadoBoleto {
  if (!/^\d{47}$/.test(ld)) {
    return { ok: false, codigo: 'CARACTERE_INVALIDO', erro: 'Linha digitável inválida.' };
  }

  const campos: Array<[string, string]> = [
    [ld.slice(0, 9), ld[9]],
    [ld.slice(10, 20), ld[20]],
    [ld.slice(21, 31), ld[31]],
  ];

  for (let i = 0; i < campos.length; i++) {
    const [bloco, dv] = campos[i];
    if (mod10(bloco) !== Number(dv)) {
      return {
        ok: false,
        codigo: 'DV_CAMPO_INVALIDO',
        erro: `DV do campo ${i + 1} não confere (esperado ${mod10(bloco)}, lido ${dv}). Provável erro de leitura.`,
      };
    }
  }

  const cb = linhaParaBarrasBancario(ld);
  const dvGeralEsperado = mod11Barras(cb.slice(0, 4) + cb.slice(5));
  if (dvGeralEsperado !== Number(cb[4])) {
    return {
      ok: false,
      codigo: 'DV_GERAL_INVALIDO',
      erro: `DV geral não confere (esperado ${dvGeralEsperado}, lido ${cb[4]}).`,
    };
  }

  const fator = Number(cb.slice(5, 9));
  const centavos = Number(cb.slice(9, 19));

  const avisos: string[] = [];
  const vencimento = fatorParaData(fator, hoje);
  if (fator === 0) avisos.push('Boleto sem fator de vencimento (contra apresentação).');
  if (centavos === 0) avisos.push('Boleto sem valor definido no código.');

  const codigoBanco = cb.slice(0, 3);

  return {
    ok: true,
    tipo: 'bancario',
    linhaDigitavel: ld,
    codigoBarras: cb,
    valor: centavos === 0 ? null : centavos / 100,
    vencimento,
    codigoBanco,
    nomeBanco: BANCOS[codigoBanco] ?? null,
    segmento: null,
    nomeSegmento: null,
    categoriaSugerida: null,
    pendencias: { vencimento: vencimento === null, valor: centavos === 0 },
    avisos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Boleto de arrecadação (concessionárias e tributos)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Código de barras (44 dígitos):
 *   [0]      sempre "8"
 *   [1]      segmento
 *   [2]      identificador de valor  → define modo de valor e de DV
 *   [3]      DV geral
 *   [4..14]  valor (11 dígitos)
 *   [15..18] código da empresa/órgão
 *   [19..43] campo livre
 *
 * Linha digitável (48 dígitos) = 4 blocos de 12 (11 dígitos + DV do bloco).
 *
 * ⚠️ O vencimento NÃO está codificado. Sempre exige OCR ou digitação.
 */
function modoDV(identificadorValor: number): 'mod10' | 'mod11' {
  return identificadorValor === 6 || identificadorValor === 7 ? 'mod10' : 'mod11';
}

export function linhaParaBarrasArrecadacao(ld: string): string {
  return ld.slice(0, 11) + ld.slice(12, 23) + ld.slice(24, 35) + ld.slice(36, 47);
}

export function barrasParaLinhaArrecadacao(cb: string): string {
  const modo = modoDV(Number(cb[2]));
  const dv = modo === 'mod10' ? mod10 : mod11Arrecadacao;
  let ld = '';
  for (let i = 0; i < 4; i++) {
    const bloco = cb.slice(i * 11, i * 11 + 11);
    ld += bloco + dv(bloco);
  }
  return ld;
}

function parseArrecadacaoLinha(ld: string, hoje: Date): ResultadoBoleto {
  if (!/^\d{48}$/.test(ld)) {
    return { ok: false, codigo: 'CARACTERE_INVALIDO', erro: 'Linha digitável inválida.' };
  }

  const cb = linhaParaBarrasArrecadacao(ld);

  if (cb[0] !== '8') {
    return {
      ok: false,
      codigo: 'CARACTERE_INVALIDO',
      erro: 'Boleto de arrecadação deve iniciar com 8.',
    };
  }

  const identificador = Number(cb[2]);
  const modo = modoDV(identificador);
  const calcularDV = modo === 'mod10' ? mod10 : mod11Arrecadacao;

  for (let i = 0; i < 4; i++) {
    const bloco = ld.slice(i * 12, i * 12 + 11);
    const dvLido = Number(ld[i * 12 + 11]);
    const dvCalc = calcularDV(bloco);
    if (dvCalc !== dvLido) {
      // Modo tolerante: convenção divergente de resto=1 no mod 11.
      const tolerado = modo === 'mod11' && dvCalc === 0 && dvLido === 1;
      if (!tolerado) {
        return {
          ok: false,
          codigo: 'DV_BLOCO_INVALIDO',
          erro: `DV do bloco ${i + 1} não confere (esperado ${dvCalc}, lido ${dvLido}).`,
        };
      }
    }
  }

  const valorRaw = Number(cb.slice(4, 15));
  const valorEfetivo = identificador === 6 || identificador === 8;
  const segmento = Number(cb[1]);

  const avisos: string[] = [
    'Boleto de arrecadação não carrega data de vencimento no código — confirme a data impressa.',
  ];
  if (!valorEfetivo) {
    avisos.push('Campo de valor é "quantidade de moeda", não valor em reais. Confirme manualmente.');
  }
  if (valorRaw === 0) avisos.push('Valor zerado no código (boleto com valor em aberto).');

  const info = SEGMENTOS[segmento];

  return {
    ok: true,
    tipo: 'arrecadacao',
    linhaDigitavel: ld,
    codigoBarras: cb,
    valor: valorEfetivo && valorRaw > 0 ? valorRaw / 100 : null,
    vencimento: null, // nunca disponível neste formato
    codigoBanco: null,
    nomeBanco: null,
    segmento,
    nomeSegmento: info?.nome ?? null,
    categoriaSugerida: info?.categoria ?? null,
    pendencias: { vencimento: true, valor: !valorEfetivo || valorRaw === 0 },
    avisos,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatação para exibição
// ─────────────────────────────────────────────────────────────────────────────

export function formatarLinhaDigitavel(ld: string): string {
  const d = normalizar(ld);
  if (d.length === 47) {
    return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d[32]} ${d.slice(33)}`;
  }
  if (d.length === 48) {
    return `${d.slice(0, 12)} ${d.slice(12, 24)} ${d.slice(24, 36)} ${d.slice(36, 48)}`;
  }
  return d;
}
