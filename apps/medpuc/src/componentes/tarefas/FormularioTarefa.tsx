import { Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useDisciplinas } from '../../hooks/useDisciplinas';
import { useExcluirTarefa, useSalvarTarefa } from '../../hooks/useTarefas';
import { traduzirErro } from '../../lib/erros';
import { dataOpcionalValida, obrigatorio, primeiro, tamanhoMaximo } from '../../lib/validacao';
import {
  PRIORIDADES,
  STATUS_TAREFA,
  type PrioridadeTarefa,
  type StatusTarefa,
  type Tarefa,
} from '../../tipos/dominio';
import { Botao } from '../ui/Botao';
import { AreaTexto, Campo, Selecao } from '../ui/Campos';
import { Confirmacao } from '../ui/Confirmacao';
import { Modal } from '../ui/Modal';

type Valores = {
  titulo: string;
  descricao: string;
  prazo: string;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  disciplina_id: string;
};

function iniciais(tarefa?: Tarefa | null, disciplinaId?: string): Valores {
  return {
    titulo: tarefa?.titulo ?? '',
    descricao: tarefa?.descricao ?? '',
    prazo: tarefa?.prazo ?? '',
    prioridade: tarefa?.prioridade ?? 'media',
    status: tarefa?.status ?? 'pendente',
    disciplina_id: tarefa?.disciplina_id ?? disciplinaId ?? '',
  };
}

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  tarefa?: Tarefa | null;
  disciplinaFixa?: string;
};

export function FormularioTarefa({ aberto, aoFechar, tarefa, disciplinaFixa }: Props) {
  const avisos = useNotificacoes();
  const { data: disciplinas = [] } = useDisciplinas();
  const salvar = useSalvarTarefa();
  const excluir = useExcluirTarefa();
  const [valores, setValores] = useState<Valores>(() => iniciais(tarefa, disciplinaFixa));
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({});
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setValores(iniciais(tarefa, disciplinaFixa));
      setErros({});
    }
  }, [aberto, tarefa, disciplinaFixa]);

  function mudar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      titulo: primeiro(obrigatorio(valores.titulo, 'O título'), tamanhoMaximo(valores.titulo, 200)),
      prazo: dataOpcionalValida(valores.prazo),
      descricao: tamanhoMaximo(valores.descricao, 4000),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    try {
      await salvar.mutateAsync({
        id: tarefa?.id,
        dados: {
          titulo: valores.titulo,
          descricao: valores.descricao,
          prazo: valores.prazo || null,
          prioridade: valores.prioridade,
          status: valores.status,
          disciplina_id: valores.disciplina_id || null,
        },
      });
      avisos.sucesso(tarefa ? 'Tarefa atualizada.' : 'Tarefa registrada.');
      aoFechar();
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  async function confirmarExclusao() {
    if (!tarefa) return;
    try {
      await excluir.mutateAsync(tarefa.id);
      avisos.sucesso('Tarefa excluída.');
      setConfirmando(false);
      aoFechar();
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <>
      <Modal
        aberto={aberto && !confirmando}
        aoFechar={aoFechar}
        titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'}
        rodape={
          <>
            {tarefa && (
              <Botao
                variante="fantasma"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 sm:mr-auto"
                onClick={() => setConfirmando(true)}
                icone={<Trash2 aria-hidden className="size-4" />}
              >
                Excluir
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" form="formulario-tarefa" carregando={salvar.isPending}>
              Salvar
            </Botao>
          </>
        }
      >
        <form id="formulario-tarefa" onSubmit={enviar} noValidate className="space-y-4">
          <Campo
            rotulo="Título"
            value={valores.titulo}
            onChange={(e) => mudar('titulo', e.target.value)}
            erro={erros.titulo}
            placeholder="Ex.: Fazer resumo da aula de vias motoras"
            data-autofoco
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Prazo" type="date" value={valores.prazo} onChange={(e) => mudar('prazo', e.target.value)} erro={erros.prazo} opcional />
            <Selecao
              rotulo="Disciplina"
              value={valores.disciplina_id}
              onChange={(e) => mudar('disciplina_id', e.target.value)}
              disabled={!!disciplinaFixa}
              opcional
            >
              <option value="">Sem disciplina</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Selecao>
            <Selecao rotulo="Prioridade" value={valores.prioridade} onChange={(e) => mudar('prioridade', e.target.value as PrioridadeTarefa)}>
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </Selecao>
            <Selecao rotulo="Status" value={valores.status} onChange={(e) => mudar('status', e.target.value as StatusTarefa)}>
              {STATUS_TAREFA.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </Selecao>
          </div>
          <AreaTexto
            rotulo="Descrição"
            value={valores.descricao}
            onChange={(e) => mudar('descricao', e.target.value)}
            erro={erros.descricao}
            opcional
          />
        </form>
      </Modal>
      <Confirmacao
        aberto={confirmando}
        titulo="Excluir tarefa?"
        mensagem={`"${tarefa?.titulo ?? ''}" será excluída permanentemente.`}
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setConfirmando(false)}
      />
    </>
  );
}
