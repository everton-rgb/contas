import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Alerta, LayoutAutenticacao } from '../../componentes/layout/LayoutAutenticacao';
import { Botao } from '../../componentes/ui/Botao';
import { Campo } from '../../componentes/ui/Campos';
import { ErroApp, traduzirErro } from '../../lib/erros';
import { emailValido } from '../../lib/validacao';
import { entrar, reenviarConfirmacao } from '../../servicos/auth';
import { useTituloPagina } from '../../hooks/useUtilitarios';

export function Entrar() {
  useTituloPagina('Entrar');
  const navegar = useNavigate();
  const local = useLocation();
  const [parametros] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>((local.state as { aviso?: string } | null)?.aviso ?? null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novos = { email: emailValido(email), senha: senha ? undefined : 'Informe sua senha.' };
    setErros(novos);
    if (novos.email || novos.senha) return;

    setEnviando(true);
    setErro(null);
    setNaoConfirmado(false);
    try {
      await entrar(email, senha);
      const voltar = parametros.get('voltar');
      navegar(voltar && voltar.startsWith('/app') ? voltar : '/app', { replace: true });
    } catch (e) {
      setErro(traduzirErro(e));
      setNaoConfirmado(e instanceof ErroApp && e.codigo === 'email_not_confirmed');
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    try {
      await reenviarConfirmacao(email);
      setErro(null);
      setNaoConfirmado(false);
      setAviso(`Enviamos um novo link de confirmação para ${email}.`);
    } catch (e) {
      setErro(traduzirErro(e));
    }
  }

  return (
    <LayoutAutenticacao
      titulo="Entrar"
      subtitulo={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-vinho-700 hover:underline">
            Crie a sua gratuitamente
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="space-y-4">
        {aviso && <Alerta tipo="sucesso">{aviso}</Alerta>}
        {erro && (
          <Alerta tipo="erro">
            {erro}
            {naoConfirmado && (
              <button type="button" onClick={reenviar} className="mt-1 block font-medium underline">
                Reenviar e-mail de confirmação
              </button>
            )}
          </Alerta>
        )}
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erros.email}
        />
        <div>
          <Campo
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            erro={erros.senha}
          />
          <Link to="/recuperar-senha" className="mt-2 inline-block text-sm text-vinho-700 hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Botao type="submit" className="w-full" tamanho="lg" carregando={enviando}>
          Entrar
        </Botao>
      </form>
    </LayoutAutenticacao>
  );
}
