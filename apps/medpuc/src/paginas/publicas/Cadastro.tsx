import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alerta, LayoutAutenticacao } from '../../componentes/layout/LayoutAutenticacao';
import { Botao } from '../../componentes/ui/Botao';
import { Campo } from '../../componentes/ui/Campos';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { traduzirErro } from '../../lib/erros';
import { emailValido, obrigatorio, primeiro, senhaValida, tamanhoMaximo } from '../../lib/validacao';
import { cadastrar, reenviarConfirmacao } from '../../servicos/auth';

type Erros = { nome?: string; email?: string; senha?: string; confirmacao?: string };

export function Cadastro() {
  useTituloPagina('Criar conta');
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novos: Erros = {
      nome: primeiro(obrigatorio(nome, 'O nome'), tamanhoMaximo(nome, 120)),
      email: emailValido(email),
      senha: senhaValida(senha),
      confirmacao: confirmacao !== senha ? 'As senhas não conferem.' : undefined,
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;

    setEnviando(true);
    setErro(null);
    try {
      const { precisaConfirmarEmail } = await cadastrar({ nome, email, senha });
      if (precisaConfirmarEmail) setAguardandoConfirmacao(true);
      else navegar('/app/configuracao', { replace: true });
    } catch (e) {
      setErro(traduzirErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    try {
      await reenviarConfirmacao(email);
      setReenviado(true);
    } catch (e) {
      setErro(traduzirErro(e));
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <LayoutAutenticacao titulo="Confirme seu e-mail">
        <div className="space-y-4 text-sm leading-6 text-stone-600">
          <div className="flex size-12 items-center justify-center rounded-full bg-vinho-50 text-vinho-600">
            <MailCheck aria-hidden className="size-6" />
          </div>
          <p>
            Enviamos um link de confirmação para <strong className="text-stone-800">{email}</strong>. Abra o e-mail e
            clique no link para ativar sua conta.
          </p>
          <p className="text-stone-500">Não encontrou? Verifique a caixa de spam ou promoções.</p>
          {erro && <Alerta tipo="erro">{erro}</Alerta>}
          {reenviado && <Alerta tipo="sucesso">Enviamos um novo link.</Alerta>}
          <div className="flex flex-wrap gap-2 pt-2">
            <Botao variante="secundario" onClick={reenviar}>
              Reenviar e-mail
            </Botao>
            <Link to="/entrar" className="inline-flex h-10 items-center px-2 text-sm font-medium text-vinho-700 hover:underline">
              Ir para o login
            </Link>
          </div>
        </div>
      </LayoutAutenticacao>
    );
  }

  return (
    <LayoutAutenticacao
      titulo="Criar sua conta"
      subtitulo={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-vinho-700 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Campo rotulo="Nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} />
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.senha}
          dica="Mínimo de 8 caracteres, com letras e números."
        />
        <Campo
          rotulo="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erros.confirmacao}
        />
        <Botao type="submit" className="w-full" tamanho="lg" carregando={enviando}>
          Criar conta
        </Botao>
        <p className="text-center text-xs leading-5 text-stone-500">
          Seus dados são privados: cada conta só acessa as próprias informações.
        </p>
      </form>
    </LayoutAutenticacao>
  );
}
