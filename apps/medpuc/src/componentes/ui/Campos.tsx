import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

const BASE =
  'block w-full rounded-lg border bg-white px-3 text-sm text-stone-800 shadow-sm transition-colors placeholder:text-stone-400 focus:outline-none focus:ring-2 disabled:bg-stone-50 disabled:text-stone-500';

function classes(erro?: string) {
  return `${BASE} ${
    erro
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-stone-300 focus:border-vinho-500 focus:ring-vinho-100'
  }`;
}

type Envoltorio = { rotulo: ReactNode; erro?: string; dica?: ReactNode; opcional?: boolean; className?: string };

function Envolver({
  id,
  rotulo,
  erro,
  dica,
  opcional,
  className = '',
  children,
}: Envoltorio & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-stone-700">
        {rotulo}
        {opcional && <span className="text-xs font-normal text-stone-500">(opcional)</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1.5 text-xs text-red-600">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-1.5 text-xs text-stone-500">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

function aria(id: string, erro?: string, dica?: ReactNode) {
  return {
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? `${id}-erro` : dica ? `${id}-dica` : undefined,
  };
}

type PropsCampo = Envoltorio & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;

export const Campo = forwardRef<HTMLInputElement, PropsCampo>(function Campo(
  { rotulo, erro, dica, opcional, className, id, ...resto },
  ref,
) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <Envolver id={idFinal} rotulo={rotulo} erro={erro} dica={dica} opcional={opcional} className={className}>
      <input ref={ref} id={idFinal} className={`${classes(erro)} h-10`} {...aria(idFinal, erro, dica)} {...resto} />
    </Envolver>
  );
});

type PropsArea = Envoltorio & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

export function AreaTexto({ rotulo, erro, dica, opcional, className, id, rows = 3, ...resto }: PropsArea) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <Envolver id={idFinal} rotulo={rotulo} erro={erro} dica={dica} opcional={opcional} className={className}>
      <textarea id={idFinal} rows={rows} className={`${classes(erro)} resize-y py-2`} {...aria(idFinal, erro, dica)} {...resto} />
    </Envolver>
  );
}

type PropsSelecao = Envoltorio & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>;

export function Selecao({ rotulo, erro, dica, opcional, className, id, children, ...resto }: PropsSelecao) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <Envolver id={idFinal} rotulo={rotulo} erro={erro} dica={dica} opcional={opcional} className={className}>
      <select id={idFinal} className={`${classes(erro)} h-10 pr-8`} {...aria(idFinal, erro, dica)} {...resto}>
        {children}
      </select>
    </Envolver>
  );
}

/** Select compacto sem rótulo visível (filtros). */
export function SelecaoCompacta({
  rotulo,
  className = '',
  children,
  ...resto
}: SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string }) {
  return (
    <select
      aria-label={rotulo}
      className={`h-9 rounded-lg border border-stone-300 bg-white px-2.5 pr-8 text-sm text-stone-700 shadow-sm focus:border-vinho-500 focus:outline-none focus:ring-2 focus:ring-vinho-100 ${className}`}
      {...resto}
    >
      {children}
    </select>
  );
}
