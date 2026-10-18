import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { LayoutApp } from './componentes/layout/LayoutApp';
import { Anotacoes } from './paginas/app/Anotacoes';
import { Calendario } from './paginas/app/Calendario';
import { ConfiguracaoInicial } from './paginas/app/ConfiguracaoInicial';
import { AbaAnotacoes, AbaAvaliacoes, AbaConteudos, AbaTarefas, AbaVisaoGeral } from './paginas/app/disciplina/Abas';
import { PaginaDisciplina } from './paginas/app/disciplina/PaginaDisciplina';
import { Disciplinas } from './paginas/app/Disciplinas';
import { Painel } from './paginas/app/Painel';
import { Perfil } from './paginas/app/Perfil';
import { Tarefas } from './paginas/app/Tarefas';
import { Cadastro } from './paginas/publicas/Cadastro';
import { Entrar } from './paginas/publicas/Entrar';
import { Inicio } from './paginas/publicas/Inicio';
import { NaoEncontrada } from './paginas/publicas/NaoEncontrada';
import { PaginaPlanos } from './paginas/publicas/PaginaPlanos';
import { RecuperarSenha } from './paginas/publicas/RecuperarSenha';
import { RedefinirSenha } from './paginas/publicas/RedefinirSenha';
import { RotaAdmin, RotaPrivada, RotaVisitante } from './rotas/Guardas';

const Anotacao = lazy(() => import('./paginas/app/Anotacao'));
const Administracao = lazy(() => import('./paginas/admin/Administracao'));

export const rotas = [
  { path: '/', element: <Inicio /> },
  { path: '/planos', element: <PaginaPlanos /> },
  {
    element: <RotaVisitante />,
    children: [
      { path: '/entrar', element: <Entrar /> },
      { path: '/cadastro', element: <Cadastro /> },
    ],
  },
  { path: '/recuperar-senha', element: <RecuperarSenha /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },
  {
    path: '/app',
    element: (
      <RotaPrivada>
        <LayoutApp />
      </RotaPrivada>
    ),
    children: [
      { index: true, element: <Painel /> },
      { path: 'calendario', element: <Calendario /> },
      { path: 'disciplinas', element: <Disciplinas /> },
      {
        path: 'disciplinas/:id',
        element: <PaginaDisciplina />,
        children: [
          { index: true, element: <AbaVisaoGeral /> },
          { path: 'conteudos', element: <AbaConteudos /> },
          { path: 'avaliacoes', element: <AbaAvaliacoes /> },
          { path: 'anotacoes', element: <AbaAnotacoes /> },
          { path: 'tarefas', element: <AbaTarefas /> },
        ],
      },
      { path: 'anotacoes', element: <Anotacoes /> },
      { path: 'anotacoes/:id', element: <Anotacao /> },
      { path: 'tarefas', element: <Tarefas /> },
      { path: 'configuracao', element: <ConfiguracaoInicial /> },
      { path: 'perfil', element: <Perfil /> },
      {
        path: 'admin',
        element: (
          <RotaAdmin>
            <Administracao />
          </RotaAdmin>
        ),
      },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
  { path: '*', element: <NaoEncontrada /> },
];

const roteador = createBrowserRouter(rotas);

export function App() {
  return <RouterProvider router={roteador} />;
}
