import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderizar } from '../testes/utilitarios';
import { RotaPrivada, RotaVisitante } from './Guardas';

const rotasExtras = [
  { path: '/entrar', element: <p>Tela de login</p> },
  { path: '/app', element: <p>Painel do aluno</p> },
  { path: '/app/calendario', element: <p>Calendário do aluno</p> },
];

describe('proteção de rotas', () => {
  it('manda quem não está logado para o login, lembrando o destino', async () => {
    const { roteador } = renderizar(<RotaPrivada><p>Conteúdo privado</p></RotaPrivada>, {
      caminho: '/app/disciplinas',
      rota: '/app/disciplinas?aba=1',
      logado: false,
      rotasExtras,
    });
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo privado')).toBeNull();
    expect(roteador.state.location.search).toBe(`?voltar=${encodeURIComponent('/app/disciplinas?aba=1')}`);
  });

  it('mostra a página privada para quem tem sessão', async () => {
    renderizar(<RotaPrivada><p>Conteúdo privado</p></RotaPrivada>, { caminho: '/app/disciplinas', rota: '/app/disciplinas' });
    expect(await screen.findByText('Conteúdo privado')).toBeInTheDocument();
  });

  it('leva quem já está logado do login para o app (ou para o destino pedido)', async () => {
    renderizar(<RotaVisitante><p>Formulário de login</p></RotaVisitante>, {
      caminho: '/entrar',
      rota: '/entrar?voltar=%2Fapp%2Fcalendario',
      rotasExtras: rotasExtras.slice(1),
    });
    expect(await screen.findByText('Calendário do aluno')).toBeInTheDocument();
  });

  it('ignora destinos externos no parâmetro voltar', async () => {
    renderizar(<RotaVisitante><p>Formulário de login</p></RotaVisitante>, {
      caminho: '/entrar',
      rota: '/entrar?voltar=https%3A%2F%2Fexemplo.com',
      rotasExtras: rotasExtras.slice(1),
    });
    expect(await screen.findByText('Painel do aluno')).toBeInTheDocument();
  });
});
