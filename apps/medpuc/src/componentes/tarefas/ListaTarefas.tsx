import { ListChecks, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useMapaDisciplinas } from '../../hooks/useDisciplinas';
import { useConcluirTarefa, useTarefas } from '../../hooks/useTarefas';
import { traduzirErro } from '../../lib/erros';
import { tarefasPendentes } from '../../lib/resumo';
import { PRIORIDADES, type PrioridadeTarefa, type Tarefa } from '../../tipos/dominio';
import { Botao } from '../ui/Botao';
import { SelecaoCompacta } from '../ui/Campos';
import { EstadoVazio, EsqueletoLista, MensagemErro } from '../ui/Estados';
import { FormularioTarefa } from './FormularioTarefa';
import { ItemTarefa } from './ItemTarefa';

type FiltroStatus = 'pendentes' | 'concluidas' | 'todas';

export function ListaTarefas({ disciplinaId }: { disciplinaId?: string }) {
  const avisos = useNotificacoes();
  const { data: tarefas, isPending, isError, error, refetch } = useTarefas();
  const disciplinas = useMapaDisciplinas();
  const concluir = useConcluirTarefa();
  const [status, setStatus] = useState<FiltroStatus>('pendentes');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa | ''>('');
  const [disciplinaFiltro, setDisciplinaFiltro] = useState('');
  const [formulario, setFormulario] = useState<{ aberto: boolean; tarefa: Tarefa | null }>({ aberto: false, tarefa: null });

  const visiveis = useMemo(() => {
    let lista = tarefas ?? [];
    const disciplina = disciplinaId ?? disciplinaFiltro;
    if (disciplina) lista = lista.filter((t) => t.disciplina_id === disciplina);
    if (prioridade) lista = lista.filter((t) => t.prioridade === prioridade);
    if (status === 'pendentes') return tarefasPendentes(lista);
    if (status === 'concluidas') {
      return lista
        .filter((t) => t.status === 'concluida')
        .sort((a, b) => (b.concluida_em ?? '').localeCompare(a.concluida_em ?? ''));
    }
    return [...tarefasPendentes(lista), ...lista.filter((t) => t.status === 'concluida')];
  }, [tarefas, disciplinaId, disciplinaFiltro, prioridade, status]);

  async function alternar(tarefa: Tarefa) {
    const concluida = tarefa.status !== 'concluida';
    try {
      await concluir.mutateAsync({ id: tarefa.id, concluida });
      avisos.sucesso(concluida ? 'Tarefa concluída.' : 'Tarefa reaberta.');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar por status" className="inline-flex rounded-lg bg-stone-100 p-1">
          {(
            [
              ['pendentes', 'Pendentes'],
              ['concluidas', 'Concluídas'],
              ['todas', 'Todas'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={status === valor}
              onClick={() => setStatus(valor)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === valor ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {!disciplinaId && (
          <SelecaoCompacta rotulo="Filtrar por disciplina" value={disciplinaFiltro} onChange={(e) => setDisciplinaFiltro(e.target.value)}>
            <option value="">Todas as disciplinas</option>
            {[...disciplinas.values()].map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </SelecaoCompacta>
        )}
        <SelecaoCompacta rotulo="Filtrar por prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadeTarefa | '')}>
          <option value="">Qualquer prioridade</option>
          {PRIORIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>
              Prioridade {p.rotulo.toLowerCase()}
            </option>
          ))}
        </SelecaoCompacta>
        <Botao className="ml-auto" icone={<Plus aria-hidden className="size-4" />} onClick={() => setFormulario({ aberto: true, tarefa: null })}>
          Nova tarefa
        </Botao>
      </div>

      {isPending ? (
        <EsqueletoLista />
      ) : isError ? (
        <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />
      ) : visiveis.length === 0 ? (
        <EstadoVazio
          icone={<ListChecks aria-hidden className="size-5" />}
          titulo={status === 'concluidas' ? 'Nenhuma tarefa concluída ainda' : 'Nenhuma tarefa por aqui'}
          descricao={status === 'pendentes' ? 'Registre leituras, resumos, listas de exercícios e entregas.' : undefined}
          acao={
            status !== 'concluidas' && (
              <Botao variante="suave" onClick={() => setFormulario({ aberto: true, tarefa: null })}>
                Registrar tarefa
              </Botao>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-cartao">
          {visiveis.map((tarefa) => (
            <ItemTarefa
              key={tarefa.id}
              tarefa={tarefa}
              disciplina={tarefa.disciplina_id ? disciplinas.get(tarefa.disciplina_id) : null}
              aoAlternar={alternar}
              aoAbrir={(t) => setFormulario({ aberto: true, tarefa: t })}
            />
          ))}
        </ul>
      )}

      <FormularioTarefa
        aberto={formulario.aberto}
        tarefa={formulario.tarefa}
        disciplinaFixa={disciplinaId}
        aoFechar={() => setFormulario({ aberto: false, tarefa: null })}
      />
    </div>
  );
}
