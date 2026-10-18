import { ArrowDown, ArrowUp, BookMarked, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import {
  useAlterarStatusConteudo,
  useConteudosDaDisciplina,
  useExcluirConteudo,
  useReordenarConteudos,
  useSalvarConteudo,
} from '../../hooks/useConteudos';
import { formatarData, hojeISO } from '../../lib/datas';
import { traduzirErro } from '../../lib/erros';
import { calcularProgresso } from '../../lib/resumo';
import { dataOpcionalValida, obrigatorio, primeiro, tamanhoMaximo } from '../../lib/validacao';
import { STATUS_CONTEUDO, type Conteudo, type StatusConteudo } from '../../tipos/dominio';
import { Botao, BotaoIcone } from '../ui/Botao';
import { AreaTexto, Campo, Selecao } from '../ui/Campos';
import { Confirmacao } from '../ui/Confirmacao';
import { EstadoVazio, EsqueletoLista, MensagemErro } from '../ui/Estados';
import { Modal } from '../ui/Modal';
import { BarraProgresso } from '../ui/Visuais';

const ESTILO_STATUS: Record<StatusConteudo, string> = {
  nao_iniciado: 'border-stone-200 bg-white text-stone-600',
  em_andamento: 'border-sky-200 bg-sky-50 text-sky-800',
  concluido: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

function FormularioConteudo({
  aberto,
  conteudo,
  disciplinaId,
  aoFechar,
}: {
  aberto: boolean;
  conteudo: Conteudo | null;
  disciplinaId: string;
  aoFechar: () => void;
}) {
  const avisos = useNotificacoes();
  const salvar = useSalvarConteudo();
  const [titulo, setTitulo] = useState(conteudo?.titulo ?? '');
  const [data, setData] = useState(conteudo?.data_prevista ?? '');
  const [status, setStatus] = useState<StatusConteudo>(conteudo?.status ?? 'nao_iniciado');
  const [observacoes, setObservacoes] = useState(conteudo?.observacoes ?? '');
  const [erros, setErros] = useState<{ titulo?: string; data?: string; observacoes?: string }>({});

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      titulo: primeiro(obrigatorio(titulo, 'O nome do conteúdo'), tamanhoMaximo(titulo, 200)),
      data: dataOpcionalValida(data),
      observacoes: tamanhoMaximo(observacoes, 4000),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    try {
      await salvar.mutateAsync({
        id: conteudo?.id,
        dados: { titulo, disciplina_id: disciplinaId, data_prevista: data || null, status, observacoes },
      });
      avisos.sucesso(conteudo ? 'Conteúdo atualizado.' : 'Conteúdo adicionado.');
      aoFechar();
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={conteudo ? 'Editar conteúdo' : 'Novo conteúdo'}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-conteudo" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-conteudo" onSubmit={enviar} noValidate className="space-y-4">
        <Campo rotulo="Conteúdo" value={titulo} onChange={(e) => setTitulo(e.target.value)} erro={erros.titulo} data-autofoco />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Estudar em" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} opcional />
          <Selecao rotulo="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusConteudo)}>
            {STATUS_CONTEUDO.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
        </div>
        <AreaTexto rotulo="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} erro={erros.observacoes} opcional />
      </form>
    </Modal>
  );
}

export function ListaConteudos({ disciplinaId, cor }: { disciplinaId: string; cor: string }) {
  const avisos = useNotificacoes();
  const { data: conteudos, isPending, isError, error, refetch } = useConteudosDaDisciplina(disciplinaId);
  const salvar = useSalvarConteudo();
  const alterarStatus = useAlterarStatusConteudo();
  const reordenar = useReordenarConteudos();
  const excluir = useExcluirConteudo();
  const [novo, setNovo] = useState('');
  const [editando, setEditando] = useState<{ aberto: boolean; conteudo: Conteudo | null }>({ aberto: false, conteudo: null });
  const [excluindo, setExcluindo] = useState<Conteudo | null>(null);
  const hoje = hojeISO();

  async function adicionarRapido(e: FormEvent) {
    e.preventDefault();
    const titulo = novo.trim();
    if (!titulo) return;
    try {
      await salvar.mutateAsync({ dados: { titulo: titulo.slice(0, 200), disciplina_id: disciplinaId } });
      setNovo('');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  function mover(indice: number, direcao: -1 | 1) {
    if (!conteudos) return;
    const ids = conteudos.map((c) => c.id);
    const alvo = indice + direcao;
    [ids[indice], ids[alvo]] = [ids[alvo], ids[indice]];
    reordenar.mutate(ids, { onError: (erro) => avisos.erro(traduzirErro(erro)) });
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      avisos.sucesso('Conteúdo excluído.');
      setExcluindo(null);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  if (isPending) return <EsqueletoLista linhas={4} />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;

  const progresso = calcularProgresso(conteudos ?? []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-cartao">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="font-medium text-stone-800">Progresso da disciplina</span>
          <span className="text-stone-500">
            {progresso.concluidos} de {progresso.total} concluídos · {progresso.emAndamento} em andamento
          </span>
        </div>
        <BarraProgresso percentual={progresso.percentual} cor={cor} rotulo="Progresso de conteúdos" />
      </div>

      <form onSubmit={adicionarRapido} className="flex gap-2">
        <label htmlFor="novo-conteudo" className="sr-only">
          Novo conteúdo
        </label>
        <input
          id="novo-conteudo"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Adicionar conteúdo (ex.: Vias da dor e analgesia)"
          className="h-10 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm shadow-sm placeholder:text-stone-400 focus:border-vinho-500 focus:ring-2 focus:ring-vinho-100 focus:outline-none"
        />
        <Botao type="submit" carregando={salvar.isPending} icone={<Plus aria-hidden className="size-4" />}>
          <span className="hidden sm:inline">Adicionar</span>
        </Botao>
      </form>

      {!conteudos?.length ? (
        <EstadoVazio
          compacto
          icone={<BookMarked aria-hidden className="size-5" />}
          titulo="Nenhum conteúdo cadastrado"
          descricao="Liste os assuntos da disciplina para acompanhar o que já foi estudado."
        />
      ) : (
        <ol className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white shadow-cartao">
          {conteudos.map((conteudo, i) => (
            <li key={conteudo.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${conteudo.status === 'concluido' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                  {conteudo.titulo}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-stone-500">
                  {conteudo.data_prevista && (
                    <span
                      className={`inline-flex items-center gap-1 ${
                        conteudo.data_prevista < hoje && conteudo.status !== 'concluido' ? 'text-amber-700' : ''
                      }`}
                    >
                      <CalendarDays aria-hidden className="size-3.5" />
                      Estudar em {formatarData(conteudo.data_prevista)}
                    </span>
                  )}
                  {conteudo.observacoes && <span className="truncate">{conteudo.observacoes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select
                  aria-label={`Status de ${conteudo.titulo}`}
                  value={conteudo.status}
                  onChange={(e) =>
                    alterarStatus.mutate(
                      { id: conteudo.id, status: e.target.value as StatusConteudo },
                      { onError: (erro) => avisos.erro(traduzirErro(erro)) },
                    )
                  }
                  className={`h-8 rounded-full border px-3 pr-7 text-xs font-medium focus:ring-2 focus:ring-vinho-100 focus:outline-none ${ESTILO_STATUS[conteudo.status]}`}
                >
                  {STATUS_CONTEUDO.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </select>
                <BotaoIcone rotulo="Mover para cima" disabled={i === 0 || reordenar.isPending} onClick={() => mover(i, -1)}>
                  <ArrowUp aria-hidden className="size-4" />
                </BotaoIcone>
                <BotaoIcone
                  rotulo="Mover para baixo"
                  disabled={i === conteudos.length - 1 || reordenar.isPending}
                  onClick={() => mover(i, 1)}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </BotaoIcone>
                <BotaoIcone rotulo="Editar conteúdo" onClick={() => setEditando({ aberto: true, conteudo })}>
                  <Pencil aria-hidden className="size-4" />
                </BotaoIcone>
                <BotaoIcone rotulo="Excluir conteúdo" onClick={() => setExcluindo(conteudo)} className="hover:text-red-600">
                  <Trash2 aria-hidden className="size-4" />
                </BotaoIcone>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editando.aberto && (
        <FormularioConteudo
          aberto
          conteudo={editando.conteudo}
          disciplinaId={disciplinaId}
          aoFechar={() => setEditando({ aberto: false, conteudo: null })}
        />
      )}
      <Confirmacao
        aberto={!!excluindo}
        titulo="Excluir conteúdo?"
        mensagem={`"${excluindo?.titulo ?? ''}" será removido da lista e do cálculo de progresso.`}
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
