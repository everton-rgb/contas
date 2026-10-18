import { Clock } from 'lucide-react';
import { comTransparencia } from '../../lib/cores';
import { descreverDistancia, formatarData, formatarHora } from '../../lib/datas';
import { corDoTipo, rotuloTipo, type Disciplina, type Evento } from '../../tipos/dominio';
import { Etiqueta } from '../ui/Visuais';

export function corDoEvento(evento: Evento, disciplina?: Disciplina | null): string {
  return disciplina?.cor ?? evento.cor ?? corDoTipo(evento.tipo);
}

export function horarioDoEvento(evento: Pick<Evento, 'hora_inicio' | 'hora_fim'>): string {
  if (!evento.hora_inicio) return 'Dia todo';
  return evento.hora_fim
    ? `${formatarHora(evento.hora_inicio)}–${formatarHora(evento.hora_fim)}`
    : formatarHora(evento.hora_inicio);
}

type Props = {
  evento: Evento;
  disciplina?: Disciplina | null;
  aoAbrir: (evento: Evento) => void;
  mostrarData?: boolean;
};

export function ItemEvento({ evento, disciplina, aoAbrir, mostrarData = true }: Props) {
  const cor = corDoEvento(evento, disciplina);
  const cancelado = evento.status === 'cancelado';
  return (
    <button
      type="button"
      onClick={() => aoAbrir(evento)}
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-stone-200 hover:bg-stone-50"
    >
      {mostrarData && (
        <span
          className="flex w-12 shrink-0 flex-col items-center rounded-lg py-1"
          style={{ backgroundColor: comTransparencia(cor, 0.1) }}
        >
          <span className="text-[10px] font-semibold tracking-wide text-stone-500 uppercase">
            {formatarData(evento.data, 'MMM').replace('.', '')}
          </span>
          <span className="font-serif text-lg leading-none font-semibold text-stone-800">{formatarData(evento.data, 'd')}</span>
        </span>
      )}
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-medium ${cancelado ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
          {evento.titulo}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          <span>{rotuloTipo(evento.tipo)}</span>
          {disciplina && <span className="truncate">· {disciplina.nome}</span>}
          <span className="inline-flex items-center gap-1">
            · <Clock aria-hidden className="size-3" /> {horarioDoEvento(evento)}
          </span>
        </span>
      </span>
      <span className="hidden shrink-0 sm:block">
        {evento.status === 'concluido' ? (
          <Etiqueta tom="verde">Concluído</Etiqueta>
        ) : cancelado ? (
          <Etiqueta>Cancelado</Etiqueta>
        ) : (
          <Etiqueta tom="vinho">{descreverDistancia(evento.data)}</Etiqueta>
        )}
      </span>
    </button>
  );
}
