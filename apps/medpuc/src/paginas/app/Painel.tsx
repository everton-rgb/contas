import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  GraduationCap,
  ListChecks,
  NotebookPen,
  Plus,
  Timer,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FormularioEvento } from '../../componentes/eventos/FormularioEvento';
import { corDoEvento, horarioDoEvento, ItemEvento } from '../../componentes/eventos/ItemEvento';
import { FormularioTarefa } from '../../componentes/tarefas/FormularioTarefa';
import { ItemTarefa } from '../../componentes/tarefas/ItemTarefa';
import { Botao, BotaoLink } from '../../componentes/ui/Botao';
import { EstadoVazio, Esqueleto, MensagemErro } from '../../componentes/ui/Estados';
import { BarraProgresso, CabecalhoCartao, Cartao, PontoCor } from '../../componentes/ui/Visuais';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { usePerfil } from '../../hooks/useConta';
import { useResumoAcademico } from '../../hooks/useResumoAcademico';
import { useEventosNoIntervalo } from '../../hooks/useEventos';
import { useConcluirTarefa } from '../../hooks/useTarefas';
import { useAgora, useTituloPagina } from '../../hooks/useUtilitarios';
import { comTransparencia } from '../../lib/cores';
import {
  contagemRegressiva,
  diasDaSemana,
  formatarData,
  formatarDataCompleta,
  formatarDiaSemana,
  hojeISO,
} from '../../lib/datas';
import { traduzirErro } from '../../lib/erros';
import { calcularProgresso, compararEventos, proximaProva, proximosCompromissos, tarefasPendentes } from '../../lib/resumo';
import { primeiroNome, saudacao } from '../../lib/texto';
import { rotuloTipo, type DadosEvento, type Evento, type Tarefa } from '../../tipos/dominio';

