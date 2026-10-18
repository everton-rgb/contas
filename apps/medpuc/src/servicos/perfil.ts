import { supabase } from '../lib/supabase';
import type { Perfil, Plano } from '../tipos/dominio';
import { resolver } from './base';

export type DadosPerfil = Pick<Perfil, 'nome' | 'instituicao' | 'curso' | 'periodo'>;

export async function obterPerfil(userId: string): Promise<Perfil> {
  return resolver(supabase().from('perfis').select('*').eq('id', userId).single());
}

export async function atualizarPerfil(userId: string, dados: DadosPerfil): Promise<Perfil> {
  return resolver(
    supabase()
      .from('perfis')
      .update({ ...dados, nome: dados.nome.trim() })
      .eq('id', userId)
      .select('*')
      .single(),
  );
}

/** Plano vigente, calculado no banco a partir da assinatura. */
export async function obterMeuPlano(): Promise<Plano | null> {
  const planos = await resolver(supabase().rpc('meu_plano'));
  return planos?.[0] ?? null;
}

export async function verificarAdmin(): Promise<boolean> {
  return Boolean(await resolver(supabase().rpc('eh_admin')));
}

/** Apaga o usuário e, em cascata, todos os dados dele. A sessão local fica para quem chamou encerrar. */
export async function excluirMinhaConta(): Promise<void> {
  await resolver(supabase().rpc('excluir_minha_conta'));
}

export async function listarPlanosDisponiveis(): Promise<Plano[]> {
  return resolver(supabase().from('planos').select('*').eq('disponivel', true).order('ordem'));
}

/** Uso atual por recurso, para comparar com os limites do plano. */
export async function contarUso(): Promise<Record<string, number>> {
  const tabelas = ['disciplinas', 'eventos', 'conteudos', 'tarefas', 'anotacoes'] as const;
  const contagens = await Promise.all(
    tabelas.map(async (tabela) => {
      const { count, error } = await supabase().from(tabela).select('id', { count: 'exact', head: true });
      if (error) throw error;
      return [tabela, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(contagens);
}
