/**
 * formato.ts — datas e dinheiro.
 *
 * ⚠️ Regra que atravessa o app: vencimento é `YYYY-MM-DD`, sem fuso.
 * Nunca construir com `new Date(iso)` — em UTC-3 isso volta um dia. Sempre
 * pelos componentes ano/mês/dia, como em `deISO` abaixo.
 */

export type Urgencia = 'vencido' | 'hoje' | 'ok' | 'rascunho';

export function deISO(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1);
}

export function paraISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function hojeLocal(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export function diasAte(iso: string): number {
  return Math.round((deISO(iso).getTime() - hojeLocal().getTime()) / 86_400_000);
}

export function urgenciaDe(vencimento: string | null, status: string): Urgencia {
  if (status === 'rascunho' || !vencimento) return 'rascunho';
  const d = diasAte(vencimento);
  if (d < 0) return 'vencido';
  if (d <= 1) return 'hoje';
  return 'ok';
}

export function rotuloPrazo(vencimento: string | null, status: string): string {
  if (status === 'paga') return 'Paga';
  if (status === 'rascunho' || !vencimento) return 'Rascunho';
  const d = diasAte(vencimento);
  if (d < 0) return `Venceu há ${-d} ${-d === 1 ? 'dia' : 'dias'}`;
  if (d === 0) return 'Vence hoje';
  if (d === 1) return 'Vence amanhã';
  return `Em ${d} dias`;
}

export function brl(valor: number | null): string {
  if (valor === null) return 'valor a confirmar';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataCurta(iso: string | null): string {
  if (!iso) return 'sem data';
  return deISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Aceita "1.234,56" e "1234.56". Devolve null quando não dá para ler. */
export function valorDeTexto(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Próxima ocorrência do dia do mês informado — atalhos "dia 10" / "dia 20". */
export function proximoDiaDoMes(dia: number): string {
  const hoje = hojeLocal();
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (alvo < hoje) alvo.setMonth(alvo.getMonth() + 1);
  return paraISO(alvo);
}

export function ultimoDiaDoMes(): string {
  const hoje = hojeLocal();
  return paraISO(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
}
