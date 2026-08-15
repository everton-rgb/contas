/**
 * tema.ts — tokens do design system.
 *
 * Tinta sobre papel de segurança: a paleta é monocromática e o croma fica
 * reservado para estado de tempo (vencido / hoje / em dia) e para as cores de
 * categoria, que vêm semeadas do banco por seed_categorias().
 */

import { Platform, useColorScheme } from 'react-native';

export interface Paleta {
  papel: string;
  carta: string;
  app: string;
  tinta: string;
  tinta2: string;
  tinta3: string;
  linha: string;
  linhaSuave: string;
  carimbo: string;
  carimboTinta: string;
  vencido: string;
  hoje: string;
  ok: string;
  vencidoFundo: string;
  hojeFundo: string;
  okFundo: string;
}

const CLARO: Paleta = {
  papel: '#E5E9E6',
  carta: '#FBFCFB',
  app: '#EFF2F0',
  tinta: '#131819',
  tinta2: '#596164',
  tinta3: '#7C8487',
  linha: '#C7CEC9',
  linhaSuave: '#DCE2DD',
  carimbo: '#17414F',
  carimboTinta: '#FBFCFB',
  vencido: '#9E2B20',
  hoje: '#8A5D00',
  ok: '#2E6B41',
  vencidoFundo: '#F6E4E1',
  hojeFundo: '#F6EDDA',
  okFundo: '#E2EFE5',
};

const ESCURO: Paleta = {
  papel: '#0E1214',
  carta: '#171C1E',
  app: '#12171A',
  tinta: '#E6EBE9',
  tinta2: '#98A2A3',
  tinta3: '#798385',
  linha: '#2B3336',
  linhaSuave: '#222A2D',
  carimbo: '#83C6D6',
  carimboTinta: '#0E1214',
  vencido: '#E9917F',
  hoje: '#DDB45F',
  ok: '#83C795',
  vencidoFundo: '#33201D',
  hojeFundo: '#302819',
  okFundo: '#1B2C21',
};

export function usarPaleta(): Paleta {
  return useColorScheme() === 'dark' ? ESCURO : CLARO;
}

/** Espaçamento em passos de 4. */
export const ESP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const RAIO = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const TIPO = {
  titulo: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.5 },
  secao: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  corpo: { fontSize: 15, fontWeight: '400' as const },
  forte: { fontSize: 15, fontWeight: '600' as const },
  pequeno: { fontSize: 13, fontWeight: '400' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.1 },
};

/**
 * Dígitos de boleto sempre em monoespaçada — é o conteúdo, não decoração.
 * 'Menlo' só existe no iOS: no Android e na web ela cai numa serifada e os
 * valores param de alinhar.
 */
export const MONO = {
  fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  fontVariant: ['tabular-nums' as const],
};
