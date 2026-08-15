/**
 * db-supabase.ts — implementação com backend.
 *
 * Um lugar só conhece nomes de coluna. As telas falam em objetos do domínio,
 * pelo dispatcher em db.ts.
 */

import type { BoletoOk } from '@vence/core';
import { supabase } from './supabase';
import { BoletoDuplicado, type Categoria, type Conta, type EdicaoConta, type NovaConta } from './tipos';

const COLUNAS =
  'id, categoria_id, descricao, beneficiario, tipo, linha_digitavel, codigo_barras, valor, valor_pago, vencimento, status, origem, confianca, pendencia_vencimento, pendencia_valor, avisos, observacoes, pago_em, created_at';

function normalizar(linha: Record<string, unknown>): Conta {
  return {
    ...(linha as unknown as Conta),
    valor: linha.valor === null ? null : Number(linha.valor),
    valor_pago: linha.valor_pago === null ? null : Number(linha.valor_pago),
    confianca: linha.confianca === null ? null : Number(linha.confianca),
    avisos: Array.isArray(linha.avisos) ? (linha.avisos as string[]) : [],
  };
}

// ── Leitura ─────────────────────────────────────────────────────────────────

export async function listarContas(): Promise<Conta[]> {
  const { data, error } = await supabase()
    .from('contas')
    .select(COLUNAS)
    .neq('status', 'cancelada')
    .order('vencimento', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map(normalizar);
}

export async function buscarConta(id: string): Promise<Conta | null> {
  const { data, error } = await supabase().from('contas').select(COLUNAS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizar(data) : null;
}

/** Uma linha digitável só existe uma vez por usuário (contas_linha_unica). */
export async function buscarPorLinha(linhaDigitavel: string): Promise<Conta | null> {
  const { data, error } = await supabase()
    .from('contas')
    .select(COLUNAS)
    .eq('linha_digitavel', linhaDigitavel)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizar(data) : null;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase()
    .from('categorias')
    .select('id, nome, slug, cor, orcamento_mensal')
    .order('nome');
  if (error) throw error;
  return (data ?? []) as Categoria[];
}

/** Marca como vencida tudo que passou da data. Chamar na abertura do app. */
export async function marcarVencidas(): Promise<void> {
  const { error } = await supabase().rpc('marcar_vencidas');
  if (error) throw error;
}

// ── Escrita ─────────────────────────────────────────────────────────────────

/**
 * Cria a conta a partir da saída do parser.
 *
 * Toda conta lida entra como `rascunho`, mesmo quando o código trouxe data e
 * valor (§5 da spec): quem promove para `agendada` é a tela de confirmação.
 */
export async function criarContaDeBoleto(boleto: BoletoOk, dados: NovaConta): Promise<Conta> {
  const { data, error } = await supabase()
    .from('contas')
    .insert({
      descricao: dados.descricao,
      beneficiario: dados.beneficiario ?? null,
      categoria_id: dados.categoriaId,
      tipo: boleto.tipo,
      linha_digitavel: boleto.linhaDigitavel,
      codigo_barras: boleto.codigoBarras,
      valor: dados.valor,
      vencimento: dados.vencimento,
      status: 'rascunho',
      origem: dados.origem,
      confianca: dados.confianca ?? null,
      pendencia_vencimento: boleto.pendencias.vencimento,
      pendencia_valor: boleto.pendencias.valor,
      avisos: boleto.avisos,
      payload_bruto: boleto,
    })
    .select(COLUNAS)
    .single();

  if (error) {
    if (error.code === '23505') throw new BoletoDuplicado();
    throw error;
  }
  return normalizar(data);
}

/** Confirma um rascunho. Só promove para `agendada` com data e valor. */
export async function confirmarConta(id: string, edicao: EdicaoConta): Promise<Conta> {
  const atual = await buscarConta(id);
  if (!atual) throw new Error('Conta não encontrada.');

  const valor = edicao.valor !== undefined ? edicao.valor : atual.valor;
  const vencimento = edicao.vencimento !== undefined ? edicao.vencimento : atual.vencimento;
  const completo = valor !== null && vencimento !== null;

  const { data, error } = await supabase()
    .from('contas')
    .update({
      ...(edicao.descricao !== undefined ? { descricao: edicao.descricao } : {}),
      ...(edicao.categoriaId !== undefined ? { categoria_id: edicao.categoriaId } : {}),
      ...(edicao.observacoes !== undefined ? { observacoes: edicao.observacoes } : {}),
      valor,
      vencimento,
      pendencia_valor: valor === null,
      pendencia_vencimento: vencimento === null,
      status: completo ? (atual.status === 'rascunho' ? 'agendada' : atual.status) : 'rascunho',
    })
    .eq('id', id)
    .select(COLUNAS)
    .single();

  if (error) throw error;
  return normalizar(data);
}

export async function marcarPaga(id: string, valorPago: number | null): Promise<Conta> {
  const { data, error } = await supabase()
    .from('contas')
    .update({ status: 'paga', pago_em: new Date().toISOString(), valor_pago: valorPago })
    .eq('id', id)
    .select(COLUNAS)
    .single();
  if (error) throw error;
  return normalizar(data);
}

export async function excluirConta(id: string): Promise<void> {
  const { error } = await supabase().from('contas').delete().eq('id', id);
  if (error) throw error;
}
