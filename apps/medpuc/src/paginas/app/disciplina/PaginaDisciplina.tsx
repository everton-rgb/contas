import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router';
import { FormularioDisciplina } from '../../../componentes/disciplinas/FormularioDisciplina';
import { Botao } from '../../../componentes/ui/Botao';
import { Confirmacao } from '../../../componentes/ui/Confirmacao';
import { Carregando, EstadoVazio, MensagemErro } from '../../../componentes/ui/Estados';
import { useNotificacoes } from '../../../contextos/Notificacoes';
import { useDisciplinas, useExcluirDisciplina } from '../../../hooks/useDisciplinas';
import { useTituloPagina } from '../../../hooks/useUtilitarios';
import { comTransparencia } from '../../../lib/cores';
import { traduzirErro } from '../../../lib/erros';
import type { Disciplina } from '../../../tipos/dominio';

const ABAS = [
  { para: '', rotulo: 'Visão geral' },
  { para: 'conteudos', rotulo: 'Conteúdos' },
  { para: 'avaliacoes', rotulo: 'Avaliações e datas' },
  { para: 'anotacoes', rotulo: 'Anotações' },
  { para: 'tarefas', rotulo: 'Tarefas' },
];

export function useDisciplinaAtual(): Disciplina {
  return useOutletContext<{ disciplina: Disciplina }>().disciplina;
}

export function PaginaDisciplina() {
  const { id } = useParams();
  const navegar = useNavigate();
  const avisos = useNotificacoes();
  const { data: disciplinas, isPending, isError, error, refetch } = useDisciplinas();
  const excluir = useExcluirDisciplina();
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const disciplina = disciplinas?.find((d) => d.id === id);
  useTituloPagina(disciplina?.nome ?? 'Disciplina');

  if (isPending) return <Carregando />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;
  if (!disciplina) {
    return (
      <EstadoVazio
        titulo="Disciplina não encontrada"
        descricao="Ela pode ter sido removida da sua organização."
        acao={
          <Link to="/app/disciplinas" className="text-sm font-medium text-vinho-700 hover:underline">
            Ver minhas disciplinas
          </Link>
        }
      />
    );
  }

  async function confirmarExclusao() {
    try {
      await excluir.mutateAsync(disciplina!.id);
      avisos.sucesso('Disciplina removida.');
      navegar('/app/disciplinas', { replace: true });
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <>
      <Link
        to="/app/disciplinas"
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
      >
        <ArrowLeft aria-hidden className="size-4" /> Minhas disciplinas
      </Link>

      <header
        className="mb-6 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-cartao"
        style={{ backgroundImage: `linear-gradient(120deg, ${comTransparencia(disciplina.cor, 0.1)}, transparent 60%)` }}
      >
        <div className="h-1.5" style={{ backgroundColor: disciplina.cor }} aria-hidden />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{disciplina.nome}</h1>
            {disciplina.professor && <p className="mt-1 text-sm text-stone-500">{disciplina.professor}</p>}
          </div>
          <div className="flex gap-2">
            <Botao variante="secundario" icone={<Pencil aria-hidden className="size-4" />} onClick={() => setEditando(true)}>
              Editar
            </Botao>
            <Botao
              variante="secundario"
              className="text-red-600 hover:text-red-700"
              icone={<Trash2 aria-hidden className="size-4" />}
              onClick={() => setExcluindo(true)}
            >
              Remover
            </Botao>
          </div>
        </div>
        <nav aria-label="Seções da disciplina" className="-mb-px flex gap-1 overflow-x-auto border-t border-stone-100 px-3">
          {ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={aba.para}
              end
              className={({ isActive }) =>
                `shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'border-vinho-600 text-vinho-700' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`
              }
            >
              {aba.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>

      <Outlet context={{ disciplina }} />

      <FormularioDisciplina aberto={editando} disciplina={disciplina} aoFechar={() => setEditando(false)} />
      <Confirmacao
        aberto={excluindo}
        titulo={`Remover ${disciplina.nome}?`}
        mensagem="Os conteúdos, avaliações e tarefas desta disciplina serão excluídos. Suas anotações serão mantidas em Minhas anotações, como anotações gerais."
        rotuloConfirmar="Remover disciplina"
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(false)}
      />
    </>
  );
}
