/**
 * Página de uma anotação (geral ou de disciplina) com salvamento automático.
 *
 * Em /app/anotacoes/nova o registro só é criado no primeiro salvamento:
 * abrir e desistir não deixa anotações vazias para trás. Depois de criado,
 * o endereço passa a ser o da anotação sem recriar o editor (mesma `key`).
 *
 * Carregada sob demanda: o editor é a parte mais pesada do app.
 */

import { useQueryClient } from '@tanstack/react-query';
import type { JSONContent } from '@tiptap/react';
import { ArrowLeft, CircleAlert, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { EditorTexto } from '../../componentes/anotacoes/EditorTexto';
import { IndicadorSalvamento } from '../../componentes/anotacoes/IndicadorSalvamento';
import { Botao, BotaoIcone } from '../../componentes/ui/Botao';
import { SelecaoCompacta } from '../../componentes/ui/Campos';
import { Confirmacao } from '../../componentes/ui/Confirmacao';
import { Carregando, EstadoVazio, MensagemErro } from '../../componentes/ui/Estados';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { chaves } from '../../hooks/chaves';
import { useAnotacao, useExcluirAnotacao } from '../../hooks/useAnotacoes';
import { useDisciplinas } from '../../hooks/useDisciplinas';
import { useSalvamentoAutomatico } from '../../hooks/useSalvamentoAutomatico';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { formatarDataCurta, hojeISO } from '../../lib/datas';
import { traduzirErro } from '../../lib/erros';
import { criarAnotacao, DOCUMENTO_VAZIO, salvarAnotacao, type ConteudoAnotacao } from '../../servicos/anotacoes';
import type { Json } from '../../tipos/banco';
import type { Anotacao, EstadoNavegacaoAnotacao } from '../../tipos/dominio';

function Editor({ anotacao, aoRecarregar }: { anotacao: Anotacao | null; aoRecarregar: () => void }) {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const avisos = useNotificacoes();
  const estadoNavegacao = useLocation().state as EstadoNavegacaoAnotacao;
  const { data: disciplinas = [] } = useDisciplinas();
  const excluir = useExcluirAnotacao();

  const [titulo, setTitulo] = useState(anotacao?.titulo ?? '');
  const [disciplinaId, setDisciplinaId] = useState(anotacao?.disciplina_id ?? estadoNavegacao?.disciplinaId ?? '');
  const [confirmando, setConfirmando] = useState(false);
  useTituloPagina(titulo || 'Nova anotação');

  const id = useRef<string | null>(anotacao?.id ?? null);
  const versao = useRef<string | null>(anotacao?.updated_at ?? null);
  const atual = useRef<ConteudoAnotacao>({
    titulo: anotacao?.titulo ?? '',
    conteudo: anotacao?.conteudo ?? DOCUMENTO_VAZIO,
    texto: anotacao?.texto ?? '',
    disciplina_id: anotacao?.disciplina_id ?? estadoNavegacao?.disciplinaId ?? null,
  });
  const removida = useRef(false);

  const salvar = useCallback(
    async (valor: ConteudoAnotacao) => {
      if (removida.current) return 'salvo' as const;

      if (!id.current) {
        const criada = await criarAnotacao(valor);
        id.current = criada.id;
        versao.current = criada.updated_at;
        cliente.setQueryData(chaves.anotacao(criada.id), criada);
        cliente.invalidateQueries({ queryKey: ['anotacoes', 'busca'] });
        cliente.invalidateQueries({ queryKey: chaves.uso });
        navegar(`/app/anotacoes/${criada.id}`, {
          replace: true,
          state: { ...estadoNavegacao, rascunho: estadoNavegacao?.rascunho ?? 'nova' },
        });
        return 'salvo' as const;
      }

      const resultado = await salvarAnotacao(id.current, valor, versao.current);
      if (resultado.situacao === 'salvo') {
        versao.current = resultado.versao;
        cliente.setQueryData<Anotacao | null>(chaves.anotacao(id.current), (a) =>
          a ? { ...a, ...valor, titulo: valor.titulo.trim() || 'Sem título', updated_at: resultado.versao } : a,
        );
        cliente.invalidateQueries({ queryKey: ['anotacoes', 'busca'] });
      }
      return resultado.situacao;
    },
    [cliente, navegar, estadoNavegacao],
  );

  const salvamento = useSalvamentoAutomatico<ConteudoAnotacao>({ salvar });

  function alterar(parcial: Partial<ConteudoAnotacao>) {
    atual.current = { ...atual.current, ...parcial };
    salvamento.agendar(atual.current);
  }

  const voltar = estadoNavegacao?.voltar ?? '/app/anotacoes';

  async function confirmarExclusao() {
    removida.current = true;
    if (!id.current) {
      navegar(voltar, { replace: true });
      return;
    }
    try {
      await excluir.mutateAsync(id.current);
      avisos.sucesso('Anotação excluída.');
      navegar(voltar, { replace: true });
    } catch (erro) {
      removida.current = false;
      avisos.erro(traduzirErro(erro));
    }
  }

  async function manterMinhaVersao() {
    versao.current = null;
    await salvamento.retomar(true);
  }

  async function carregarVersaoSalva() {
    await salvamento.retomar(false);
    aoRecarregar();
  }

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <Link
          to={voltar}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
        >
          <ArrowLeft aria-hidden className="size-4" /> Voltar
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <IndicadorSalvamento
            estado={salvamento.estado}
            salvoEm={salvamento.salvoEm}
            mensagemErro={salvamento.mensagemErro}
            aoTentarNovamente={() => void salvamento.salvarAgora()}
          />
          <BotaoIcone rotulo="Excluir anotação" onClick={() => setConfirmando(true)} className="hover:text-red-600">
            <Trash2 aria-hidden className="size-4" />
          </BotaoIcone>
        </div>
      </div>

      {salvamento.estado === 'conflito' && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center"
        >
          <CircleAlert aria-hidden className="size-5 shrink-0" />
          <p className="flex-1">Esta anotação foi alterada em outro dispositivo ou aba depois que você a abriu.</p>
          <div className="flex gap-2">
            <Botao tamanho="sm" variante="secundario" onClick={carregarVersaoSalva}>
              Carregar versão salva
            </Botao>
            <Botao tamanho="sm" onClick={manterMinhaVersao}>
              Manter a minha
            </Botao>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200/80 bg-white px-5 py-6 shadow-cartao sm:px-10 sm:py-8">
        <label htmlFor="titulo-anotacao" className="sr-only">
          Título da anotação
        </label>
        <input
          id="titulo-anotacao"
          value={titulo}
          onChange={(e) => {
            setTitulo(e.target.value);
            alterar({ titulo: e.target.value });
          }}
          maxLength={200}
          placeholder="Título da anotação"
          autoFocus={!anotacao}
          className="w-full border-none bg-transparent font-serif text-2xl font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none sm:text-3xl"
        />
        <div className="mt-3 mb-6 flex flex-wrap items-center gap-3 border-b border-stone-100 pb-4 text-xs text-stone-500">
          <SelecaoCompacta
            rotulo="Disciplina da anotação"
            value={disciplinaId}
            onChange={(e) => {
              setDisciplinaId(e.target.value);
              alterar({ disciplina_id: e.target.value || null });
            }}
            className="h-8 text-xs"
          >
            <option value="">Anotação geral</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </SelecaoCompacta>
          <span>Criada em {formatarDataCurta(anotacao?.created_at.slice(0, 10) ?? hojeISO())}</span>
        </div>
        <EditorTexto
          conteudoInicial={(anotacao?.conteudo ?? DOCUMENTO_VAZIO) as JSONContent}
          aoMudar={(documento, texto) => alterar({ conteudo: documento as NonNullable<Json>, texto })}
        />
      </div>

      <Confirmacao
        aberto={confirmando}
        titulo={id.current ? 'Excluir anotação?' : 'Descartar anotação?'}
        mensagem={
          id.current
            ? 'A anotação será excluída permanentemente de todos os seus dispositivos.'
            : 'O que você escreveu ainda não foi salvo e será descartado.'
        }
        rotuloConfirmar={id.current ? 'Excluir' : 'Descartar'}
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setConfirmando(false)}
      />
    </article>
  );
}

