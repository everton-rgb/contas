/**
 * dominio.ts — tipos e rótulos do domínio, derivados do esquema do banco.
 *
 * `banco.ts` é gerado (npm run db:types). Este arquivo é o único que o
 * resto do app importa para falar de disciplinas, eventos etc.
 */

import type { Database } from './banco';

type Tabelas = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type Perfil = Tabelas['perfis']['Row'];
export type Plano = Tabelas['planos']['Row'];
export type Disciplina = Tabelas['disciplinas']['Row'];
export type Evento = Tabelas['eventos']['Row'];
export type Conteudo = Tabelas['conteudos']['Row'];
export type Tarefa = Tabelas['tarefas']['Row'];
export type Anotacao = Tabelas['anotacoes']['Row'];
export type ModeloPeriodo = Tabelas['modelos_periodo']['Row'];
export type ModeloDisciplina = Tabelas['modelos_disciplinas']['Row'];
export type ModeloEvento = Tabelas['modelos_eventos']['Row'];

export type TipoEvento = Enums['tipo_evento'];
export type StatusEvento = Enums['status_evento'];
export type StatusConteudo = Enums['status_conteudo'];
export type PrioridadeTarefa = Enums['prioridade_tarefa'];
export type StatusTarefa = Enums['status_tarefa'];

/** Item da listagem de anotações (sem o documento completo). */
export type ResumoAnotacao = {
  id: string;
  disciplina_id: string | null;
  titulo: string;
  trecho: string;
  created_at: string;
  updated_at: string;
};

export type DadosDisciplina = Pick<Disciplina, 'nome' | 'cor'> & Partial<Pick<Disciplina, 'professor' | 'descricao'>>;

export type DadosEvento = Pick<Evento, 'titulo' | 'tipo' | 'data'> &
  Partial<Pick<Evento, 'disciplina_id' | 'hora_inicio' | 'hora_fim' | 'descricao' | 'cor' | 'status'>>;

export type DadosConteudo = Pick<Conteudo, 'titulo' | 'disciplina_id'> &
  Partial<Pick<Conteudo, 'data_prevista' | 'status' | 'observacoes'>>;

export type DadosTarefa = Pick<Tarefa, 'titulo'> &
  Partial<Pick<Tarefa, 'disciplina_id' | 'descricao' | 'prazo' | 'prioridade' | 'status'>>;

/** Estado de navegação ao abrir o editor de anotações. */
export type EstadoNavegacaoAnotacao = {
  voltar?: string;
  disciplinaId?: string | null;
  /** Identifica o editor de uma anotação nova enquanto ela ainda não tem id. */
  rascunho?: string;
} | null;

// ── Rótulos ─────────────────────────────────────────────────────────────────

export const TIPOS_EVENTO: { valor: TipoEvento; rotulo: string; cor: string }[] = [
  { valor: 'prova', rotulo: 'Prova', cor: '#8C1D40' },
  { valor: 'avaliacao_pratica', rotulo: 'Avaliação prática', cor: '#B45309' },
  { valor: 'trabalho', rotulo: 'Trabalho', cor: '#2F5D8A' },
  { valor: 'entrega', rotulo: 'Entrega de atividade', cor: '#0F766E' },
  { valor: 'aula', rotulo: 'Aula', cor: '#475569' },
  { valor: 'revisao', rotulo: 'Revisão', cor: '#6B4E9B' },
  { valor: 'outro', rotulo: 'Outro compromisso', cor: '#78716C' },
];

/** Tipos que contam como avaliação (aba "Avaliações e datas", próxima prova). */
export const TIPOS_AVALIACAO: TipoEvento[] = ['prova', 'avaliacao_pratica', 'trabalho', 'entrega'];
export const TIPOS_PROVA: TipoEvento[] = ['prova', 'avaliacao_pratica'];

export const STATUS_EVENTO: { valor: StatusEvento; rotulo: string }[] = [
  { valor: 'agendado', rotulo: 'Agendado' },
  { valor: 'concluido', rotulo: 'Concluído' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
];

export const STATUS_CONTEUDO: { valor: StatusConteudo; rotulo: string }[] = [
  { valor: 'nao_iniciado', rotulo: 'Não iniciado' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluído' },
];

export const PRIORIDADES: { valor: PrioridadeTarefa; rotulo: string }[] = [
  { valor: 'alta', rotulo: 'Alta' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'baixa', rotulo: 'Baixa' },
];

export const STATUS_TAREFA: { valor: StatusTarefa; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluida', rotulo: 'Concluída' },
];

export function rotuloTipo(tipo: TipoEvento): string {
  return TIPOS_EVENTO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

export function corDoTipo(tipo: TipoEvento): string {
  return TIPOS_EVENTO.find((t) => t.valor === tipo)?.cor ?? '#78716C';
}


export function rotuloPrioridade(prioridade: PrioridadeTarefa): string {
  return PRIORIDADES.find((p) => p.valor === prioridade)?.rotulo ?? prioridade;
}
