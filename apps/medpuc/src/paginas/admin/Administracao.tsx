/**
 * Administração dos modelos de período. Só administradores chegam aqui
 * (RotaAdmin) e, mais importante, só eles conseguem gravar (RLS).
 * Alterar um modelo não muda as contas dos alunos que já o importaram.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ChevronDown, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Botao, BotaoIcone } from '../../componentes/ui/Botao';
import { AreaTexto, Campo, Selecao } from '../../componentes/ui/Campos';
import { Confirmacao } from '../../componentes/ui/Confirmacao';
import { Carregando, EstadoVazio, MensagemErro } from '../../componentes/ui/Estados';
import { Modal } from '../../componentes/ui/Modal';
import { SeletorCor } from '../../componentes/ui/SeletorCor';
import { Cartao, Etiqueta, PontoCor, TituloPagina } from '../../componentes/ui/Visuais';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useModelos } from '../../hooks/useModelos';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { sugerirCor } from '../../lib/cores';
import { formatarDataCurta, formatarHora } from '../../lib/datas';
import { traduzirErro } from '../../lib/erros';
import { lerDisciplinas, lerEventos } from '../../lib/importacao';
import { corObrigatoria, dataValida, horarioValido, obrigatorio, primeiro, tamanhoMaximo } from '../../lib/validacao';
import {
  excluirModelo,
  excluirModeloDisciplina,
  excluirModeloEvento,
  importarEmLote,
  salvarModelo,
  salvarModeloDisciplina,
  salvarModeloEvento,
  type DadosModelo,
  type ModeloCompleto,
  type ModeloDisciplinaComDatas,
} from '../../servicos/modelos';
import { rotuloTipo, TIPOS_EVENTO, type ModeloEvento, type TipoEvento } from '../../tipos/dominio';

/** Mutação que atualiza a lista de modelos e avisa o resultado. */
function useAcaoAdmin<T>(acao: (v: T) => Promise<unknown>, sucesso: string) {
  const cliente = useQueryClient();
  const avisos = useNotificacoes();
  return useMutation({
    mutationFn: acao,
    onSuccess: () => {
      avisos.sucesso(sucesso);
      cliente.invalidateQueries({ queryKey: ['modelos'] });
    },
    onError: (erro) => avisos.erro(traduzirErro(erro)),
  });
}

// ── Formulários ─────────────────────────────────────────────────────────────

function FormularioModelo({ modelo, aoFechar }: { modelo: ModeloCompleto | null; aoFechar: () => void }) {
  const [dados, setDados] = useState<DadosModelo>({
    instituicao: modelo?.instituicao ?? 'PUCPR',
    curso: modelo?.curso ?? 'Medicina',
    periodo: modelo?.periodo ?? 3,
    titulo: modelo?.titulo ?? '',
    descricao: modelo?.descricao ?? '',
    publicado: modelo?.publicado ?? false,
  });
  const [erros, setErros] = useState<{ titulo?: string; instituicao?: string; curso?: string }>({});
  const salvar = useAcaoAdmin((d: DadosModelo) => salvarModelo(d, modelo?.id), 'Modelo salvo.');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      titulo: primeiro(obrigatorio(dados.titulo, 'O título'), tamanhoMaximo(dados.titulo, 160)),
      instituicao: obrigatorio(dados.instituicao, 'A instituição'),
      curso: obrigatorio(dados.curso, 'O curso'),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    await salvar.mutateAsync(dados).then(aoFechar, () => undefined);
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={modelo ? 'Editar modelo' : 'Novo modelo de período'}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-modelo" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-modelo" onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Título" value={dados.titulo} onChange={(e) => setDados({ ...dados, titulo: e.target.value })} erro={erros.titulo} className="sm:col-span-2" data-autofoco />
        <Campo rotulo="Instituição" value={dados.instituicao} onChange={(e) => setDados({ ...dados, instituicao: e.target.value })} erro={erros.instituicao} />
        <Campo rotulo="Curso" value={dados.curso} onChange={(e) => setDados({ ...dados, curso: e.target.value })} erro={erros.curso} />
        <Selecao rotulo="Período" value={dados.periodo} onChange={(e) => setDados({ ...dados, periodo: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}º período
            </option>
          ))}
        </Selecao>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-stone-700">
          <input type="checkbox" className="size-4 accent-vinho-600" checked={dados.publicado} onChange={(e) => setDados({ ...dados, publicado: e.target.checked })} />
          Publicado para os alunos
        </label>
        <AreaTexto rotulo="Descrição" value={dados.descricao ?? ''} onChange={(e) => setDados({ ...dados, descricao: e.target.value })} className="sm:col-span-2" opcional />
      </form>
    </Modal>
  );
}

