/**
 * Chaves do React Query. Toda escrita invalida o prefixo do recurso
 * (ex.: ['eventos']), o que atualiza calendário, painel e disciplina juntos.
 */
export const chaves = {
  perfil: (id: string) => ['perfil', id] as const,
  plano: ['plano'] as const,
  uso: ['uso'] as const,
  admin: ['admin'] as const,
  planosPublicos: ['planos-publicos'] as const,
  disciplinas: ['disciplinas'] as const,
  eventos: ['eventos'] as const,
  eventosIntervalo: (de: string, ate: string) => ['eventos', 'intervalo', de, ate] as const,
  eventosFuturos: (hoje: string) => ['eventos', 'futuros', hoje] as const,
  eventosDisciplina: (id: string) => ['eventos', 'disciplina', id] as const,
  conteudos: ['conteudos'] as const,
  tarefas: ['tarefas'] as const,
  anotacoes: ['anotacoes'] as const,
  buscaAnotacoes: (termo: string, disciplinaId: string | null) => ['anotacoes', 'busca', termo, disciplinaId] as const,
  anotacao: (id: string) => ['anotacoes', 'item', id] as const,
  modelos: (somentePublicados: boolean) => ['modelos', somentePublicados] as const,
};