export default function PaginaAnotacao() {
  const { id = '' } = useParams();
  const estado = useLocation().state as EstadoNavegacaoAnotacao;
  const cliente = useQueryClient();
  const nova = id === 'nova';
  const { data: anotacao, isPending, isError, error, refetch } = useAnotacao(nova ? null : id);
  const [geracao, setGeracao] = useState(0);

  if (!nova) {
    if (isPending) return <Carregando rotulo="Abrindo anotação…" />;
    if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;
    if (!anotacao) {
      return (
        <EstadoVazio
          titulo="Anotação não encontrada"
          descricao="Ela pode ter sido excluída."
          acao={
            <Link to="/app/anotacoes" className="text-sm font-medium text-vinho-700 hover:underline">
              Ver minhas anotações
            </Link>
          }
        />
      );
    }
  }

  // Mesma posição e mesma `key` ao trocar /nova pelo id criado: o editor
  // continua montado e o cursor não sai do lugar.
  return (
    <Editor
      key={`${estado?.rascunho ?? id}:${geracao}`}
      anotacao={nova ? null : (anotacao ?? null)}
      aoRecarregar={async () => {
        await cliente.refetchQueries({ queryKey: chaves.anotacao(id) });
        setGeracao((g) => g + 1);
      }}
    />
  );
}
