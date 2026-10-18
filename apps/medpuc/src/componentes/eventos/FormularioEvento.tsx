/**
 * Formulário único de eventos: usado no calendário, na aba de avaliações da
 * disciplina e nos atalhos do painel. Todos gravam na mesma tabela.
 */

import { Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useDisciplinas } from '../../hooks/useDisciplinas';
import { useExcluirEvento, useSalvarEvento } from '../../hooks/useEventos';
import { corValida } from '../../lib/cores';
import { formatarHora, hojeISO } from '../../lib/datas';
import { traduzirErro } from '../../lib/erros';
import { dataValida, horarioValido, obrigatorio, primeiro, tamanhoMaximo } from '../../lib/validacao';
import { STATUS_EVENTO, TIPOS_EVENTO, type DadosEvento, type Evento, type StatusEvento, type TipoEvento } from '../../tipos/dominio';
import { Botao } from '../ui/Botao';
import { AreaTexto, Campo, Selecao } from '../ui/Campos';
import { Confirmacao } from '../ui/Confirmacao';
import { Modal } from '../ui/Modal';
import { SeletorCor } from '../ui/SeletorCor';

type Valores = {
  titulo: string;
  tipo: TipoEvento;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  disciplina_id: string;
  descricao: string;
  status: StatusEvento;
  cor: string;
};

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  evento?: Evento | null;
  padrao?: Partial<DadosEvento>;
  /** Fixa a disciplina (aba da disciplina). */
  disciplinaFixa?: string;
};

function valoresIniciais(evento?: Evento | null, padrao?: Partial<DadosEvento>, disciplinaFixa?: string): Valores {
  const base = evento ?? padrao ?? {};
  return {
    titulo: base.titulo ?? '',
    tipo: base.tipo ?? 'prova',
    data: base.data ?? hojeISO(),
    hora_inicio: formatarHora(base.hora_inicio),
    hora_fim: formatarHora(base.hora_fim),
    disciplina_id: disciplinaFixa ?? base.disciplina_id ?? '',
    descricao: base.descricao ?? '',
    status: base.status ?? 'agendado',
    cor: base.cor ?? '',
  };
}

export function FormularioEvento({ aberto, aoFechar, evento, padrao, disciplinaFixa }: Props) {
  const avisos = useNotificacoes();
  const { data: disciplinas = [] } = useDisciplinas();
  const salvar = useSalvarEvento();
  const excluir = useExcluirEvento();
  const [valores, setValores] = useState<Valores>(() => valoresIniciais(evento, padrao, disciplinaFixa));
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({});
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setValores(valoresIniciais(evento, padrao, disciplinaFixa));
      setErros({});
    }
    // `padrao` muda de identidade a cada render do pai; só reinicia ao abrir.
  }, [aberto, evento?.id]);

  function mudar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      titulo: primeiro(obrigatorio(valores.titulo, 'O título'), tamanhoMaximo(valores.titulo, 160)),
      data: dataValida(valores.data),
      hora_fim: horarioValido(valores.hora_inicio, valores.hora_fim),
      descricao: tamanhoMaximo(valores.descricao, 4000),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;

    const dados: DadosEvento = {
      titulo: valores.titulo,
      tipo: valores.tipo,
      data: valores.data,
      hora_inicio: valores.hora_inicio || null,
      hora_fim: valores.hora_fim || null,
      disciplina_id: valores.disciplina_id || null,
      descricao: valores.descricao,
      status: valores.status,
      // Com disciplina, a cor é a dela; a cor própria só vale para eventos avulsos.
      cor: !valores.disciplina_id && corValida(valores.cor) ? valores.cor : null,
    };

    try {
      await salvar.mutateAsync({ id: evento?.id, dados });
      avisos.sucesso(evento ? 'Evento atualizado.' : 'Evento adicionado ao calendário.');
      aoFechar();
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  async function confirmarExclusao() {
    if (!evento) return;
    try {
      await excluir.mutateAsync(evento.id);
      avisos.sucesso('Evento excluído.');
      setConfirmando(false);
      aoFechar();
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  const idFormulario = 'formulario-evento';

  return (
    <>
      <Modal
        aberto={aberto && !confirmando}
        aoFechar={aoFechar}
        titulo={evento ? 'Editar evento' : 'Novo evento'}
        rodape={
          <>
            {evento && (
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
            <Botao type="submit" form={idFormulario} carregando={salvar.isPending}>
              Salvar
            </Botao>
          </>
        }
      >
        <form id={idFormulario} onSubmit={enviar} noValidate className="space-y-4">
          <Campo
            rotulo="Título"
            value={valores.titulo}
            onChange={(e) => mudar('titulo', e.target.value)}
            erro={erros.titulo}
            placeholder="Ex.: Prova 1 — Tronco encefálico"
            data-autofoco
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao rotulo="Tipo" value={valores.tipo} onChange={(e) => mudar('tipo', e.target.value as TipoEvento)}>
              {TIPOS_EVENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Selecao>
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
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Campo
              rotulo="Data"
              type="date"
              value={valores.data}
              onChange={(e) => mudar('data', e.target.value)}
              erro={erros.data}
              className="col-span-2 sm:col-span-1"
            />
            <Campo
              rotulo="Início"
              type="time"
              value={valores.hora_inicio}
              onChange={(e) => mudar('hora_inicio', e.target.value)}
              opcional
            />
            <Campo
              rotulo="Término"
              type="time"
              value={valores.hora_fim}
              onChange={(e) => mudar('hora_fim', e.target.value)}
              erro={erros.hora_fim}
              opcional
            />
          </div>
          <Selecao rotulo="Status" value={valores.status} onChange={(e) => mudar('status', e.target.value as StatusEvento)}>
            {STATUS_EVENTO.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
          <AreaTexto
            rotulo="Descrição"
            value={valores.descricao}
            onChange={(e) => mudar('descricao', e.target.value)}
            erro={erros.descricao}
            placeholder="Conteúdo cobrado, sala, materiais…"
            opcional
          />
          {!valores.disciplina_id && (
            <SeletorCor
              rotulo="Cor no calendário"
              valor={corValida(valores.cor) ? valores.cor : TIPOS_EVENTO.find((t) => t.valor === valores.tipo)!.cor}
              aoMudar={(cor) => mudar('cor', cor)}
            />
          )}
        </form>
      </Modal>
      <Confirmacao
        aberto={confirmando}
        titulo="Excluir evento?"
        mensagem={`"${evento?.titulo ?? ''}" será removido do calendário e da disciplina. Esta ação não pode ser desfeita.`}
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setConfirmando(false)}
      />
    </>
  );
}
