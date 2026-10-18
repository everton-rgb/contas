import { ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { agruparPorDia, montarItens, type FiltrosCalendario, type ItemCalendario } from '../../componentes/calendario/itens';
import { VistaDia, VistaMes, VistaSemana } from '../../componentes/calendario/Vistas';
import { FormularioEvento } from '../../componentes/eventos/FormularioEvento';
import { FormularioTarefa } from '../../componentes/tarefas/FormularioTarefa';
import { Botao, BotaoIcone } from '../../componentes/ui/Botao';
import { SelecaoCompacta } from '../../componentes/ui/Campos';
import { MensagemErro } from '../../componentes/ui/Estados';
import { PontoCor } from '../../componentes/ui/Visuais';
import { useConteudos } from '../../hooks/useConteudos';
import { useDisciplinas } from '../../hooks/useDisciplinas';
import { useEventosNoIntervalo } from '../../hooks/useEventos';
import { useTarefas } from '../../hooks/useTarefas';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { deISO, hojeISO, intervaloDaVista, isoValida, navegar as navegarData, paraISO, tituloDaVista, type Vista } from '../../lib/datas';
import { TIPOS_EVENTO, type DadosEvento, type Evento, type Tarefa, type TipoEvento } from '../../tipos/dominio';

const VISTAS: { valor: Vista; rotulo: string }[] = [
  { valor: 'mes', rotulo: 'Mês' },
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'dia', rotulo: 'Dia' },
];

