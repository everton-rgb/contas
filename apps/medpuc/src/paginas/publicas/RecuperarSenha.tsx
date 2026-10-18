import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Alerta, LayoutAutenticacao } from '../../componentes/layout/LayoutAutenticacao';
import { Botao } from '../../componentes/ui/Botao';
import { Campo } from '../../componentes/ui/Campos';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { traduzirErro } from '../../lib/erros';
import { emailValido } from '../../lib/validacao';
import { solicitarRedefinicaoSenha } from '../../servicos/auth';

export function RecuperarSenha() {
  useTituloPagina('Recuperar senha');
  const [email, setEmail] = useState('');
  const [erroCampo, setErroCampo] = useState<string>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const invalido = emailValido(email);
    setErroCampo(invalido);
    if (invalido) return;
    setEnviando(true);
    setErro(null);
    try {
      await solicitarRedefinicaoSenha(email);
      setEnviado(true);
    } catch (e) {
      setErro(traduzirErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutAutenticacao
      titulo="Recuperar senha"
      subtitulo="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
    >
      {enviado ? (
        <div className="space-y-4">
          <Alerta tipo="sucesso">
            Se existir uma conta para <strong>{email}</strong>, você receberá um e-mail com o link de redefinição em
            alguns instantes. O link vale por tempo limitado.
          </Alerta>
          <Link to="/entrar" className="inline-block text-sm font-medium text-vinho-700 hover:underline">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-4">
          {erro && <Alerta tipo="erro">{erro}</Alerta>}
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erroCampo}
          />
          <Botao type="submit" className="w-full" tamanho="lg" carregando={enviando}>
            Enviar link
          </Botao>
          <Link to="/entrar" className="block text-center text-sm text-stone-500 hover:text-stone-800">
            Lembrei a senha
          </Link>
        </form>
      )}
    </LayoutAutenticacao>
  );
}
