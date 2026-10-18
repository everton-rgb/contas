import { BookMarked, CalendarPlus, ListChecks, NotebookPen } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ListaAnotacoes } from '../../../componentes/anotacoes/ListaAnotacoes';
import { ListaConteudos } from '../../../componentes/conteudos/ListaConteudos';
import { FormularioEvento } from '../../../componentes/eventos/FormularioEvento';
import { ItemEvento } from '../../../componentes/eventos/ItemEvento';
import { ListaTarefas } from '../../../componentes/tarefas/ListaTarefas';
import { Botao } from '../../../componentes/ui/Botao';
import { EstadoVazio, EsqueletoLista, MensagemErro } from '../../../componentes/ui/Estados';
import { BarraProgresso, CabecalhoCartao, Cartao } from '../../../componentes/ui/Visuais';
import { useBuscaAnotacoes } from '../../../hooks/useAnotacoes';
import { useConteudosDaDisciplina } from '../../../hooks/useConteudos';
import { useEventosDaDisciplina } from '../../../hooks/useEventos';
import { useTarefas } from '../../../hooks/useTarefas';
import { hojeISO } from '../../../lib/datas';
import { calcularProgresso, proximaAvaliacaoPorDisciplina, tarefasPendentes } from '../../../lib/resumo';
import { TIPOS_AVALIACAO, type Evento, type Tarefa } from '../../../tipos/dominio';
import { FormularioTarefa } from '../../../componentes/tarefas/FormularioTarefa';
import { ItemTarefa } from '../../../componentes/tarefas/ItemTarefa';
import { useNotificacoes } from '../../../contextos/Notificacoes';
import { useConcluirTarefa } from '../../../hooks/useTarefas';
import { traduzirErro } from '../../../lib/erros';
import { useDisciplinaAtual } from './PaginaDisciplina';