export function Calendario() {
  useTituloPagina('Calendário');
  const irPara = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const vista = (['mes', 'semana', 'dia'] as const).find((v) => v === parametros.get('vista')) ?? 'mes';
  const dataParam = parametros.get('data');
  const referencia = useMemo(() => deISO(isoValida(dataParam) ? dataParam : hojeISO()), [dataParam]);
  const intervalo = intervaloDaVista(vista, referencia);

  const { data: disciplinas = [] } = useDisciplinas();
  const eventos = useEventosNoIntervalo(intervalo.de, intervalo.ate);
  const tarefas = useTarefas();
  const conteudos = useConteudos();

  const [filtros, setFiltros] = useState<FiltrosCalendario>({ disciplinas: new Set(), tipo: '', tarefas: true, estudos: true });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [formEvento, setFormEvento] = useState<{ aberto: boolean; evento: Evento | null; padrao?: Partial<DadosEvento> }>({
    aberto: false,
    evento: null,
  });
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);

  const mapaDisciplinas = useMemo(() => new Map(disciplinas.map((d) => [d.id, d])), [disciplinas]);
  const porDia = useMemo(
    () =>
      agruparPorDia(
        montarItens(
          { eventos: eventos.data ?? [], tarefas: tarefas.data ?? [], conteudos: conteudos.data ?? [] },
          mapaDisciplinas,
          filtros,
          intervalo,
        ),
      ),
    [eventos.data, tarefas.data, conteudos.data, mapaDisciplinas, filtros, intervalo.de, intervalo.ate],
  );

  function atualizar(novaVista: Vista, novaData: Date) {
    setParametros({ vista: novaVista, data: paraISO(novaData) }, { replace: true });
  }

  function abrir(item: ItemCalendario) {
    if (item.tipo === 'evento') setFormEvento({ aberto: true, evento: item.evento });
    else if (item.tipo === 'tarefa') setTarefaAberta(item.tarefa);
    else irPara(`/app/disciplinas/${item.conteudo.disciplina_id}/conteudos`);
  }

  function novo(data: string, hora?: string) {
    const disciplinaUnica = filtros.disciplinas.size === 1 ? [...filtros.disciplinas][0] : undefined;
    setFormEvento({
      aberto: true,
      evento: null,
      padrao: { data, hora_inicio: hora ?? null, tipo: filtros.tipo || 'prova', disciplina_id: disciplinaUnica },
    });
  }

  function alternarDisciplina(id: string) {
    setFiltros((f) => {
      const proximo = new Set(f.disciplinas);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return { ...f, disciplinas: proximo };
    });
  }

  const filtrosAtivos = filtros.disciplinas.size + (filtros.tipo ? 1 : 0) + (filtros.tarefas ? 0 : 1) + (filtros.estudos ? 0 : 1);
  const propsVista = { referencia, porDia, aoAbrir: abrir, aoNovo: novo, aoIrParaDia: (d: string) => atualizar('dia', deISO(d)) };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-semibold tracking-tight first-letter:uppercase sm:text-3xl" aria-live="polite">
            {tituloDaVista(vista, referencia)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <div className="flex items-center rounded-lg border border-stone-300 bg-white shadow-sm">
            <BotaoIcone rotulo="Anterior" onClick={() => atualizar(vista, navegarData(vista, referencia, -1))}>
              <ChevronLeft aria-hidden className="size-4" />
            </BotaoIcone>
            <button
              type="button"
              onClick={() => atualizar(vista, new Date())}
              className="h-9 border-x border-stone-200 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Hoje
            </button>
            <BotaoIcone rotulo="Próximo" onClick={() => atualizar(vista, navegarData(vista, referencia, 1))}>
              <ChevronRight aria-hidden className="size-4" />
            </BotaoIcone>
          </div>
          <div role="group" aria-label="Visualização" className="inline-flex rounded-lg bg-stone-100 p-1">
            {VISTAS.map((v) => (
              <button
                key={v.valor}
                type="button"
                aria-pressed={vista === v.valor}
                onClick={() => atualizar(v.valor, referencia)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  vista === v.valor ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {v.rotulo}
              </button>
            ))}
          </div>
          <Botao
            variante="secundario"
            onClick={() => setMostrarFiltros((m) => !m)}
            aria-expanded={mostrarFiltros}
            aria-controls="filtros-calendario"
            icone={<Filter aria-hidden className="size-4" />}
          >
            Filtros{filtrosAtivos ? ` (${filtrosAtivos})` : ''}
          </Botao>
          <Botao icone={<Plus aria-hidden className="size-4" />} onClick={() => novo(vista === 'dia' ? paraISO(referencia) : hojeISO())}>
            Novo evento
          </Botao>
        </div>
      </div>

      {mostrarFiltros && (
        <div id="filtros-calendario" className="mb-4 animate-surgir space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-cartao">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Disciplinas</p>
            <div className="flex flex-wrap gap-2">
              {disciplinas.length === 0 && <p className="text-sm text-stone-500">Nenhuma disciplina cadastrada.</p>}
              {disciplinas.map((d) => {
                const ativa = filtros.disciplinas.has(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => alternarDisciplina(d.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      ativa ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    <PontoCor cor={d.cor} className="size-2" />
                    {d.nome}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SelecaoCompacta
              rotulo="Filtrar por tipo de evento"
              value={filtros.tipo}
              onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value as TipoEvento | '' }))}
            >
              <option value="">Todos os tipos</option>
              {TIPOS_EVENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </SelecaoCompacta>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                className="size-4 accent-vinho-600"
                checked={filtros.tarefas}
                onChange={(e) => setFiltros((f) => ({ ...f, tarefas: e.target.checked }))}
              />
              Prazos de tarefas
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                className="size-4 accent-vinho-600"
                checked={filtros.estudos}
                onChange={(e) => setFiltros((f) => ({ ...f, estudos: e.target.checked }))}
              />
              Estudos planejados
            </label>
            {filtrosAtivos > 0 && (
              <button
                type="button"
                onClick={() => setFiltros({ disciplinas: new Set(), tipo: '', tarefas: true, estudos: true })}
                className="text-sm font-medium text-vinho-700 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {eventos.isError ? (
        <MensagemErro erro={eventos.error} aoTentarNovamente={() => eventos.refetch()} />
      ) : (
        <div className={`transition-opacity ${eventos.isFetching && !eventos.isPending ? 'opacity-70' : ''}`} aria-busy={eventos.isPending}>
          {vista === 'mes' && <VistaMes {...propsVista} />}
          {vista === 'semana' && <VistaSemana {...propsVista} />}
          {vista === 'dia' && <VistaDia {...propsVista} />}
        </div>
      )}

      <FormularioEvento
        aberto={formEvento.aberto}
        evento={formEvento.evento}
        padrao={formEvento.padrao}
        aoFechar={() => setFormEvento({ aberto: false, evento: null })}
      />
      <FormularioTarefa aberto={!!tarefaAberta} tarefa={tarefaAberta} aoFechar={() => setTarefaAberta(null)} />
    </>
  );
}
