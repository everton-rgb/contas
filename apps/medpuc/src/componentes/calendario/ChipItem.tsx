import { BookMarked, CheckSquare } from 'lucide-react';
import { comTransparencia } from '../../lib/cores';
import { formatarHora } from '../../lib/datas';
import type { ItemCalendario } from './itens';

/** Item compacto (grade do mês). */
export function ChipItem({ item, aoAbrir }: { item: ItemCalendario; aoAbrir: (item: ItemCalendario) => void }) {
  const Icone = item.tipo === 'tarefa' ? CheckSquare : item.tipo === 'conteudo' ? BookMarked : null;
  return (
    <button
      type="button"
      onClick={() => aoAbrir(item)}
      title={`${item.titulo} — ${item.detalhe}`}
      aria-label={`${item.titulo}, ${item.detalhe}`}
      className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-4 font-medium text-stone-800 transition-colors hover:brightness-95 ${
        item.riscado ? 'line-through opacity-60' : ''
      } ${item.tipo === 'evento' ? '' : 'border border-dashed'}`}
      style={{
        backgroundColor: item.tipo === 'evento' ? comTransparencia(item.cor, 0.14) : 'transparent',
        borderColor: item.tipo === 'evento' ? undefined : comTransparencia(item.cor, 0.5),
        boxShadow: item.tipo === 'evento' ? `inset 2px 0 0 ${item.cor}` : undefined,
      }}
    >
      {Icone && <Icone aria-hidden className="size-3 shrink-0" style={{ color: item.cor }} />}
      {item.hora && <span className="shrink-0 text-stone-500">{formatarHora(item.hora)}</span>}
      <span className="truncate">{item.titulo}</span>
    </button>
  );
}

/** Item completo (semana e dia). */
export function LinhaItem({ item, aoAbrir }: { item: ItemCalendario; aoAbrir: (item: ItemCalendario) => void }) {
  const Icone = item.tipo === 'tarefa' ? CheckSquare : item.tipo === 'conteudo' ? BookMarked : null;
  return (
    <button
      type="button"
      onClick={() => aoAbrir(item)}
      className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:brightness-95 ${
        item.tipo === 'evento' ? '' : 'border border-dashed'
      }`}
      style={{
        backgroundColor: item.tipo === 'evento' ? comTransparencia(item.cor, 0.12) : 'white',
        borderColor: item.tipo === 'evento' ? undefined : comTransparencia(item.cor, 0.5),
        boxShadow: item.tipo === 'evento' ? `inset 3px 0 0 ${item.cor}` : undefined,
      }}
    >
      {Icone && <Icone aria-hidden className="mt-0.5 size-3.5 shrink-0" style={{ color: item.cor }} />}
      <span className="min-w-0">
        <span className={`block text-sm leading-5 font-medium text-stone-800 ${item.riscado ? 'line-through opacity-60' : ''}`}>
          {item.titulo}
        </span>
        <span className="block text-xs text-stone-500">{item.detalhe}</span>
      </span>
    </button>
  );
}
