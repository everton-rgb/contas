import { Plus } from 'lucide-react';
import {
  deISO,
  diasDaSemana,
  formatarData,
  formatarDiaSemana,
  gradeDoMes,
  hojeISO,
  mesmoMes,
  NOMES_DIAS_CURTOS,
  paraISO,
} from '../../lib/datas';
import { ChipItem, LinhaItem } from './ChipItem';
import type { ItemCalendario } from './itens';

type PropsVista = {
  referencia: Date;
  porDia: Map<string, ItemCalendario[]>;
  aoAbrir: (item: ItemCalendario) => void;
  aoNovo: (data: string, hora?: string) => void;
  aoIrParaDia: (data: string) => void;
};

const MAXIMO_POR_CELULA = 3;

export function VistaMes({ referencia, porDia, aoAbrir, aoNovo, aoIrParaDia }: PropsVista) {
  const hoje = hojeISO();
  const dias = gradeDoMes(referencia);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-cartao">
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80" aria-hidden>
        {NOMES_DIAS_CURTOS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold tracking-wide text-stone-500 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div aria-label="Calendário do mês" role="region" className="grid grid-cols-7">
        {dias.map((dia, i) => {
          const itens = porDia.get(dia) ?? [];
          const foraDoMes = !mesmoMes(dia, referencia);
          const ehHoje = dia === hoje;
          const extras = itens.length - MAXIMO_POR_CELULA;
          return (
            <div
              key={dia}
              role="group"
              data-data={dia}
              aria-label={`${formatarData(dia, "EEEE, d 'de' MMMM")}${itens.length ? `, ${itens.length} compromisso(s)` : ''}`}
              className={`group relative min-h-16 border-stone-100 p-1 sm:min-h-28 sm:p-1.5 ${i % 7 !== 6 ? 'border-r' : ''} ${
                i < 35 ? 'border-b' : ''
              } ${foraDoMes ? 'bg-stone-50/60' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => aoIrParaDia(dia)}
                  aria-label={`Abrir ${formatarData(dia, "d 'de' MMMM")}`}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    ehHoje
                      ? 'bg-vinho-600 text-white'
                      : foraDoMes
                        ? 'text-stone-500 hover:bg-stone-100'
                        : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {deISO(dia).getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => aoNovo(dia)}
                  aria-label={`Novo evento em ${formatarData(dia, "d 'de' MMMM")}`}
                  className="hidden size-6 items-center justify-center rounded-md text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-700 focus:opacity-100 sm:flex"
                >
                  <Plus aria-hidden className="size-3.5" />
                </button>
              </div>

              {/* Celular: pontos coloridos; toque abre o dia. */}
              {itens.length > 0 && (
                <button
                  type="button"
                  onClick={() => aoIrParaDia(dia)}
                  className="flex flex-wrap gap-0.5 px-0.5 sm:hidden"
                  aria-label={`${itens.length} compromisso(s) em ${formatarData(dia, "d 'de' MMMM")}`}
                >
                  {itens.slice(0, 4).map((item) => (
                    <span key={`${item.tipo}-${item.id}`} className="size-1.5 rounded-full" style={{ backgroundColor: item.cor }} />
                  ))}
                </button>
              )}

              <div className="hidden space-y-0.5 sm:block">
                {itens.slice(0, MAXIMO_POR_CELULA).map((item) => (
                  <ChipItem key={`${item.tipo}-${item.id}`} item={item} aoAbrir={aoAbrir} />
                ))}
                {extras > 0 && (
                  <button
                    type="button"
                    onClick={() => aoIrParaDia(dia)}
                    className="w-full rounded px-1.5 text-left text-[11px] font-medium text-stone-500 hover:text-stone-800"
                  >
                    +{extras} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VistaSemana({ referencia, porDia, aoAbrir, aoNovo, aoIrParaDia }: PropsVista) {
  const hoje = hojeISO();
  return (
    <div className="grid gap-3 lg:grid-cols-7 lg:gap-2">
      {diasDaSemana(referencia).map((dia) => {
        const itens = porDia.get(dia) ?? [];
        const ehHoje = dia === hoje;
        return (
          <section
            key={dia}
            aria-label={formatarData(dia, "EEEE, d 'de' MMMM")}
            data-data={dia}
            className={`flex flex-col rounded-2xl border bg-white p-2 shadow-cartao lg:min-h-80 ${
              ehHoje ? 'border-vinho-300' : 'border-stone-200'
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <button type="button" onClick={() => aoIrParaDia(dia)} className="flex items-baseline gap-2 rounded text-left lg:flex-col lg:gap-0">
                <span className={`text-[11px] font-semibold tracking-wide uppercase ${ehHoje ? 'text-vinho-700' : 'text-stone-500'}`}>
                  {formatarDiaSemana(dia)}
                </span>
                <span className={`font-serif text-xl font-semibold ${ehHoje ? 'text-vinho-700' : 'text-stone-800'}`}>
                  {formatarData(dia, 'd')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => aoNovo(dia)}
                aria-label={`Novo evento em ${formatarData(dia, "d 'de' MMMM")}`}
                className="flex size-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {itens.length ? (
                itens.map((item) => <LinhaItem key={`${item.tipo}-${item.id}`} item={item} aoAbrir={aoAbrir} />)
              ) : (
                <p className="px-1 pb-1 text-xs text-stone-500">Livre</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function VistaDia({ referencia, porDia, aoAbrir, aoNovo }: Omit<PropsVista, 'aoIrParaDia'>) {
  const data = paraISO(referencia);
  const itens = porDia.get(data) ?? [];
  const semHorario = itens.filter((i) => !i.hora);
  const comHorario = itens.filter((i) => i.hora);
  const horas = new Set(comHorario.map((i) => Number(i.hora!.slice(0, 2))));
  const inicio = Math.min(7, ...horas);
  const fim = Math.max(22, ...horas);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-cartao">
      <div className="flex items-start gap-3 border-b border-stone-100 p-3">
        <span className="w-14 shrink-0 pt-2 text-right text-xs font-medium text-stone-500">Dia todo</span>
        <div className="flex-1 space-y-1.5">
          {semHorario.length ? (
            semHorario.map((item) => <LinhaItem key={`${item.tipo}-${item.id}`} item={item} aoAbrir={aoAbrir} />)
          ) : (
            <p className="pt-2 text-xs text-stone-500">Nenhum compromisso sem horário.</p>
          )}
        </div>
      </div>
      <ol>
        {Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i).map((hora) => {
          const daHora = comHorario.filter((item) => Number(item.hora!.slice(0, 2)) === hora);
          const rotulo = `${String(hora).padStart(2, '0')}:00`;
          return (
            <li key={hora} className="group flex min-h-12 items-start gap-3 border-b border-stone-50 px-3 py-1.5 last:border-b-0">
              <span className="w-14 shrink-0 pt-1.5 text-right text-xs text-stone-500 tabular-nums">{rotulo}</span>
              <div className="flex-1 space-y-1.5">
                {daHora.map((item) => (
                  <LinhaItem key={`${item.tipo}-${item.id}`} item={item} aoAbrir={aoAbrir} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => aoNovo(data, rotulo)}
                aria-label={`Novo evento às ${rotulo}`}
                className="flex size-7 items-center justify-center rounded-md text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-700 focus:opacity-100"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
