import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alerta, LayoutAutenticacao } from '../../componentes/layout/LayoutAutenticacao';
import { Botao } from '../../componentes/ui/Botao';
import { Campo } from '../../componentes/ui/Campos';
import { CarregandoTela } from '../../componentes/ui/Estados';
import { useAutenticacao } from '../../contextos/Autenticacao';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { traduzirErro } from '../../lib/erros';
import { senhaValida } from '../../lib/validacao';
import { definirNovaSenha, erroDaUrl } from '../../servicos/auth';

/**
 * Destino do link de redefinição. O cliente do Supabase lê o token do
 * endereço e abre uma sessão temporária; aqui o aluno define a nova senha.
 */
export function RedefinirSenha() {
  useTituloPagina('Nova senha');
  const { carregando, sessao } = useAutenticacao();
  const navegar = useNavigate();
  const [erroLink] = useState(() => erroDaUrl());
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const novos = {
      senha: senhaValida(senha),
      confirmacao: confirmacao !== senha ? 'As senhas não conferem.' : undefined,
    };
    setErros(novos);
    if (novos.senha || novos.confirmacao) return;
    setEnviando(true);
    setErro(null);
    try {
      await definirNovaSenha(senha);
      navegar('/app', { replace: true });
    } catch (e) {
      setErro(traduzirErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <CarregandoTela />;

  if (erroLink || !sessao) {
    return (
      <LayoutAutenticacao titulo="Link inválido">
        <div className="space-y-4">
          <Alerta tipo="erro">{erroLink ?? 'Este link de redefinição é inválido ou expirou. Solicite um novo.'}</Alerta>
          <Link to="/recuperar-senha" className="inline-block text-sm font-medium text-vinho-700 hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </LayoutAutenticacao>
    );
  }

  return (
    <LayoutAutenticacao titulo="Criar nova senha" subtitulo={`Conta: ${sessao.user.email ?? ''}`}>
      <form onSubmit={enviar} noValidate className="space-y-4">
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Campo
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          erro={erros.senha}
          dica="Mínimo de 8 caracteres, com letras e números."
        />
        <Campo
          rotulo="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erros.confirmacao}
        />
        <Botao type="submit" className="w-full" tamanho="lg" carregando={enviando}>
          Salvar nova senha
        </Botao>
      </form>
    </LayoutAutenticacao>
  );
}
