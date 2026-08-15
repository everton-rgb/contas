/**
 * db-local.ts — implementação sem backend, para MODO_LOCAL.
 *
 * Guarda tudo num JSON no diretório de documentos do app. Não é sincronização
 * nem multi-device: é o suficiente para exercitar o ciclo colar → confirmar →
 * alerta num aparelho de verdade antes de existir Supabase.
 *
 * As duas regras que o banco carrega em constraint estão reproduzidas aqui,
 * porque são regra de negócio e não detalhe de armazenamento:
 *   contas_linha_unica  → uma linha digitável não entra duas vezes
 *   contas_agendavel    → sem data e valor a conta não sai de rascunho
 */

import type { BoletoOk } from '@vence/core';
import { Directory, File, Paths } from 'expo-file-system';
import {
  BoletoDuplicado,
  CATEGORIAS_PADRAO,
  type Categoria,
  type Conta,
  type EdicaoConta,
  type NovaConta,
} from './tipos';

const PASTA = 'vence';
const ARQUIVO = 'contas.json';

interface Deposito {
  versao: 1;
  contas: Conta[];
}

let cache: Deposito | null = null;

function arquivo(): File {
  const pasta = new Directory(Paths.document, PASTA);
  if (!pasta.exists) pasta.create({ intermediates: true });
  return new File(pasta, ARQUIVO);
}

async function ler(): Promise<Deposito> {
  if (cache) return cache;
  try {
    const f = arquivo();
    if (f.exists) {
      const bruto = JSON.parse(await f.text()) as Deposito;
      if (Array.isArray(bruto.contas)) {
        cache = { versao: 1, contas: bruto.contas };
        return cache;
      }
    }
  } catch {
    // Arquivo corrompido ou ilegível: recomeça vazio em vez de travar o app.
  }
  cache = { versao: 1, contas: [] };
  return cache;
}

async function gravar(deposito: Deposito): Promise<void> {
  cache = deposito;
  const f = arquivo();
  if (!f.exists) f.create();
  await f.write(JSON.stringify(deposito));
}

function novoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Leitura ─────────────────────────────────────────────────────────────────

export async function listarContas(): Promise<Conta[]> {
  return (await ler())
    .contas.filter((c) => c.status !== 'cancelada')
    .sort((a, b) => (a.vencimento ?? '9999').localeCompare(b.vencimento ?? '9999'));
}

export async function buscarConta(id: string): Promise<Conta | null> {
  return (await ler()).contas.find((c) => c.id === id) ?? null;
}

export async function buscarPorLinha(linhaDigitavel: string): Promise<Conta | null> {
  return (await ler()).contas.find((c) => c.linha_digitavel === linhaDigitavel) ?? null;
}

/** Sem banco não há seed_categorias(): as mesmas nove, com as mesmas cores. */
export async function listarCategorias(): Promise<Categoria[]> {
  return CATEGORIAS_PADRAO.map((c) => ({
    id: c.slug,
    nome: c.nome,
    slug: c.slug,
    cor: c.cor,
    orcamento_mensal: null,
  }));
}

export async function marcarVencidas(): Promise<void> {
  const deposito = await ler();
  const hoje = hojeISO();
  let mudou = false;
  for (const c of deposito.contas) {
    if (c.status === 'agendada' && c.vencimento !== null && c.vencimento < hoje) {
      c.status = 'vencida';
      mudou = true;
    }
  }
  if (mudou) await gravar(deposito);
}

// ── Escrita ─────────────────────────────────────────────────────────────────

export async function criarContaDeBoleto(boleto: BoletoOk, dados: NovaConta): Promise<Conta> {
  const deposito = await ler();

  if (deposito.contas.some((c) => c.linha_digitavel === boleto.linhaDigitavel)) {
    throw new BoletoDuplicado();
  }

  const conta: Conta = {
    id: novoId(),
    categoria_id: dados.categoriaId,
    descricao: dados.descricao,
    beneficiario: dados.beneficiario ?? null,
    tipo: boleto.tipo,
    linha_digitavel: boleto.linhaDigitavel,
    codigo_barras: boleto.codigoBarras,
    valor: dados.valor,
    valor_pago: null,
    vencimento: dados.vencimento,
    status: 'rascunho',
    origem: dados.origem,
    confianca: dados.confianca ?? null,
    pendencia_vencimento: boleto.pendencias.vencimento,
    pendencia_valor: boleto.pendencias.valor,
    avisos: boleto.avisos,
    observacoes: null,
    pago_em: null,
    created_at: new Date().toISOString(),
  };

  deposito.contas.push(conta);
  await gravar(deposito);
  return conta;
}

export async function confirmarConta(id: string, edicao: EdicaoConta): Promise<Conta> {
  const deposito = await ler();
  const conta = deposito.contas.find((c) => c.id === id);
  if (!conta) throw new Error('Conta não encontrada.');

  const valor = edicao.valor !== undefined ? edicao.valor : conta.valor;
  const vencimento = edicao.vencimento !== undefined ? edicao.vencimento : conta.vencimento;
  const completo = valor !== null && vencimento !== null;

  if (edicao.descricao !== undefined) conta.descricao = edicao.descricao;
  if (edicao.categoriaId !== undefined) conta.categoria_id = edicao.categoriaId;
  if (edicao.observacoes !== undefined) conta.observacoes = edicao.observacoes;

  conta.valor = valor;
  conta.vencimento = vencimento;
  conta.pendencia_valor = valor === null;
  conta.pendencia_vencimento = vencimento === null;
  conta.status = completo ? (conta.status === 'rascunho' ? 'agendada' : conta.status) : 'rascunho';

  await gravar(deposito);
  return conta;
}

export async function marcarPaga(id: string, valorPago: number | null): Promise<Conta> {
  const deposito = await ler();
  const conta = deposito.contas.find((c) => c.id === id);
  if (!conta) throw new Error('Conta não encontrada.');

  conta.status = 'paga';
  conta.pago_em = new Date().toISOString();
  conta.valor_pago = valorPago;

  await gravar(deposito);
  return conta;
}

export async function excluirConta(id: string): Promise<void> {
  const deposito = await ler();
  deposito.contas = deposito.contas.filter((c) => c.id !== id);
  await gravar(deposito);
}

/** Só para a tela de ajustes do modo local: joga tudo fora. */
export async function apagarTudo(): Promise<void> {
  await gravar({ versao: 1, contas: [] });
}
