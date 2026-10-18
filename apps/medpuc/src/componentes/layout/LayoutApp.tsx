import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  LogOut,
  NotebookPen,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Suspense } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useEhAdmin, usePerfil } from '../../hooks/useConta';
import { traduzirErro } from '../../lib/erros';
import { primeiroNome } from '../../lib/texto';
import { sair } from '../../servicos/auth';
import { Carregando } from '../ui/Estados';
import { Marca } from '../ui/Visuais';

const NAVEGACAO = [
  { para: '/app', rotulo: 'Painel', icone: LayoutDashboard, exato: true },
  { para: '/app/calendario', rotulo: 'Calendário', icone: CalendarDays },
  { para: '/app/disciplinas', rotulo: 'Disciplinas', icone: BookOpen },
  { para: '/app/anotacoes', rotulo: 'Anotações', icone: NotebookPen },
  { para: '/app/tarefas', rotulo: 'Tarefas', icone: ListChecks },
];

function Iniciais({ nome }: { nome: string }) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-vinho-100 text-xs font-semibold text-vinho-700">
      {iniciais || '?'}
    </span>
  );
}

export function LayoutApp() {
  const { data: perfil } = usePerfil();
  const { data: admin } = useEhAdmin();
  const navegar = useNavigate();
  const avisos = useNotificacoes();
  const nome = perfil?.nome ?? '';

  async function sairDaConta() {
    try {
      await sair();
      navegar('/entrar', { replace: true });
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  const classeItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-vinho-50 text-vinho-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
    }`;

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#conteudo" className="sr-only z-50 rounded bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Pular para o conteúdo
      </a>

      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-stone-200 bg-white/70 px-4 py-5 backdrop-blur lg:flex">
        <Link to="/app" className="mb-8 px-2" aria-label="MedPUC — painel">
          <Marca />
        </Link>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {NAVEGACAO.map(({ para, rotulo, icone: Icone, exato }) => (
            <NavLink key={para} to={para} end={exato} className={classeItem}>
              <Icone aria-hidden className="size-[18px]" />
              {rotulo}
            </NavLink>
          ))}
          {admin && (
            <NavLink to="/app/admin" className={classeItem}>
              <ShieldCheck aria-hidden className="size-[18px]" />
              Administração
            </NavLink>
          )}
        </nav>
        <div className="border-t border-stone-200 pt-4">
          <NavLink to="/app/perfil" className={classeItem}>
            <Iniciais nome={nome} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-stone-800">{nome || 'Minha conta'}</span>
              <span className="block text-xs font-normal text-stone-500">Perfil e configurações</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={sairDaConta}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <LogOut aria-hidden className="size-[18px]" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho (celular e tablet) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-papel/85 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/app" aria-label="MedPUC — painel">
            <Marca />
          </Link>
          <div className="flex items-center gap-1">
            {admin && (
              <Link to="/app/admin" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Administração">
                <ShieldCheck aria-hidden className="size-5" />
              </Link>
            )}
            <Link to="/app/perfil" className="rounded-full p-1 hover:bg-stone-100" aria-label={`Perfil de ${primeiroNome(nome) || 'usuário'}`}>
              {nome ? <Iniciais nome={nome} /> : <UserRound aria-hidden className="size-6 text-stone-500" />}
            </Link>
          </div>
        </header>

        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Navegação inferior (celular) */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {NAVEGACAO.map(({ para, rotulo, icone: Icone, exato }) => (
          <NavLink
            key={para}
            to={para}
            end={exato}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-vinho-700' : 'text-stone-500'
              }`
            }
          >
            <Icone aria-hidden className="size-5" />
            {rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
