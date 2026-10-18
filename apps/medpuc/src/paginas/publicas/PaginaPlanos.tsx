import { Link } from 'react-router';
import { SecaoPlanos } from '../../componentes/marketing/Planos';
import { Marca } from '../../componentes/ui/Visuais';
import { useTituloPagina } from '../../hooks/useUtilitarios';

export function PaginaPlanos() {
  useTituloPagina('Planos');
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6">
        <Link to="/" aria-label="MedPUC — página inicial">
          <Marca />
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Planos</h1>
        <p className="mt-2 text-stone-600">Comece de graça. Sem cartão de crédito.</p>
        <div className="mt-10">
          <SecaoPlanos />
        </div>
      </main>
    </div>
  );
}
