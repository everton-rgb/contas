import { CreditCard, KeyRound, LogOut, TriangleAlert, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Botao } from '../../componentes/ui/Botao';
import { Campo, Selecao } from '../../componentes/ui/Campos';
import { Carregando, MensagemErro } from '../../componentes/ui/Estados';
import { Modal } from '../../componentes/ui/Modal';
import { BarraProgresso, CabecalhoCartao, Cartao, TituloPagina } from '../../componentes/ui/Visuais';
import { useUsuario } from '../../contextos/Autenticacao';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { limiteDe, useAtualizarPerfil, useMeuPlano, usePerfil, useUso } from '../../hooks/useConta';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { traduzirErro } from '../../lib/erros';
import { obrigatorio, primeiro, senhaValida, tamanhoMaximo } from '../../lib/validacao';
import { definirNovaSenha, encerrarSessaoLocal, sair } from '../../servicos/auth';
import { excluirMinhaConta } from '../../servicos/perfil';

const RECURSOS = [
  { chave: 'disciplinas', rotulo: 'Disciplinas' },
  { chave: 'eventos', rotulo: 'Eventos' },
  { chave: 'conteudos', rotulo: 'Conteúdos' },
  { chave: 'tarefas', rotulo: 'Tarefas' },
  { chave: 'anotacoes', rotulo: 'Anotações' },
];

function DadosPessoais() {
  const avisos = useNotificacoes();
  const { data: perfil, isPending, isError, error, refetch } = usePerfil();
  const atualizar = useAtualizarPerfil();
  const [nome, setNome] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [curso, setCurso] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [erros, setErros] = useState<{ nome?: string; instituicao?: string; curso?: string }>({});

  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.nome);
    setInstituicao(perfil.instituicao);
    setCurso(perfil.curso);
    setPeriodo(perfil.periodo ? String(perfil.periodo) : '');
  }, [perfil]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      nome: primeiro(obrigatorio(nome, 'O nome'), tamanhoMaximo(nome, 120)),
      instituicao: tamanhoMaximo(instituicao, 120),
      curso: tamanhoMaximo(curso, 120),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    try {
      await atualizar.mutateAsync({ nome, instituicao: instituicao.trim(), curso: curso.trim(), periodo: periodo ? Number(periodo) : null });
      avisos.sucesso('Perfil atualizado.');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <Cartao>
      <CabecalhoCartao titulo="Dados pessoais" icone={<UserRound aria-hidden className="size-4" />} />
      {isPending ? (
        <Carregando />
      ) : isError ? (
        <div className="px-5 pb-5">
          <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} autoComplete="name" className="sm:col-span-2" />
          <Campo rotulo="Instituição" value={instituicao} onChange={(e) => setInstituicao(e.target.value)} erro={erros.instituicao} />
          <Campo rotulo="Curso" value={curso} onChange={(e) => setCurso(e.target.value)} erro={erros.curso} />
          <Selecao rotulo="Período atual" value={periodo} onChange={(e) => setPeriodo(e.target.value)} opcional>
            <option value="">Não informado</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}º período
              </option>
            ))}
          </Selecao>
          <div className="flex items-end justify-end sm:col-span-2">
            <Botao type="submit" carregando={atualizar.isPending}>
              Salvar alterações
            </Botao>
          </div>
        </form>
      )}
    </Cartao>
  );
}

