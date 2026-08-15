/**
 * tipos.ts — o contrato da camada de dados.
 *
 * Espelha 0001_init.sql à mão de propósito: gerar tipos do Supabase exigiria o
 * projeto no ar, e o schema é pequeno e estável. As duas implementações
 * (Supabase e local) obedecem exatamente a estas formas.
 */

export type ContaStatus = 'rascunho' | 'agendada' | 'paga' | 'vencida' | 'cancelada';
export type OrigemLeitura = 'camera' | 'clipboard' | 'pdf_texto' | 'pdf_ocr' | 'manual' | 'recorrencia';
export type TipoBoletoDB = 'bancario' | 'arrecadacao' | 'sem_boleto';

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  cor: string;
  orcamento_mensal: number | null;
}

export interface Conta {
  id: string;
  categoria_id: string | null;
  descricao: string;
  beneficiario: string | null;
  tipo: TipoBoletoDB;
  linha_digitavel: string | null;
  codigo_barras: string | null;
  valor: number | null;
  valor_pago: number | null;
  /** `YYYY-MM-DD`. Coluna `date`, nunca `timestamptz` — vencimento não tem fuso. */
  vencimento: string | null;
  status: ContaStatus;
  origem: OrigemLeitura;
  confianca: number | null;
  pendencia_vencimento: boolean;
  pendencia_valor: boolean;
  avisos: string[];
  observacoes: string | null;
  pago_em: string | null;
  created_at: string;
}

export interface NovaConta {
  descricao: string;
  categoriaId: string | null;
  valor: number | null;
  /** `YYYY-MM-DD` */
  vencimento: string | null;
  origem: OrigemLeitura;
  beneficiario?: string | null;
  confianca?: number | null;
}

export interface EdicaoConta {
  descricao?: string;
  categoriaId?: string | null;
  valor?: number | null;
  vencimento?: string | null;
  observacoes?: string | null;
}

/** Violação da unique (user_id, linha_digitavel) — nas duas implementações. */
export class BoletoDuplicado extends Error {
  constructor() {
    super('Você já tem essa conta cadastrada.');
    this.name = 'BoletoDuplicado';
  }
}

/** As mesmas cores que seed_categorias() grava no banco. */
export const CATEGORIAS_PADRAO: ReadonlyArray<{ nome: string; slug: string; cor: string }> = [
  { nome: 'Moradia', slug: 'moradia', cor: '#0F766E' },
  { nome: 'Utilidades', slug: 'utilidades', cor: '#0369A1' },
  { nome: 'Telecom', slug: 'telecom', cor: '#7C3AED' },
  { nome: 'Impostos', slug: 'impostos', cor: '#B91C1C' },
  { nome: 'Veículo', slug: 'veiculo', cor: '#C2410C' },
  { nome: 'Saúde', slug: 'saude', cor: '#059669' },
  { nome: 'Educação', slug: 'educacao', cor: '#2563EB' },
  { nome: 'Cartão', slug: 'cartao', cor: '#4B5563' },
  { nome: 'Outros', slug: 'outros', cor: '#6B7280' },
];
