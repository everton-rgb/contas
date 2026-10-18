/**
 * Guardas de rota. A proteção real dos dados está no RLS do banco; estes
 * componentes cuidam da navegação (não mostrar telas privadas sem sessão).
 */

import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { CarregandoTela, EstadoVazio } from '../componentes/ui/Estados';
import { useAutenticacao } from '../contextos/Autenticacao';
import { useEhAdmin } from '../hooks/useConta';
import { ShieldAlert } from 'lucide-react';
import { Carregando } from '../componentes/ui/Estados';
import { BotaoLink } from '../componentes/ui/Botao';

export function RotaPrivada({ children }: { children?: ReactNode }) {
  const { carregando, sessao } = useAutenticacao();
  const local = useLocation();
  if (carregando) return <CarregandoTela />;
  if (!sessao) {
    const destino = `${local.pathname}${local.search}`;
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(destino)}`} replace />;
  }
  return children ?? <Outlet />;
}

/** Login e cadastro: quem já está logado vai direto para o app. */
export function RotaVisitante({ children }: { children?: ReactNode }) {
  const { carregando, sessao } = useAutenticacao();
  const local = useLocation();
  if (carregando) return <CarregandoTela />;
  if (sessao) {
    const voltar = new URLSearchParams(local.search).get('voltar');
    return <Navigate to={voltar && voltar.startsWith('/app') ? voltar : '/app'} replace />;
  }
  return children ?? <Outlet />;
}

export function RotaAdmin({ children }: { children?: ReactNode }) {
  const { data: admin, isPending } = useEhAdmin();
  if (isPending) return <Carregando />;
  if (!admin) {
    return (
      <EstadoVazio
        icone={<ShieldAlert aria-hidden className="size-5" />}
        titulo="Área restrita"
        descricao="Esta página é exclusiva para administradores da plataforma."
        acao={<BotaoLink to="/app">Voltar ao painel</BotaoLink>}
      />
    );
  }
  return children ?? <Outlet />;
}
