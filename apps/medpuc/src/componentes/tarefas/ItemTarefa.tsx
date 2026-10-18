import { CalendarClock, Check } from 'lucide-react';
import { descreverDistancia, formatarData, hojeISO } from '../../lib/datas';
import { tarefaAtrasada } from '../../lib/resumo';
import { rotuloPrioridade, type Disciplina, type Tarefa } from '../../tipos/dominio';
import { Etiqueta, PontoCor } from '../ui/Visuais';

type Props = {
  tarefa: Tarefa;
  disciplina?: Disciplina | null;
  aoAlternar: (tarefa: Tarefa) => void;
  aoAbrir: (tarefa: Tarefa) => void;
};

const TOM_PRIORIDADE = { alta: 'vermelho', media: 'ambar', baixa: 'neutro' } as const;

export function ItemTarefa({ tarefa, disciplina, aoAlternar, aoAbrir }: Props) {
  const concluida = tarefa.status === 'concluida';
  const atrasada = tarefaAtrasada(tarefa, hojeISO());

  return (
    <li className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-stone-50">
      <button
        type="button"
        role="checkbox"
        aria-checked={concluida}
        aria-label={concluida ? `Reabrir "${tarefa.titulo}"` : `Concluir "${tarefa.titulo}"`}
        onClick={() => aoAlternar(tarefa)}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          concluida ? 'border-vinho-600 bg-vinho-600 text-white' : 'border-stone-300 hover:border-vinho-500'
        }`}
      >
        {concluida && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
      </button>
      <button type="button" onClick={() => aoAbrir(tarefa)} className="min-w-0 flex-1 text-left">
        <span className={`block text-sm font-medium ${concluida ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
          {tarefa.titulo}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          {disciplina && (
            <span className="inline-flex items-center gap-1.5">
              <PontoCor cor={disciplina.cor} className="size-2" />
              {disciplina.nome}
            </span>
          )}
          {tarefa.prazo && (
            <span className={`inline-flex items-center gap-1 ${atrasada ? 'font-medium text-red-600' : ''}`}>
              <CalendarClock aria-hidden className="size-3.5" />
              {formatarData(tarefa.prazo)} · {atrasada ? `atrasada (${descreverDistancia(tarefa.prazo)})` : descreverDistancia(tarefa.prazo)}
            </span>
          )}
          {!concluida && tarefa.status === 'em_andamento' && <Etiqueta tom="azul">Em andamento</Etiqueta>}
        </span>
      </button>
      {!concluida && <Etiqueta tom={TOM_PRIORIDADE[tarefa.prioridade]}>{rotuloPrioridade(tarefa.prioridade)}</Etiqueta>}
    </li>
  );
}