function FormularioDisciplinaModelo({
  modeloId,
  disciplina,
  coresEmUso,
  aoFechar,
}: {
  modeloId: string;
  disciplina: ModeloDisciplinaComDatas | null;
  coresEmUso: string[];
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState(disciplina?.nome ?? '');
  const [cor, setCor] = useState(disciplina?.cor ?? sugerirCor(coresEmUso));
  const [erros, setErros] = useState<{ nome?: string; cor?: string }>({});
  const salvar = useAcaoAdmin(
    () => salvarModeloDisciplina({ modelo_id: modeloId, nome, cor, ordem: disciplina?.ordem ?? coresEmUso.length + 1 }, disciplina?.id),
    'Disciplina do modelo salva.',
  );

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = { nome: primeiro(obrigatorio(nome, 'O nome'), tamanhoMaximo(nome, 120)), cor: corObrigatoria(cor) };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    await salvar.mutateAsync(undefined).then(aoFechar, () => undefined);
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={disciplina ? 'Editar disciplina do modelo' : 'Nova disciplina no modelo'}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-disciplina-modelo" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-disciplina-modelo" onSubmit={enviar} noValidate className="space-y-4">
        <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} data-autofoco />
        <SeletorCor valor={cor} aoMudar={setCor} erro={erros.cor} />
      </form>
    </Modal>
  );
}

function FormularioDataModelo({
  disciplina,
  evento,
  aoFechar,
}: {
  disciplina: ModeloDisciplinaComDatas;
  evento: ModeloEvento | null;
  aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState(evento?.titulo ?? '');
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? 'prova');
  const [data, setData] = useState(evento?.data ?? '');
  const [inicio, setInicio] = useState(formatarHora(evento?.hora_inicio));
  const [fim, setFim] = useState(formatarHora(evento?.hora_fim));
  const [erros, setErros] = useState<{ titulo?: string; data?: string; fim?: string }>({});
  const salvar = useAcaoAdmin(
    () =>
      salvarModeloEvento(
        { modelo_disciplina_id: disciplina.id, titulo, tipo, data, hora_inicio: inicio || null, hora_fim: fim || null },
        evento?.id,
      ),
    'Data do modelo salva.',
  );

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      titulo: primeiro(obrigatorio(titulo, 'O título'), tamanhoMaximo(titulo, 160)),
      data: dataValida(data),
      fim: horarioValido(inicio, fim),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    await salvar.mutateAsync(undefined).then(aoFechar, () => undefined);
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={`${evento ? 'Editar' : 'Nova'} data — ${disciplina.nome}`}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-data-modelo" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-data-modelo" onSubmit={enviar} noValidate className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Campo rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} erro={erros.titulo} className="col-span-2 sm:col-span-3" data-autofoco />
        <Selecao rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)} className="col-span-2 sm:col-span-3">
          {TIPOS_EVENTO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </Selecao>
        <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} className="col-span-2 sm:col-span-1" />
        <Campo rotulo="Início" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} opcional />
        <Campo rotulo="Término" type="time" value={fim} onChange={(e) => setFim(e.target.value)} erro={erros.fim} opcional />
      </form>
    </Modal>
  );
}

