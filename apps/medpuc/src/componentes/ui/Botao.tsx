import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'suave';
type Tamanho = 'sm' | 'md' | 'lg';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-vinho-600 text-white shadow-sm hover:bg-vinho-700 active:bg-vinho-800 disabled:bg-vinho-300',
  secundario:
    'border border-stone-300 bg-white text-stone-700 shadow-sm hover:border-stone-400 hover:bg-stone-50 disabled:text-stone-400',
  fantasma: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:text-stone-300',
  suave: 'bg-vinho-50 text-vinho-700 hover:bg-vinho-100 disabled:text-vinho-300',
  perigo: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

export function classesBotao(variante: Variante = 'primario', tamanho: Tamanho = 'md', extra = ''): string {
  return [
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed select-none',
    VARIANTES[variante],
    TAMANHOS[tamanho],
    extra,
  ].join(' ');
}

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  icone?: ReactNode;
};

export const Botao = forwardRef<HTMLButtonElement, PropsBotao>(function Botao(
  { variante = 'primario', tamanho = 'md', carregando, icone, className = '', children, disabled, type = 'button', ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={classesBotao(variante, tamanho, className)}
      {...resto}
    >
      {carregando ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icone}
      {children}
    </button>
  );
});

type PropsBotaoIcone = ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string; children: ReactNode };

/** Botão só com ícone; `rotulo` vira aria-label e dica. */
export function BotaoIcone({ rotulo, children, className = '', type = 'button', ...resto }: PropsBotaoIcone) {
  return (
    <button
      type={type}
      aria-label={rotulo}
      title={rotulo}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40 ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}

export function BotaoLink({
  variante = 'primario',
  tamanho = 'md',
  className = '',
  icone,
  children,
  ...resto
}: LinkProps & { variante?: Variante; tamanho?: Tamanho; icone?: ReactNode }) {
  return (
    <Link className={classesBotao(variante, tamanho, className)} {...resto}>
      {icone}
      {children}
    </Link>
  );
}
