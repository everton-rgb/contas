/**
 * Itens exibidos no calendário. Eventos vêm da tabela `eventos` (fonte
 * única); prazos de tarefas e datas de estudo são camadas de leitura das
 * próprias tabelas — nada é copiado.
 */

import { horarioDoEvento, corDoEvento } from '../eventos/ItemEvento';
import { rotuloTipo, type Conteudo, type Disciplina, type Evento, type Tarefa, type TipoEvento } from '../../tipos/dominio';

export type ItemCalendario =
  | { tipo: 'evento'; id: string; data: string; hora: string | null; titulo: string; detalhe: string; cor: string; riscado: boolean; evento: Evento }
  | { tipo: 'tarefa'; id: string; data: string; hora: null; titulo: string; detalhe: string; cor: string; riscado: boolean; tarefa: Tarefa }
  | { tipo: 'conteudo'; id: string; data: string; hora: null; titulo: string; detalhe: string; cor: string; riscado: boolean; conteudo: Conteudo };

export type FiltrosCalendario = {
  disciplinas: Set<string>; // vazio = todas
  tipo: TipoEvento | '';
  tarefas: boolean;
  estudos: boolean;
};

export function montarItens(
  { eventos, tarefas, conteudos }: { eventos: Evento[]; tarefas: Tarefa[]; conteudos: Conteudo[] },
  disciplinas: Map<string, Disciplina>,
  filtros: FiltrosCalendario,
  intervalo: { de: string; ate: string },
): ItemCalendario[] {
  const passaDisciplina = (id: string | null) => !filtros.disciplinas.size || (!!id && filtros.disciplinas.has(id));
  const noIntervalo = (data: string | null): data is string => !!data && data >= intervalo.de && data <= intervalo.ate;
  const itens: ItemCalendario[] = [];

  for (const evento of eventos) {
    if (!noIntervalo(evento.data) || !passaDisciplina(evento.disciplina_id)) continue;
    if (filtros.tipo && evento.tipo !== filtros.tipo) continue;
    const disciplina = evento.disciplina_id ? disciplinas.get(evento.disciplina_id) : undefined;
    itens.push({
      tipo: 'evento',
      id: evento.id,
      data: evento.data,
      hora: evento.hora_inicio,
      titulo: evento.titulo,
      detalhe: [rotuloTipo(evento.tipo), disciplina?.nome, horarioDoEvento(evento)].filter(Boolean).join(' · '),
      cor: corDoEvento(evento, disciplina),
      riscado: evento.status === 'cancelado',
      evento,
    });
  }

  if (filtros.tarefas && !filtros.tipo) {
    for (const tarefa of tarefas) {
      if (!noIntervalo(tarefa.prazo) || !passaDisciplina(tarefa.disciplina_id)) continue;
      const disciplina = tarefa.disciplina_id ? disciplinas.get(tarefa.disciplina_id) : undefined;
      itens.push({
        tipo: 'tarefa',
        id: tarefa.id,
        data: tarefa.prazo,
        hora: null,
        titulo: tarefa.titulo,
        detalhe: ['Prazo de tarefa', disciplina?.nome].filter(Boolean).join(' · '),
        cor: disciplina?.cor ?? '#78716C',
        riscado: tarefa.status === 'concluida',
        tarefa,
      });
    }
  }

  if (filtros.estudos && !filtros.tipo) {
    for (const conteudo of conteudos) {
      if (!noIntervalo(conteudo.data_prevista) || !passaDisciplina(conteudo.disciplina_id)) continue;
      const disciplina = disciplinas.get(conteudo.disciplina_id);
      itens.push({
        tipo: 'conteudo',
        id: conteudo.id,
        data: conteudo.data_prevista,
        hora: null,
        titulo: conteudo.titulo,
        detalhe: ['Estudo planejado', disciplina?.nome].filter(Boolean).join(' · '),
        cor: disciplina?.cor ?? '#78716C',
        riscado: conteudo.status === 'concluido',
        conteudo,
      });
    }
  }

  const peso = { evento: 0, tarefa: 1, conteudo: 2 };
  return itens.sort(
    (a, b) =>
      a.data.localeCompare(b.data) ||
      peso[a.tipo] - peso[b.tipo] ||
      (a.hora ?? '').localeCompare(b.hora ?? '') ||
      a.titulo.localeCompare(b.titulo, 'pt-BR'),
  );
}

export function agruparPorDia(itens: ItemCalendario[]): Map<string, ItemCalendario[]> {
  const mapa = new Map<string, ItemCalendario[]>();
  for (const item of itens) {
    const lista = mapa.get(item.data) ?? [];
    lista.push(item);
    mapa.set(item.data, lista);
  }
  return mapa;
}