function ImportacaoEmLote({ modelo, aoFechar }: { modelo: ModeloCompleto; aoFechar: () => void }) {
  const [textoDisciplinas, setTextoDisciplinas] = useState('');
  const [textoDatas, setTextoDatas] = useState('');
  const existentes = modelo.modelos_disciplinas;
  const disciplinas = lerDisciplinas(textoDisciplinas, existentes.map((d) => d.cor));
  const nomesConhecidos = [...existentes.map((d) => d.nome), ...disciplinas.itens.map((d) => d.nome)];
  const datas = lerEventos(textoDatas, nomesConhecidos);
  const erros = [
    ...disciplinas.erros.map((e) => `Disciplinas, linha ${e.linha}: ${e.mensagem}`),
    ...datas.erros.map((e) => `Datas, linha ${e.linha}: ${e.mensagem}`),
  ];
  const novas = disciplinas.itens.filter(
    (d) => !existentes.some((x) => x.nome.toLocaleLowerCase('pt-BR') === d.nome.toLocaleLowerCase('pt-BR')),
  );
  const importar = useAcaoAdmin(() => importarEmLote(modelo.id, disciplinas.itens, datas.itens, existentes), 'Importação concluída.');
  const nadaParaImportar = novas.length === 0 && datas.itens.length === 0;

  return (
    <Modal
      aberto
      largura="lg"
      aoFechar={aoFechar}
      titulo="Importar disciplinas e datas"
      descricao="Cole as listas (uma linha por item). Campos separados por ponto e vírgula ou tabulação, como ao copiar de uma planilha."
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            icone={<Upload aria-hidden className="size-4" />}
            disabled={erros.length > 0 || nadaParaImportar}
            carregando={importar.isPending}
            onClick={() => importar.mutateAsync(undefined).then(aoFechar, () => undefined)}
          >
            Importar {novas.length} disciplina(s) e {datas.itens.length} data(s)
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <AreaTexto
          rotulo="Disciplinas"
          rows={5}
          value={textoDisciplinas}
          onChange={(e) => setTextoDisciplinas(e.target.value)}
          placeholder={'Neuroanatomia;#8C1D40\nNeurofisiologia'}
          dica="Formato: Nome ou Nome;#RRGGBB. Disciplinas já existentes no modelo são ignoradas."
          opcional
        />
        <AreaTexto
          rotulo="Datas oficiais"
          rows={6}
          value={textoDatas}
          onChange={(e) => setTextoDatas(e.target.value)}
          placeholder={'Neuroanatomia;Prova;Prova 1;10/03/2027;08:00;10:00'}
          dica="Formato: Disciplina;Tipo;Título;DD/MM/AAAA;Início;Término (horários opcionais). Tipos: prova, avaliação prática, trabalho, entrega, aula, revisão, outro."
          opcional
        />
        {erros.length > 0 ? (
          <div role="alert" className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <ul className="list-disc space-y-1 pl-4">
              {erros.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : (
          !nadaParaImportar && (
            <p className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600" role="status">
              Pronto para importar: {novas.length} disciplina(s) nova(s) e {datas.itens.length} data(s).
            </p>
          )
        )}
      </div>
    </Modal>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

type Exclusao =
  | { tipo: 'modelo'; id: string; nome: string }
  | { tipo: 'disciplina'; id: string; nome: string }
  | { tipo: 'data'; id: string; nome: string };

function CartaoModeloAdmin({ modelo, aoEditar, aoExcluir }: { modelo: ModeloCompleto; aoEditar: () => void; aoExcluir: (e: Exclusao) => void }) {
  const [aberto, setAberto] = useState(true);
  const [disciplinaForm, setDisciplinaForm] = useState<{ aberto: boolean; disciplina: ModeloDisciplinaComDatas | null }>({
    aberto: false,
    disciplina: null,
  });
  const [dataForm, setDataForm] = useState<{ disciplina: ModeloDisciplinaComDatas; evento: ModeloEvento | null } | null>(null);
  const [importando, setImportando] = useState(false);
  const alternarPublicacao = useAcaoAdmin(
    () =>
      salvarModelo(
        {
          instituicao: modelo.instituicao,
          curso: modelo.curso,
          periodo: modelo.periodo,
          titulo: modelo.titulo,
          descricao: modelo.descricao,
          publicado: !modelo.publicado,
        },
        modelo.id,
      ),
    modelo.publicado ? 'Modelo despublicado.' : 'Modelo publicado.',
  );

  return (
    <Cartao className="overflow-hidden">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="flex flex-1 items-start gap-3 text-left">
          <ChevronDown aria-hidden className={`mt-1 size-4 shrink-0 text-stone-400 transition-transform ${aberto ? '' : '-rotate-90'}`} />
          <span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-lg font-semibold">{modelo.titulo}</span>
              {modelo.publicado ? <Etiqueta tom="verde">Publicado</Etiqueta> : <Etiqueta>Rascunho</Etiqueta>}
            </span>
            <span className="block text-sm text-stone-500">
              {modelo.instituicao} · {modelo.curso} · {modelo.periodo}º período · {modelo.modelos_disciplinas.length} disciplina(s)
            </span>
          </span>
        </button>
        <div className="flex flex-wrap gap-2">
          <Botao tamanho="sm" variante="secundario" onClick={() => alternarPublicacao.mutate(undefined)} carregando={alternarPublicacao.isPending}>
            {modelo.publicado ? 'Despublicar' : 'Publicar'}
          </Botao>
          <Botao tamanho="sm" variante="secundario" icone={<Upload aria-hidden className="size-3.5" />} onClick={() => setImportando(true)}>
            Importar
          </Botao>
          <BotaoIcone rotulo="Editar modelo" onClick={aoEditar}>
            <Pencil aria-hidden className="size-4" />
          </BotaoIcone>
          <BotaoIcone rotulo="Excluir modelo" className="hover:text-red-600" onClick={() => aoExcluir({ tipo: 'modelo', id: modelo.id, nome: modelo.titulo })}>
            <Trash2 aria-hidden className="size-4" />
          </BotaoIcone>
        </div>
      </div>

      {aberto && (
        <div className="border-t border-stone-100">
          {modelo.modelos_disciplinas.length === 0 && (
            <p className="px-5 py-4 text-sm text-stone-500">Nenhuma disciplina. Adicione uma a uma ou use a importação.</p>
          )}
          <ul className="divide-y divide-stone-100">
            {modelo.modelos_disciplinas.map((d) => (
              <li key={d.id} className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <PontoCor cor={d.cor} />
                  <span className="flex-1 text-sm font-medium">{d.nome}</span>
                  <BotaoIcone rotulo={`Nova data em ${d.nome}`} onClick={() => setDataForm({ disciplina: d, evento: null })}>
                    <CalendarPlus aria-hidden className="size-4" />
                  </BotaoIcone>
                  <BotaoIcone rotulo={`Editar ${d.nome}`} onClick={() => setDisciplinaForm({ aberto: true, disciplina: d })}>
                    <Pencil aria-hidden className="size-4" />
                  </BotaoIcone>
                  <BotaoIcone rotulo={`Excluir ${d.nome}`} className="hover:text-red-600" onClick={() => aoExcluir({ tipo: 'disciplina', id: d.id, nome: d.nome })}>
                    <Trash2 aria-hidden className="size-4" />
                  </BotaoIcone>
                </div>
                {d.modelos_eventos.length > 0 && (
                  <ul className="mt-2 ml-5 space-y-1">
                    {d.modelos_eventos.map((ev) => (
                      <li key={ev.id} className="flex items-center gap-2 text-xs text-stone-600">
                        <span className="w-20 shrink-0 tabular-nums">{formatarDataCurta(ev.data)}</span>
                        <span className="flex-1 truncate">
                          {ev.titulo} · {rotuloTipo(ev.tipo)}
                          {ev.hora_inicio ? ` · ${formatarHora(ev.hora_inicio)}` : ''}
                        </span>
                        <button type="button" className="font-medium text-vinho-700 hover:underline" onClick={() => setDataForm({ disciplina: d, evento: ev })}>
                          Editar
                        </button>
                        <button type="button" className="font-medium text-red-600 hover:underline" onClick={() => aoExcluir({ tipo: 'data', id: ev.id, nome: ev.titulo })}>
                          Excluir
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t border-stone-100 px-5 py-3">
            <Botao tamanho="sm" variante="suave" icone={<Plus aria-hidden className="size-3.5" />} onClick={() => setDisciplinaForm({ aberto: true, disciplina: null })}>
              Adicionar disciplina
            </Botao>
          </div>
        </div>
      )}

      {disciplinaForm.aberto && (
        <FormularioDisciplinaModelo
          modeloId={modelo.id}
          disciplina={disciplinaForm.disciplina}
          coresEmUso={modelo.modelos_disciplinas.map((d) => d.cor)}
          aoFechar={() => setDisciplinaForm({ aberto: false, disciplina: null })}
        />
      )}
      {dataForm && <FormularioDataModelo disciplina={dataForm.disciplina} evento={dataForm.evento} aoFechar={() => setDataForm(null)} />}
      {importando && <ImportacaoEmLote modelo={modelo} aoFechar={() => setImportando(false)} />}
    </Cartao>
  );
}

export default function Administracao() {
  useTituloPagina('Administração');
  const { data: modelos, isPending, isError, error, refetch } = useModelos(false);
  const [formModelo, setFormModelo] = useState<{ aberto: boolean; modelo: ModeloCompleto | null }>({ aberto: false, modelo: null });
  const [exclusao, setExclusao] = useState<Exclusao | null>(null);
  const excluir = useAcaoAdmin((e: Exclusao) => {
    if (e.tipo === 'modelo') return excluirModelo(e.id);
    if (e.tipo === 'disciplina') return excluirModeloDisciplina(e.id);
    return excluirModeloEvento(e.id);
  }, 'Item excluído.');

  return (
    <>
      <TituloPagina
        titulo="Administração"
        descricao="Modelos de período disponibilizados aos alunos. Alterações não afetam disciplinas que os alunos já adicionaram."
        acoes={
          <Botao icone={<Plus aria-hidden className="size-4" />} onClick={() => setFormModelo({ aberto: true, modelo: null })}>
            Novo modelo
          </Botao>
        }
      />
      {isPending ? (
        <Carregando />
      ) : isError ? (
        <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />
      ) : !modelos?.length ? (
        <EstadoVazio titulo="Nenhum modelo cadastrado" descricao="Crie um modelo e adicione as disciplinas e datas oficiais do período." />
      ) : (
        <div className="space-y-4">
          {modelos.map((m) => (
            <CartaoModeloAdmin key={m.id} modelo={m} aoEditar={() => setFormModelo({ aberto: true, modelo: m })} aoExcluir={setExclusao} />
          ))}
        </div>
      )}

      {formModelo.aberto && <FormularioModelo modelo={formModelo.modelo} aoFechar={() => setFormModelo({ aberto: false, modelo: null })} />}
      <Confirmacao
        aberto={!!exclusao}
        titulo="Excluir do modelo?"
        mensagem={`"${exclusao?.nome ?? ''}" será removido do modelo${
          exclusao?.tipo === 'data' ? '' : ', junto com o que estiver dentro dele'
        }. Os dados que os alunos já importaram continuam nas contas deles.`}
        carregando={excluir.isPending}
        aoConfirmar={() => exclusao && excluir.mutateAsync(exclusao).then(() => setExclusao(null), () => undefined)}
        aoCancelar={() => setExclusao(null)}
      />
    </>
  );
}
