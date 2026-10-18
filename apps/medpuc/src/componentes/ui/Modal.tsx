/**
 * Modal acessível: foco preso dentro, Esc fecha, foco volta ao elemento que
 * abriu. No celular aparece como folha deslizando de baixo.
 */

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: 'sm' | 'md' | 'lg';
};

const LARGURAS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

export function Modal({ aberto, aoFechar, titulo, descricao, children, rodape, largura = 'md' }: Props) {
  const idTitulo = useId();
  const idDescricao = useId();
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const primeiro =
      painel.current?.querySelector<HTMLElement>('[data-autofoco]') ??
      painel.current?.querySelector<HTMLElement>('input, select, textarea') ??
      painel.current;
    primeiro?.focus();

    function teclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        fechar.current();
        return;
      }
      if (evento.key !== 'Tab' || !painel.current) return;
      const itens = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (!itens.length) return;
      const [inicio, fim] = [itens[0], itens[itens.length - 1]];
      if (evento.shiftKey && document.activeElement === inicio) {
        evento.preventDefault();
        fim.focus();
      } else if (!evento.shiftKey && document.activeElement === fim) {
        evento.preventDefault();
        inicio.focus();
      }
    }

    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-surgir bg-stone-900/40 backdrop-blur-[2px]" onClick={aoFechar} aria-hidden />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full animate-deslizar flex-col rounded-t-2xl bg-white shadow-flutuante outline-none sm:animate-surgir sm:rounded-2xl ${LARGURAS[largura]}`}
      >
        <header className="flex items-start gap-4 border-b border-stone-100 px-5 py-4">
          <div className="flex-1">
            <h2 id={idTitulo} className="font-serif text-lg font-semibold">
              {titulo}
            </h2>
            {descricao && (
              <p id={idDescricao} className="mt-0.5 text-sm text-stone-500">
                {descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="-m-1 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {rodape && (
          <footer className="flex flex-col-reverse gap-2 border-t border-stone-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {rodape}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
