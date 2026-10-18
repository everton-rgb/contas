/**
 * cores.ts — paleta das disciplinas e utilitários de cor.
 *
 * A cor da disciplina aparece como ponto, borda e fundo translúcido. O texto
 * fica sempre em tom escuro neutro, o que mantém o contraste com qualquer cor.
 */

export const PALETA_DISCIPLINAS = [
  '#8C1D40', '#B4234F', '#6B4E9B', '#2F5D8A', '#0E7490', '#0F766E',
  '#5B7B2A', '#B45309', '#C2410C', '#A3367D', '#475569', '#78716C',
];

export function corValida(cor: string | null | undefined): cor is string {
  return !!cor && /^#[0-9a-fA-F]{6}$/.test(cor);
}

/** '#8C1D40' + 0.1 → 'rgb(140 29 64 / 0.1)' */
export function comTransparencia(cor: string, alfa: number): string {
  if (!corValida(cor)) return `rgb(120 113 108 / ${alfa})`;
  const r = parseInt(cor.slice(1, 3), 16);
  const g = parseInt(cor.slice(3, 5), 16);
  const b = parseInt(cor.slice(5, 7), 16);
  return `rgb(${r} ${g} ${b} / ${alfa})`;
}

/** Próxima cor da paleta ainda não usada (ou a menos usada). */
export function sugerirCor(emUso: string[]): string {
  const contagem = new Map(PALETA_DISCIPLINAS.map((c) => [c.toLowerCase(), 0]));
  for (const cor of emUso) {
    const chave = cor.toLowerCase();
    if (contagem.has(chave)) contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  let melhor = PALETA_DISCIPLINAS[0];
  let menor = Infinity;
  for (const cor of PALETA_DISCIPLINAS) {
    const n = contagem.get(cor.toLowerCase()) ?? 0;
    if (n < menor) {
      menor = n;
      melhor = cor;
    }
  }
  return melhor;
}