export function AbaVisaoGeral() {
  const disciplina = useDisciplinaAtual();
  const hoje = hojeISO();
  const eventos = useEventosDaDisciplina(disciplina.id);
  const conteudos = useConteudosDaDisciplina(disciplina.id);
  const tarefas = useTarefas();
  const anotacoes = useBuscaAnotacoes('', disciplina.id);
  const concluir = useConcluirTarefa();
  const avisos = useNotificacoes();
  const [eventoAberto, setEventoAberto] = useState<Evento | null>(null);
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);

  const proxima = proximaAvaliacaoPorDisciplina(eventos.data ?? [], hoje).get(disciplina.id);
  const pendentes = tarefasPendentes((tarefas.data ?? []).filter((t) => t.disciplina_id === disciplina.id));
  const progresso = calcularProgresso(conteudos.data ?? []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {disciplina.descricao && (
        <Cartao className="p-5 lg:col-span-2">
          <p className="text-sm leading-6 whitespace-pre-line text-stone-600">{disciplina.descricao}</p>
        </Cartao>
      )}

      <Cartao>
        <CabecalhoCartao titulo="Próxima avaliação" icone={<CalendarPlus aria-hidden className="size-4" />} />
        <div className="px-2 pb-3">
          {eventos.isPending ? (
            <EsqueletoLista linhas={1} />
          ) : proxima ? (
            <ItemEvento evento={proxima} disciplina={disciplina} aoAbrir={setEventoAberto} />
          ) : (
            <p className="px-3 pb-2 text-sm text-stone-500">
              Nenhuma avaliação agendada.{' '}
              <Link to="avaliacoes" className="font-medium text-vinho-700 hover:underline">
                Cadastrar datas
              </Link>
            </p>
          )}
        </div>
      </Cartao>

      <Cartao>
        <CabecalhoCartao titulo="Conteúdos" icone={<BookMarked aria-hidden className="size-4" />} />
        <div className="px-5 pb-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-stone-600">
              {progresso.concluidos} de {progresso.total} estudados
            </span>
            <span className="font-medium">{progresso.percentual}%</span>
          </div>
          <BarraProgresso percentual={progresso.percentual} cor={disciplina.cor} rotulo={`Progresso em ${disciplina.nome}`} />
          <ul className="mt-4 space-y-1.5 text-sm">
            {(conteudos.data ?? [])
              .filter((c) => c.status !== 'concluido')
              .slice(0, 4)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-stone-600">
                  <span aria-hidden className={`size-1.5 rounded-full ${c.status === 'em_andamento' ? 'bg-sky-500' : 'bg-stone-300'}`} />
                  {c.titulo}
                </li>
              ))}
          </ul>
          <Link to="conteudos" className="mt-3 inline-block text-sm font-medium text-vinho-700 hover:underline">
            {progresso.total ? 'Ver todos os conteúdos' : 'Cadastrar conteúdos'}
          </Link>
        </div>
      </Cartao>

      <Cartao>
        <CabecalhoCartao titulo="Tarefas pendentes" icone={<ListChecks aria-hidden className="size-4" />} />
        <div className="px-2 pb-3">
          {pendentes.length ? (
            <ul>
              {pendentes.slice(0, 5).map((t) => (
                <ItemTarefa
                  key={t.id}
                  tarefa={t}
                  aoAlternar={(x) =>
                    concluir.mutate(
                      { id: x.id, concluida: x.status !== 'concluida' },
                      { onError: (erro) => avisos.erro(traduzirErro(erro)) },
                    )
                  }
                  aoAbrir={setTarefaAberta}
                />
              ))}
            </ul>
          ) : (
            <p className="px-3 pb-2 text-sm text-stone-500">Nenhuma tarefa pendente.</p>
          )}
          <Link to="tarefas" className="mx-3 mt-1 inline-block text-sm font-medium text-vinho-700 hover:underline">
            Gerenciar tarefas
          </Link>
        </div>
      </Cartao>

      <Cartao>
        <CabecalhoCartao titulo="Anotações recentes" icone={<NotebookPen aria-hidden className="size-4" />} />
        <div className="px-5 pb-5">
          {anotacoes.data?.length ? (
            <ul className="space-y-2">
              {anotacoes.data.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/app/anotacoes/${a.id}`}
                    state={{ voltar: `/app/disciplinas/${disciplina.id}` }}
                    className="block truncate text-sm text-stone-700 hover:text-vinho-700"
                  >
                    {a.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Nenhuma anotação nesta disciplina.</p>
          )}
          <Link to="anotacoes" className="mt-3 inline-block text-sm font-medium text-vinho-700 hover:underline">
            Abrir caderno da disciplina
          </Link>
        </div>
      </Cartao>

      <FormularioEvento aberto={!!eventoAberto} evento={eventoAberto} aoFechar={() => setEventoAberto(null)} />
      <FormularioTarefa
        aberto={!!tarefaAberta}
        tarefa={tarefaAberta}
        disciplinaFixa={disciplina.id}
        aoFechar={() => setTarefaAberta(null)}
      />
    </div>
  );
}

export function AbaConteudos() {
  const disciplina = useDisciplinaAtual();
  return <ListaConteudos disciplinaId={disciplina.id} cor={disciplina.cor} />;
}

export function AbaAvaliacoes() {
  const disciplina = useDisciplinaAtual();
  const hoje = hojeISO();
  const { data: eventos, isPending, isError, error, refetch } = useEventosDaDisciplina(disciplina.id);
  const [formulario, setFormulario] = useState<{ aberto: boolean; evento: Evento | null }>({ aberto: false, evento: null });
  const [somenteAvaliacoes, setSomenteAvaliacoes] = useState(false);

  const lista = (eventos ?? []).filter((e) => !somenteAvaliacoes || TIPOS_AVALIACAO.includes(e.tipo));
  const proximas = lista.filter((e) => e.data >= hoje);
  const anteriores = lista.filter((e) => e.data < hoje).reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={somenteAvaliacoes}
            onChange={(e) => setSomenteAvaliacoes(e.target.checked)}
            className="size-4 accent-vinho-600"
          />
          Somente provas, trabalhos e entregas
        </label>
        <Botao className="ml-auto" icone={<CalendarPlus aria-hidden className="size-4" />} onClick={() => setFormulario({ aberto: true, evento: null })}>
          Nova avaliação ou data
        </Botao>
      </div>
      <p className="text-xs text-stone-500">As datas cadastradas aqui aparecem automaticamente no calendário acadêmico.</p>

      {isPending ? (
        <EsqueletoLista />
      ) : isError ? (
        <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<CalendarPlus aria-hidden className="size-5" />}
          titulo="Nenhuma data cadastrada"
          descricao="Cadastre provas, avaliações práticas, trabalhos e entregas conforme o calendário da sua turma."
          acao={<Botao variante="suave" onClick={() => setFormulario({ aberto: true, evento: null })}>Cadastrar a primeira</Botao>}
        />
      ) : (
        <>
          <section aria-labelledby="titulo-proximas">
            <h2 id="titulo-proximas" className="mb-2 text-sm font-semibold text-stone-500">
              Próximas ({proximas.length})
            </h2>
            {proximas.length ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-1.5 shadow-cartao">
                {proximas.map((e) => (
                  <ItemEvento key={e.id} evento={e} disciplina={disciplina} aoAbrir={(ev) => setFormulario({ aberto: true, evento: ev })} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">Nenhuma data futura.</p>
            )}
          </section>
          {anteriores.length > 0 && (
            <section aria-labelledby="titulo-anteriores">
              <h2 id="titulo-anteriores" className="mb-2 text-sm font-semibold text-stone-500">
                Anteriores ({anteriores.length})
              </h2>
              <div className="rounded-2xl border border-stone-200 bg-white p-1.5 opacity-80 shadow-cartao">
                {anteriores.map((e) => (
                  <ItemEvento key={e.id} evento={e} disciplina={disciplina} aoAbrir={(ev) => setFormulario({ aberto: true, evento: ev })} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <FormularioEvento
        aberto={formulario.aberto}
        evento={formulario.evento}
        disciplinaFixa={disciplina.id}
        padrao={{ tipo: 'prova', disciplina_id: disciplina.id }}
        aoFechar={() => setFormulario({ aberto: false, evento: null })}
      />
    </div>
  );
}

export function AbaAnotacoes() {
  const disciplina = useDisciplinaAtual();
  return <ListaAnotacoes disciplinaId={disciplina.id} />;
}

export function AbaTarefas() {
  const disciplina = useDisciplinaAtual();
  return <ListaTarefas disciplinaId={disciplina.id} />;
}
