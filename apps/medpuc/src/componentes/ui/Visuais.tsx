import type { ReactNode } from 'react';
import { comTransparencia } from '../../lib/cores';

export function Cartao({ children, className = '', as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={`rounded-2xl border border-stone-200/80 bg-white shadow-cartao ${className}`}>{children}</Tag>;
}

export function CabecalhoCartao({ titulo, icone, acao }: { titulo: string; icone?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-4 pb-3">
      {icone && <span className="text-vinho-600">{icone}</span>}
      <h2 className="flex-1 text-sm font-semibold tracking-wide text-stone-500 uppercase">{titulo}</h2>
      {acao}
    </div>
  );
}

export function PontoCor({ cor, className = 'size-2.5' }: { cor: string; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: cor }} />;
}

type Tom = 'neutro' | 'vinho' | 'verde' | 'ambar' | 'vermelho' | 'azul';

const TONS: Record<Tom, string> = {
  neutro: 'bg-stone-100 text-stone-600',
  vinho: 'bg-vinho-50 text-vinho-700',
  verde: 'bg-emerald-50 text-emerald-700',
  ambar: 'bg-amber-50 text-amber-800',
  vermelho: 'bg-red-50 text-red-700',
  azul: 'bg-sky-50 text-sky-800',
};

export function Etiqueta({ children, tom = 'neutro', cor }: { children: ReactNode; tom?: Tom; cor?: string }) {
  if (cor) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-stone-700"
        style={{ backgroundColor: comTransparencia(cor, 0.1) }}
      >
        <PontoCor cor={cor} className="size-1.5" />
        {children}
      </span>
    );
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONS[tom]}`}>{children}</span>;
}

export function BarraProgresso({ percentual, cor = '#8C1D40', rotulo }: { percentual: number; cor?: string; rotulo: string }) {
  const valor = Math.max(0, Math.min(100, Math.round(percentual)));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100"
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${valor}%`, backgroundColor: cor }} />
    </div>
  );
}

export function Marca({ claro = false, compacta = false }: { claro?: boolean; compacta?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`flex size-8 items-center justify-center rounded-lg ${claro ? 'bg-white text-vinho-700' : 'bg-vinho-600 text-white'}`}>
        <svg viewBox="0 0 64 64" aria-hidden className="size-5">
          <path d="M14 46V18h7l11 15 11-15h7v28h-7V30L32 44 21 30v16z" fill="currentColor" />
        </svg>
      </span>
      {!compacta && (
        <span className={`font-serif text-lg font-semibold tracking-tight ${claro ? 'text-white' : 'text-stone-900'}`}>
          Med<span className={claro ? 'text-vinho-200' : 'text-vinho-600'}>PUC</span>
        </span>
      )}
    </span>
  );
}

export function TituloPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-stone-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}
