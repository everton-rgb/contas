import { ArrowUpRight, CalendarClock, ListChecks } from 'lucide-react';
import { Link } from 'react-router';
import { comTransparencia } from '../../lib/cores';
import { descreverDistancia, formatarData } from '../../lib/datas';
import type { Progresso } from '../../lib/resumo';
import { plural } from '../../lib/texto';
import { rotuloTipo, type Disciplina, type Evento } from '../../tipos/dominio';
import { BarraProgresso } from '../ui/Visuais';

type Props = {
  disciplina: Disciplina;
  proximaAvaliacao?: Evento;
  pendentes: number;
  progresso?: Progresso;
};

export function CartaoDisciplina({ disciplina, proximaAvaliacao, pendentes, progresso }: Props) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-cartao transition-shadow hover:shadow-flutuante">
      <div className="h-1.5" style={{ backgroundColor: disciplina.cor }} aria-hidden />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl font-serif text-lg font-semibold"
            style={{ backgroundColor: comTransparencia(disciplina.cor, 0.12), color: disciplina.cor }}
          >
            {disciplina.nome.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold leading-snug text-stone-900">
              <Link to={`/app/disciplinas/${disciplina.id}`} className="after:absolute after:inset-0 focus:outline-none">
                {disciplina.nome}
              </Link>
            </h2>
            {disciplina.professor && <p className="mt-0.5 truncate text-xs text-stone-500">{disciplina.professor}</p>}
          </div>
          <ArrowUpRight aria-hidden className="size-4 shrink-0 text-stone-300 transition-colors group-hover:text-stone-600" />
        </div>

        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Próxima avaliação</dt>
            <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-stone-400" />
            <dd className="min-w-0 text-stone-600">
              {proximaAvaliacao ? (
                <>
                  <span className="font-medium text-stone-800">{rotuloTipo(proximaAvaliacao.tipo)}</span>{' '}
                  {formatarData(proximaAvaliacao.data)} · {descreverDistancia(proximaAvaliacao.data)}
                </>
              ) : (
                <span className="text-stone-500">Nenhuma avaliação agendada</span>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Tarefas pendentes</dt>
            <ListChecks aria-hidden className="size-4 shrink-0 text-stone-400" />
            <dd className={pendentes ? 'text-stone-600' : 'text-stone-500'}>
              {pendentes ? plural(pendentes, 'tarefa pendente', 'tarefas pendentes') : 'Sem tarefas pendentes'}
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-5">
          <div className="mb-1.5 flex justify-between text-xs text-stone-500">
            <span>Progresso de estudo</span>
            <span className="font-medium text-stone-700">
              {progresso?.total ? `${progresso.percentual}% · ${progresso.concluidos}/${progresso.total}` : 'sem conteúdos'}
            </span>
          </div>
          <BarraProgresso percentual={progresso?.percentual ?? 0} cor={disciplina.cor} rotulo={`Progresso em ${disciplina.nome}`} />
        </div>
      </div>
    </article>
  );
}
