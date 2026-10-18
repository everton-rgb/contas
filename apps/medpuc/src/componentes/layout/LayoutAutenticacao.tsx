import { CalendarCheck2, NotebookPen, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Marca } from '../ui/Visuais';

const DESTAQUES = [
  { icone: CalendarCheck2, texto: 'Provas, trabalhos e aulas em um calendário só seu.' },
  { icone: NotebookPen, texto: 'Caderno digital por disciplina, salvo automaticamente.' },
  { icone: ShieldCheck, texto: 'Seus dados ficam isolados na sua conta.' },
];

export function LayoutAutenticacao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-vinho-700 p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-vinho-500/40 blur-3xl"
        />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-vinho-900/60 blur-3xl" />
        <Link to="/" className="relative" aria-label="MedPUC — página inicial">
          <Marca claro />
        </Link>
        <div className="relative mt-auto max-w-md">
          <p className="font-serif text-3xl leading-tight font-medium">
            Menos tempo organizando, mais tempo estudando.
          </p>
          <ul className="mt-8 space-y-4 text-vinho-50">
            {DESTAQUES.map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icone aria-hidden className="size-4" />
                </span>
                <span className="text-sm leading-6">{texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="mb-10 lg:hidden" aria-label="MedPUC — página inicial">
          <Marca />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-10">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-sm text-stone-500">{subtitulo}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function Alerta({ tipo, children }: { tipo: 'erro' | 'sucesso' | 'info'; children: ReactNode }) {
  const estilos = {
    erro: 'border-red-200 bg-red-50 text-red-800',
    sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-stone-200 bg-stone-50 text-stone-700',
  };
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg border px-3.5 py-3 text-sm leading-6 ${estilos[tipo]}`}>
      {children}
    </div>
  );
}