function Seguranca() {
  const usuario = useUsuario();
  const avisos = useNotificacoes();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = { senha: senhaValida(senha), confirmacao: confirmacao !== senha ? 'As senhas não conferem.' : undefined };
    setErros(novos);
    if (novos.senha || novos.confirmacao) return;
    setEnviando(true);
    try {
      await definirNovaSenha(senha);
      setSenha('');
      setConfirmacao('');
      avisos.sucesso('Senha alterada.');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Cartao>
      <CabecalhoCartao titulo="Acesso" icone={<KeyRound aria-hidden className="size-4" />} />
      <form onSubmit={enviar} noValidate className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <Campo rotulo="E-mail" value={usuario.email ?? ''} readOnly disabled className="sm:col-span-2" />
        <Campo rotulo="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} erro={erros.senha} />
        <Campo
          rotulo="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erros.confirmacao}
        />
        <div className="flex justify-end sm:col-span-2">
          <Botao type="submit" variante="secundario" carregando={enviando}>
            Alterar senha
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}

function PlanoAtual() {
  const { data: plano, isPending } = useMeuPlano();
  const { data: uso } = useUso();

  return (
    <Cartao>
      <CabecalhoCartao titulo="Plano" icone={<CreditCard aria-hidden className="size-4" />} />
      <div className="px-5 pb-5">
        {isPending ? (
          <Carregando />
        ) : (
          <>
            <p className="font-serif text-xl font-semibold">{plano?.nome ?? 'Gratuito'}</p>
            {plano?.descricao && <p className="mt-0.5 text-sm text-stone-500">{plano.descricao}</p>}
            <dl className="mt-4 space-y-3">
              {RECURSOS.map(({ chave, rotulo }) => {
                const limite = limiteDe(plano?.limites, chave);
                const usado = uso?.[chave] ?? 0;
                return (
                  <div key={chave}>
                    <div className="flex justify-between text-sm">
                      <dt className="text-stone-600">{rotulo}</dt>
                      <dd className="font-medium text-stone-800">{limite === null ? `${usado} · sem limite` : `${usado} de ${limite}`}</dd>
                    </div>
                    {limite !== null && (
                      <div className="mt-1">
                        <BarraProgresso percentual={(usado / limite) * 100} rotulo={`${rotulo}: ${usado} de ${limite}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </dl>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              O plano é definido pelo servidor a partir da sua assinatura. Planos pagos ainda não estão disponíveis.
            </p>
          </>
        )}
      </div>
    </Cartao>
  );
}

function ExcluirConta() {
  const navegar = useNavigate();
  const avisos = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true);
    try {
      await excluirMinhaConta();
      // Sai da área privada antes de encerrar a sessão, senão a guarda de
      // rota redirecionaria para o login.
      navegar('/', { replace: true });
      await encerrarSessaoLocal();
      avisos.sucesso('Sua conta e todos os seus dados foram excluídos.');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
      setExcluindo(false);
    }
  }

  return (
    <Cartao className="border-red-200">
      <CabecalhoCartao titulo="Excluir conta" icone={<TriangleAlert aria-hidden className="size-4 text-red-600" />} />
      <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-stone-600">
          Remove permanentemente sua conta e todos os seus dados: disciplinas, calendário, conteúdos, tarefas e anotações.
        </p>
        <Botao variante="perigo" onClick={() => setAberto(true)}>
          Excluir minha conta
        </Botao>
      </div>
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Excluir conta definitivamente?"
        largura="sm"
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" disabled={confirmacao !== 'EXCLUIR'} carregando={excluindo} onClick={excluir}>
              Excluir tudo
            </Botao>
          </>
        }
      >
        <p className="mb-4 text-sm leading-6 text-stone-600">
          Esta ação não pode ser desfeita. Para confirmar, digite <strong>EXCLUIR</strong> abaixo.
        </p>
        <Campo rotulo="Confirmação" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" />
      </Modal>
    </Cartao>
  );
}

export function Perfil() {
  useTituloPagina('Perfil e configurações');
  const navegar = useNavigate();
  const avisos = useNotificacoes();

  async function sairDaConta() {
    try {
      await sair();
      navegar('/entrar', { replace: true });
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <>
      <TituloPagina
        titulo="Perfil e configurações"
        acoes={
          <Botao variante="secundario" icone={<LogOut aria-hidden className="size-4" />} onClick={sairDaConta}>
            Sair da conta
          </Botao>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <DadosPessoais />
          <Seguranca />
        </div>
        <div className="space-y-4">
          <PlanoAtual />
          <ExcluirConta />
        </div>
      </div>
    </>
  );
}
