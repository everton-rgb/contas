/**
 * Isolamento entre alunos verificado pela API REST do Supabase, com dois
 * usuários reais autenticados. O frontend não participa: estas chamadas são
 * as que alguém faria editando requisições no navegador.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { traduzirErro } from '../../src/lib/erros';
import type { Database } from '../../src/tipos/banco';
import { ambienteSupabaseLocal } from '../ambiente';

type Cliente = SupabaseClient<Database>;

const ambiente = ambienteSupabaseLocal();
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(ambiente.url, ambiente.secreta, opcoes);
const sufixo = Date.now();
const senha = 'senhaTeste123';

async function criarAluno(nome: string): Promise<{ cliente: Cliente; id: string }> {
  const email = `${nome.toLowerCase()}.${sufixo}@teste.dev`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error) throw error;
  const cliente = createClient<Database>(ambiente.url, ambiente.publica, opcoes);
  const login = await cliente.auth.signInWithPassword({ email, password: senha });
  if (login.error) throw login.error;
  return { cliente, id: data.user.id };
}

let ana: { cliente: Cliente; id: string };
let bruno: { cliente: Cliente; id: string };
const ids = { disciplina: '', evento: '', conteudo: '', tarefa: '', anotacao: '' };

beforeAll(async () => {
  ana = await criarAluno('Ana');
  bruno = await criarAluno('Bruno');

  const d = await ana.cliente.from('disciplinas').insert({ nome: 'Neuroanatomia', cor: '#8C1D40' }).select().single();
  expect(d.error).toBeNull();
  ids.disciplina = d.data!.id;
  const e = await ana.cliente.from('eventos').insert({ titulo: 'Prova 1', tipo: 'prova', data: '2027-03-10', disciplina_id: ids.disciplina }).select().single();
  ids.evento = e.data!.id;
  const c = await ana.cliente.from('conteudos').insert({ titulo: 'Tronco encefálico', disciplina_id: ids.disciplina }).select().single();
  ids.conteudo = c.data!.id;
  const t = await ana.cliente.from('tarefas').insert({ titulo: 'Resumo', disciplina_id: ids.disciplina }).select().single();
  ids.tarefa = t.data!.id;
  const a = await ana.cliente.from('anotacoes').insert({ titulo: 'Nervos cranianos', texto: 'Núcleos do trigêmeo' }).select().single();
  ids.anotacao = a.data!.id;
  expect(Object.values(ids).every(Boolean)).toBe(true);
});

afterAll(async () => {
  await admin.auth.admin.deleteUser(ana.id);
  await admin.auth.admin.deleteUser(bruno.id);
});

const TABELAS = [
  ['disciplinas', 'disciplina'],
  ['eventos', 'evento'],
  ['conteudos', 'conteudo'],
  ['tarefas', 'tarefa'],
  ['anotacoes', 'anotacao'],
] as const;

describe('isolamento de dados entre alunos (API + RLS)', () => {
  it.each(TABELAS)('Bruno não lê %s da Ana, nem pelo id', async (tabela, chave) => {
    const todos = await bruno.cliente.from(tabela).select('id');
    expect(todos.error).toBeNull();
    expect(todos.data).toEqual([]);
    const porId = await bruno.cliente.from(tabela).select('*').eq('id', ids[chave]);
    expect(porId.data).toEqual([]);
  });

  it.each(TABELAS)('Bruno não altera %s da Ana', async (tabela, chave) => {
    const campo = tabela === 'disciplinas' ? 'nome' : 'titulo';
    const r = await bruno.cliente.from(tabela).update({ [campo]: 'invadido' } as never).eq('id', ids[chave]).select();
    expect(r.error).toBeNull();
    expect(r.data).toEqual([]);
    const daAna = await ana.cliente.from(tabela).select('*').eq('id', ids[chave]).single();
    expect(JSON.stringify(daAna.data)).not.toContain('invadido');
  });

  it.each(TABELAS)('Bruno não exclui %s da Ana', async (tabela, chave) => {
    const r = await bruno.cliente.from(tabela).delete().eq('id', ids[chave]).select();
    expect(r.error).toBeNull();
    expect(r.data).toEqual([]);
    const daAna = await ana.cliente.from(tabela).select('id').eq('id', ids[chave]);
    expect(daAna.data).toHaveLength(1);
  });

  it('Bruno não grava registros em nome da Ana', async () => {
    const r = await bruno.cliente.from('anotacoes').insert({ user_id: ana.id, titulo: 'plantada' });
    expect(r.error?.code).toBe('42501');
    expect(traduzirErro(r.error)).toBe('Você não tem permissão para realizar esta ação.');
  });

  it('Bruno não vincula seus registros a uma disciplina da Ana', async () => {
    const r = await bruno.cliente.from('eventos').insert({ titulo: 'x', data: '2027-01-01', disciplina_id: ids.disciplina });
    expect(r.error?.code).toBe('23503');
  });

  it('a pesquisa de anotações respeita o dono', async () => {
    const deBruno = await bruno.cliente.rpc('buscar_anotacoes', { p_termo: 'trigemeo' });
    expect(deBruno.data).toEqual([]);
    const daAna = await ana.cliente.rpc('buscar_anotacoes', { p_termo: 'TRIGEMEO' });
    expect(daAna.data?.map((a) => a.id)).toEqual([ids.anotacao]);
  });

  it('Bruno lê só o próprio perfil e não edita o da Ana', async () => {
    const perfis = await bruno.cliente.from('perfis').select('id, nome');
    expect(perfis.data).toEqual([{ id: bruno.id, nome: 'Bruno' }]);
    const r = await bruno.cliente.from('perfis').update({ nome: 'invadido' }).eq('id', ana.id).select();
    expect(r.data).toEqual([]);
  });
});

describe('plano e papel não podem ser forjados pelo navegador', () => {
  it('aluno não cria assinatura nem se torna administrador', async () => {
    const assinatura = await bruno.cliente.from('assinaturas').insert({ user_id: bruno.id, plano_id: 'premium' });
    expect(assinatura.error?.code).toBe('42501');
    const papel = await bruno.cliente.from('administradores').insert({ user_id: bruno.id });
    expect(papel.error?.code).toBe('42501');
    const limites = await bruno.cliente.from('planos').update({ limites: {} }).eq('id', 'gratuito');
    expect(limites.error?.code).toBe('42501');
    expect((await bruno.cliente.rpc('meu_plano')).data?.[0]?.id).toBe('gratuito');
    expect((await bruno.cliente.rpc('eh_admin')).data).toBe(false);
  });

  it('limite do plano é aplicado no banco e traduzido no app', async () => {
    await admin.from('planos').update({ limites: { disciplinas: 1 } }).eq('id', 'gratuito');
    try {
      const r = await ana.cliente.from('disciplinas').insert({ nome: 'Sentidos', cor: '#A3367D' });
      expect(r.error?.code).toBe('MP001');
      expect(traduzirErro(r.error)).toBe('Seu plano atual permite até 1 disciplinas. Remova algum item ou conheça os planos.');

      // Assinatura gravada pelo backend (service role) libera o recurso.
      await admin.from('assinaturas').insert({ user_id: ana.id, plano_id: 'premium' });
      expect((await ana.cliente.rpc('meu_plano')).data?.[0]?.id).toBe('premium');
      const liberado = await ana.cliente.from('disciplinas').insert({ nome: 'Sentidos', cor: '#A3367D' });
      expect(liberado.error).toBeNull();
    } finally {
      await admin.from('planos').update({ limites: { disciplinas: 20 } }).eq('id', 'gratuito');
      await admin.from('assinaturas').delete().eq('user_id', ana.id);
    }
  });
});

describe('visitante sem login', () => {
  const anonimo = createClient<Database>(ambiente.url, ambiente.publica, opcoes);

  it('não acessa dados privados', async () => {
    for (const [tabela] of TABELAS) {
      const r = await anonimo.from(tabela).select('id');
      expect(r.data ?? []).toEqual([]);
      expect(r.error?.code).toBe('42501');
    }
  });

  it('lê apenas o catálogo público de planos', async () => {
    const r = await anonimo.from('planos').select('id').eq('disponivel', true);
    expect(r.data).toEqual([{ id: 'gratuito' }]);
  });
});

describe('modelo do período', () => {
  it('importa as disciplinas para a conta sem duplicar e sem alterar o modelo', async () => {
    const { data: modelos } = await bruno.cliente.from('modelos_disciplinas').select('id, nome');
    expect(modelos).toHaveLength(8);
    const ids = modelos!.map((m) => m.id);
    const primeira = await bruno.cliente.rpc('importar_modelo', { p_modelo_disciplinas: ids, p_importar_datas: true });
    expect(primeira.error).toBeNull();
    expect(primeira.data).toHaveLength(8);
    await bruno.cliente.rpc('importar_modelo', { p_modelo_disciplinas: ids, p_importar_datas: true });
    const { data: minhas } = await bruno.cliente.from('disciplinas').select('id');
    expect(minhas).toHaveLength(8);

    const editar = await bruno.cliente.from('modelos_disciplinas').update({ nome: 'invadido' }).eq('id', ids[0]).select();
    expect(editar.data).toEqual([]);
    const criar = await bruno.cliente.from('modelos_periodo').insert({ instituicao: 'X', curso: 'Y', periodo: 1, titulo: 'Z' });
    expect(criar.error?.code).toBe('42501');
  });
});
