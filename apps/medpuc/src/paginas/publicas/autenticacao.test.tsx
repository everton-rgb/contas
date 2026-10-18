import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderizar } from '../../testes/utilitarios';
import { Cadastro } from './Cadastro';
import { Entrar } from './Entrar';
import { RecuperarSenha } from './RecuperarSenha';

const auth = vi.hoisted(() => ({
  cadastrar: vi.fn(),
  entrar: vi.fn(),
  reenviarConfirmacao: vi.fn(),
  solicitarRedefinicaoSenha: vi.fn(),
}));
vi.mock('../../servicos/auth', () => auth);

beforeEach(() => vi.clearAllMocks());

describe('cadastro', () => {
  it('valida os campos antes de enviar', async () => {
    renderizar(<Cadastro />, { logado: false });
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByText('O nome é obrigatório.')).toBeInTheDocument();
    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe uma senha.')).toBeInTheDocument();
    expect(auth.cadastrar).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Senha'), 'abc12345');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'abc12346');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
  });

  it('pede confirmação de e-mail quando o Supabase exige', async () => {
    auth.cadastrar.mockResolvedValue({ precisaConfirmarEmail: true });
    renderizar(<Cadastro />, { logado: false });
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Beatriz');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@pucpr.edu.br');
    await userEvent.type(screen.getByLabelText('Senha'), 'abc12345');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'abc12345');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(auth.cadastrar).toHaveBeenCalledWith({ nome: 'Ana Beatriz', email: 'ana@pucpr.edu.br', senha: 'abc12345' });
    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument();
    expect(screen.getByText('ana@pucpr.edu.br')).toBeInTheDocument();
  });
});

describe('login', () => {
  it('mostra o erro traduzido', async () => {
    auth.entrar.mockRejectedValue({ code: 'invalid_credentials', message: 'Invalid login credentials' });
    renderizar(<Entrar />, { logado: false });
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@pucpr.edu.br');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('volta para a página pedida depois de entrar', async () => {
    auth.entrar.mockResolvedValue(undefined);
    const { roteador } = renderizar(<Entrar />, {
      logado: false,
      caminho: '/entrar',
      rota: '/entrar?voltar=%2Fapp%2Ftarefas',
      rotasExtras: [{ path: '/app/tarefas', element: <p>Tarefas</p> }],
    });
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@pucpr.edu.br');
    await userEvent.type(screen.getByLabelText('Senha'), 'certa1234');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Tarefas')).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/app/tarefas');
  });
});

describe('recuperação de senha', () => {
  it('confirma o envio sem revelar se a conta existe', async () => {
    auth.solicitarRedefinicaoSenha.mockResolvedValue(undefined);
    renderizar(<RecuperarSenha />, { logado: false });
    await userEvent.type(screen.getByLabelText('E-mail'), 'quem@pucpr.edu.br');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(auth.solicitarRedefinicaoSenha).toHaveBeenCalledWith('quem@pucpr.edu.br');
    expect(await screen.findByText(/Se existir uma conta/)).toBeInTheDocument();
  });
});