function ContagemProva({ evento, cor, nomeDisciplina }: { evento: Evento; cor: string; nomeDisciplina?: string }) {
  const agora = useAgora(30_000);
  const { dias, horas, minutos, encerrada } = contagemRegressiva(evento.data, evento.hora_inicio, agora);
  const unidades = [
    { valor: dias, rotulo: dias === 1 ? 'dia' : 'dias' },
    { valor: horas, rotulo: horas === 1 ? 'hora' : 'horas' },
    { valor: minutos, rotulo: 'min' },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-flutuante sm:p-6" style={{ backgroundColor: cor }}>
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/80 uppercase">
        <Timer aria-hidden className="size-4" /> Próxima prova
      </p>
      <h2 className="mt-2 font-serif text-xl leading-snug font-semibold text-white sm:text-2xl">{evento.titulo}</h2>
      <p className="mt-1 text-sm text-white/80">
        {[nomeDisciplina, rotuloTipo(evento.tipo)].filter(Boolean).join(' · ')}
      </p>
      <p className="text-sm text-white/80">
        {formatarDataCompleta(evento.data)} · {horarioDoEvento(evento)}
      </p>
      <div className="mt-5 flex gap-3" role="timer" aria-label={encerrada ? 'A prova está começando' : `Faltam ${dias} dias, ${horas} horas e ${minutos} minutos`}>
        {encerrada ? (
          <p className="font-serif text-2xl font-semibold">É hoje! Boa prova.</p>
        ) : (
          unidades.map((u) => (
            <div key={u.rotulo} className="min-w-16 rounded-xl bg-white/15 px-3 py-2 text-center backdrop-blur-sm">
              <span className="block font-serif text-3xl leading-none font-semibold tabular-nums">{String(u.valor).padStart(2, '0')}</span>
              <span className="mt-1 block text-[11px] text-white/80">{u.rotulo}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Painel() {
  useTituloPagina('Painel');
  const navegar = useNavigate();
  const avisos = useNotificacoes();
  const { data: perfil } = usePerfil();
  const resumo = useResumoAcademico();
  const concluir = useConcluirTarefa();
  const [formEvento, setFormEvento] = useState<{ aberto: boolean; evento: Evento | null; padrao?: Partial<DadosEvento> }>({
    aberto: false,
    evento: null,
  });
  const [formTarefa, setFormTarefa] = useState<{ aberto: boolean; tarefa: Tarefa | null }>({ aberto: false, tarefa: null });

  const { hoje, disciplinas, eventos, tarefas, conteudos } = resumo;
  const mapa = new Map(disciplinas.map((d) => [d.id, d]));
  const prova = proximaProva(eventos, hoje);
  const compromissos = proximosCompromissos(eventos, hoje, 6).filter((e) => e.id !== prova?.id).slice(0, 5);
  const pendentes = tarefasPendentes(tarefas);
  const progressoGeral = calcularProgresso(conteudos);
  const semana = diasDaSemana(new Date());
  const { data: eventosDaSemana = [] } = useEventosNoIntervalo(semana[0], semana[6]);

  function novaAnotacao() {
    navegar('/app/anotacoes/nova', { state: { voltar: '/app', rascunho: crypto.randomUUID() } });
  }

  function alternarTarefa(tarefa: Tarefa) {
    concluir.mutate(
      { id: tarefa.id, concluida: tarefa.status !== 'concluida' },
      {
        onSuccess: () => avisos.sucesso(tarefa.status === 'concluida' ? 'Tarefa reaberta.' : 'Tarefa concluída.'),
        onError: (erro) => avisos.erro(traduzirErro(erro)),
      },
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500 first-letter:uppercase">{formatarDataCompleta(hojeISO())}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
            {saudacao()}
            {perfil?.nome ? `, ${primeiroNome(perfil.nome)}` : ''}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao
            icone={<CalendarPlus aria-hidden className="size-4" />}
            onClick={() => setFormEvento({ aberto: true, evento: null, padrao: { tipo: 'prova' } })}
          >
            Adicionar prova
          </Botao>
          <Botao variante="secundario" icone={<NotebookPen aria-hidden className="size-4" />} onClick={novaAnotacao}>
            Nova anotação
          </Botao>
          <Botao variante="secundario" icone={<ListChecks aria-hidden className="size-4" />} onClick={() => setFormTarefa({ aberto: true, tarefa: null })}>
            Registrar tarefa
          </Botao>
        </div>
      </div>

      {resumo.erro ? (
        <MensagemErro erro={resumo.erro} aoTentarNovamente={resumo.recarregar} />
      ) : resumo.carregando ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Esqueleto className="h-52 rounded-2xl lg:col-span-2" />
          <Esqueleto className="h-52 rounded-2xl" />
          <Esqueleto className="h-64 rounded-2xl lg:col-span-2" />
          <Esqueleto className="h-64 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {disciplinas.length === 0 && (
            <div className="flex flex-col gap-4 rounded-2xl border border-vinho-200 bg-vinho-50/60 p-5 sm:flex-row sm:items-center">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-vinho-600 shadow-sm">
                <GraduationCap aria-hidden className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-stone-900">Configure seu período</p>
                <p className="text-sm text-stone-600">
                  Adicione as disciplinas do 3º período em um clique e depois cadastre as datas das suas provas.
                </p>
              </div>
              <BotaoLink to="/app/configuracao" icone={<ArrowRight aria-hidden className="size-4" />}>
                Começar
              </BotaoLink>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {prova ? (
                <button type="button" className="block w-full text-left" onClick={() => setFormEvento({ aberto: true, evento: prova })}>
                  <ContagemProva
                    evento={prova}
                    cor={corDoEvento(prova, prova.disciplina_id ? mapa.get(prova.disciplina_id) : null)}
                    nomeDisciplina={prova.disciplina_id ? mapa.get(prova.disciplina_id)?.nome : undefined}
                  />
                </button>
              ) : (
                <Cartao className="flex h-full flex-col items-start justify-center p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                    <Timer aria-hidden className="size-4" /> Próxima prova
                  </p>
                  <p className="mt-2 font-serif text-xl font-semibold text-stone-800">Nenhuma prova agendada</p>
                  <p className="mt-1 text-sm text-stone-500">Cadastre as provas da sua turma para ver a contagem regressiva aqui.</p>
                  <Botao
                    variante="suave"
                    className="mt-4"
                    icone={<Plus aria-hidden className="size-4" />}
                    onClick={() => setFormEvento({ aberto: true, evento: null, padrao: { tipo: 'prova' } })}
                  >
                    Adicionar prova
                  </Botao>
                </Cartao>
              )}
            </div>

            <Cartao>
              <CabecalhoCartao titulo="Progresso de estudo" icone={<BookOpen aria-hidden className="size-4" />} />
              <div className="px-5 pb-5">
                <p className="font-serif text-4xl font-semibold text-stone-900">
                  {progressoGeral.percentual}
                  <span className="text-xl text-stone-400">%</span>
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {progressoGeral.total
                    ? `${progressoGeral.concluidos} de ${progressoGeral.total} conteúdos concluídos`
                    : 'Cadastre conteúdos nas disciplinas para acompanhar o progresso.'}
                </p>
                <div className="mt-3">
                  <BarraProgresso percentual={progressoGeral.percentual} rotulo="Progresso geral de conteúdos" />
                </div>
                {progressoGeral.emAndamento > 0 && (
                  <p className="mt-2 text-xs text-stone-500">{progressoGeral.emAndamento} em andamento</p>
                )}
              </div>
            </Cartao>
          </div>

          <Cartao>
            <CabecalhoCartao
              titulo="Esta semana"
              icone={<CalendarDays aria-hidden className="size-4" />}
              acao={
                <Link to="/app/calendario?vista=semana" className="text-sm font-medium text-vinho-700 hover:underline">
                  Abrir calendário
                </Link>
              }
            />
            <div className="grid grid-cols-7 gap-1 px-3 pb-4 sm:gap-2 sm:px-5">
              {semana.map((dia) => {
                const doDia = eventosDaSemana.filter((e) => e.data === dia && e.status !== 'cancelado').sort(compararEventos);
                const ehHoje = dia === hoje;
                return (
                  <Link
                    key={dia}
                    to={`/app/calendario?vista=dia&data=${dia}`}
                    aria-label={`${formatarData(dia, "EEEE, d 'de' MMMM")}: ${doDia.length} compromisso(s)`}
                    className={`flex min-h-24 flex-col rounded-xl border p-1.5 transition-colors hover:border-stone-300 sm:p-2 ${
                      ehHoje ? 'border-vinho-300 bg-vinho-50/50' : 'border-stone-100'
                    } ${dia < hoje ? 'opacity-60' : ''}`}
                  >
                    <span className={`text-center text-[10px] font-semibold uppercase sm:text-left ${ehHoje ? 'text-vinho-700' : 'text-stone-500'}`}>
                      {formatarDiaSemana(dia)}
                    </span>
                    <span className={`text-center font-serif text-lg font-semibold sm:text-left ${ehHoje ? 'text-vinho-700' : 'text-stone-800'}`}>
                      {formatarData(dia, 'd')}
                    </span>
                    <span className="mt-1 flex flex-wrap justify-center gap-1 sm:hidden">
                      {doDia.slice(0, 3).map((e) => (
                        <PontoCor key={e.id} cor={corDoEvento(e, e.disciplina_id ? mapa.get(e.disciplina_id) : null)} className="size-1.5" />
                      ))}
                    </span>
                    <span className="mt-1 hidden space-y-1 sm:block">
                      {doDia.slice(0, 2).map((e) => {
                        const cor = corDoEvento(e, e.disciplina_id ? mapa.get(e.disciplina_id) : null);
                        return (
                          <span
                            key={e.id}
                            className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-stone-700"
                            style={{ backgroundColor: comTransparencia(cor, 0.14), boxShadow: `inset 2px 0 0 ${cor}` }}
                          >
                            {e.titulo}
                          </span>
                        );
                      })}
                      {doDia.length > 2 && <span className="block text-[11px] text-stone-500">+{doDia.length - 2}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Cartao>

          <div className="grid gap-4 lg:grid-cols-2">
            <Cartao>
              <CabecalhoCartao
                titulo="Próximos compromissos"
                icone={<CalendarDays aria-hidden className="size-4" />}
                acao={
                  <Link to="/app/calendario" className="text-sm font-medium text-vinho-700 hover:underline">
                    Ver todos
                  </Link>
                }
              />
              <div className="px-2 pb-3">
                {compromissos.length ? (
                  compromissos.map((e) => (
                    <ItemEvento
                      key={e.id}
                      evento={e}
                      disciplina={e.disciplina_id ? mapa.get(e.disciplina_id) : null}
                      aoAbrir={(ev) => setFormEvento({ aberto: true, evento: ev })}
                    />
                  ))
                ) : (
                  <p className="px-3 pb-2 text-sm text-stone-500">Nenhum compromisso futuro cadastrado.</p>
                )}
              </div>
            </Cartao>

            <Cartao>
              <CabecalhoCartao
                titulo={`Tarefas pendentes${pendentes.length ? ` (${pendentes.length})` : ''}`}
                icone={<ListChecks aria-hidden className="size-4" />}
                acao={
                  <Link to="/app/tarefas" className="text-sm font-medium text-vinho-700 hover:underline">
                    Ver todas
                  </Link>
                }
              />
              <div className="px-2 pb-3">
                {pendentes.length ? (
                  <ul>
                    {pendentes.slice(0, 5).map((t) => (
                      <ItemTarefa
                        key={t.id}
                        tarefa={t}
                        disciplina={t.disciplina_id ? mapa.get(t.disciplina_id) : null}
                        aoAlternar={alternarTarefa}
                        aoAbrir={(tarefa) => setFormTarefa({ aberto: true, tarefa })}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 pb-2 text-sm text-stone-500">Nenhuma tarefa pendente. Bom trabalho!</p>
                )}
              </div>
            </Cartao>
          </div>

          <Cartao>
            <CabecalhoCartao
              titulo="Disciplinas"
              icone={<BookOpen aria-hidden className="size-4" />}
              acao={
                <Link to="/app/disciplinas" className="text-sm font-medium text-vinho-700 hover:underline">
                  Ver disciplinas
                </Link>
              }
            />
            <div className="px-5 pb-5">
              {disciplinas.length === 0 ? (
                <EstadoVazio
                  compacto
                  titulo="Nenhuma disciplina"
                  descricao="Use o modelo do período ou crie disciplinas personalizadas."
                  acao={<BotaoLink to="/app/configuracao" variante="suave">Configurar período</BotaoLink>}
                />
              ) : (
                <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {disciplinas.map((d) => {
                    const progresso = resumo.progresso.get(d.id);
                    const proxima = resumo.proximaAvaliacao.get(d.id);
                    const nPendentes = resumo.pendentes.get(d.id) ?? 0;
                    return (
                      <li key={d.id}>
                        <Link to={`/app/disciplinas/${d.id}`} className="group block">
                          <span className="flex items-center gap-2">
                            <PontoCor cor={d.cor} />
                            <span className="flex-1 truncate text-sm font-medium text-stone-800 group-hover:text-vinho-700">{d.nome}</span>
                            <span className="text-xs text-stone-500">{progresso?.percentual ?? 0}%</span>
                          </span>
                          <span className="mt-1.5 block">
                            <BarraProgresso percentual={progresso?.percentual ?? 0} cor={d.cor} rotulo={`Progresso em ${d.nome}`} />
                          </span>
                          <span className="mt-1 block truncate text-xs text-stone-500">
                            {proxima ? `${rotuloTipo(proxima.tipo)} em ${formatarData(proxima.data)}` : 'Sem avaliação agendada'}
                            {nPendentes ? ` · ${nPendentes} pendente${nPendentes > 1 ? 's' : ''}` : ''}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Cartao>
        </div>
      )}

      <FormularioEvento
        aberto={formEvento.aberto}
        evento={formEvento.evento}
        padrao={formEvento.padrao}
        aoFechar={() => setFormEvento({ aberto: false, evento: null })}
      />
      <FormularioTarefa aberto={formTarefa.aberto} tarefa={formTarefa.tarefa} aoFechar={() => setFormTarefa({ aberto: false, tarefa: null })} />
    </>
  );
}
