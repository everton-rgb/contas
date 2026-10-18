import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  ListChecks,
  NotebookPen,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router';
import { SecaoPlanos } from '../../componentes/marketing/Planos';
import { BotaoLink } from '../../componentes/ui/Botao';
import { Marca } from '../../componentes/ui/Visuais';
import { useAutenticacao } from '../../contextos/Autenticacao';
import { useTituloPagina } from '../../hooks/useUtilitarios';

const RECURSOS = [
  {
    icone: CalendarDays,
    titulo: 'Calendário acadêmico',
    texto: 'Provas, avaliações práticas, trabalhos, aulas e revisões em visões mensal, semanal e diária, com cores por disciplina.',
  },
  {
    icone: BookOpen,
    titulo: 'Minhas disciplinas',
    texto: 'Uma página por disciplina com visão geral, conteúdos, avaliações, anotações e tarefas — tudo conectado.',
  },
  {
    icone: NotebookPen,
    titulo: 'Caderno digital',
    texto: 'Títulos, listas e checklists, com salvamento automático e pesquisa por título e conteúdo.',
  },
  {
    icone: ListChecks,
    titulo: 'Tarefas e progresso',
    texto: 'Prazos, prioridades e o percentual de conteúdos estudados em cada disciplina.',
  },
  {
    icone: GraduationCap,
    titulo: 'Pronto para o 3º período',
    texto: 'Adicione as disciplinas do período em um clique e ajuste nomes, cores e datas à sua turma.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Privado por padrão',
    texto: 'Cada conta é isolada no banco de dados. Ninguém além de você acessa suas anotações e seu calendário.',
  },
];

const PASSOS = [
  { titulo: 'Crie sua conta', texto: 'Cadastro com e-mail e senha, em menos de um minuto.' },
  { titulo: 'Monte seu período', texto: 'Escolha as disciplinas do modelo ou crie as suas.' },
  { titulo: 'Cadastre suas datas', texto: 'Provas e entregas da sua turma aparecem no calendário e no painel.' },
];

function Ilustracao() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md select-none">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-vinho-100 via-white to-stone-100 blur-2xl" />
      <div className="relative space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-flutuante">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide text-stone-400 uppercase">Próxima prova</span>
          <span className="rounded-full bg-vinho-50 px-2 py-0.5 text-[11px] font-medium text-vinho-700">contagem regressiva</span>
        </div>
        <div className="flex items-end gap-4">
          {['dias', 'horas', 'min'].map((u, i) => (
            <div key={u} className="text-center">
              <div className="font-serif text-3xl font-semibold text-stone-900">{['05', '14', '32'][i]}</div>
              <div className="text-[11px] text-stone-400">{u}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 pt-2">
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} className="flex aspect-square flex-col justify-between rounded-md bg-stone-50 p-1 text-[9px] text-stone-400">
              <span>{i + 1}</span>
              {[4, 11, 17, 23].includes(i) && <span className="size-1.5 rounded-full bg-vinho-500" />}
              {[8, 19].includes(i) && <span className="size-1.5 rounded-full bg-teal-600" />}
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-1">
          {['#8C1D40', '#0F766E', '#2F5D8A'].map((cor, i) => (
            <div key={cor} className="flex items-center gap-3">
              <span className="size-2 rounded-full" style={{ backgroundColor: cor }} />
              <div className="h-2 flex-1 rounded-full bg-stone-100">
                <div className="h-full rounded-full" style={{ width: `${[72, 45, 88][i]}%`, backgroundColor: cor }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Inicio() {
  useTituloPagina('');
  const { sessao } = useAutenticacao();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-papel/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" aria-label="MedPUC — página inicial">
            <Marca />
          </Link>
          <nav aria-label="Página inicial" className="flex items-center gap-1 sm:gap-2">
            <a href="#recursos" className="hidden rounded-lg px-3 py-2 text-sm text-stone-600 hover:text-stone-900 sm:inline">
              Recursos
            </a>
            <a href="#planos" className="hidden rounded-lg px-3 py-2 text-sm text-stone-600 hover:text-stone-900 sm:inline">
              Planos
            </a>
            {sessao ? (
              <BotaoLink to="/app" tamanho="sm">
                Abrir painel
              </BotaoLink>
            ) : (
              <>
                <Link to="/entrar" className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:text-stone-900">
                  Entrar
                </Link>
                <BotaoLink to="/cadastro" tamanho="sm">
                  Criar conta
                </BotaoLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-vinho-200 bg-vinho-50 px-3 py-1 text-xs font-medium text-vinho-700">
              <ClipboardList aria-hidden className="size-3.5" />
              Feito para estudantes de Medicina
            </p>
            <h1 className="mt-5 font-serif text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
              Seu período de Medicina, <span className="text-vinho-600">organizado</span> do primeiro ao último dia.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
              Calendário de provas, conteúdos por disciplina, tarefas e um caderno digital — em um só lugar e
              sincronizado entre computador, tablet e celular.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <BotaoLink to={sessao ? '/app' : '/cadastro'} tamanho="lg" icone={<ArrowRight aria-hidden className="size-4" />}>
                {sessao ? 'Abrir meu painel' : 'Começar gratuitamente'}
              </BotaoLink>
              {!sessao && (
                <BotaoLink to="/entrar" variante="secundario" tamanho="lg">
                  Já tenho conta
                </BotaoLink>
              )}
            </div>
          </div>
          <Ilustracao />
        </section>

        <section id="recursos" className="border-y border-stone-200 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="max-w-2xl font-serif text-3xl font-semibold tracking-tight">
              Tudo que o período exige, sem planilhas espalhadas.
            </h2>
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
                <div key={titulo}>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-vinho-50 text-vinho-600">
                    <Icone aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{titulo}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-stone-600">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Como funciona</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-cartao">
                <span className="font-serif text-3xl font-semibold text-vinho-300">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{passo.titulo}</h3>
                <p className="mt-1.5 text-sm leading-6 text-stone-600">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="planos" className="border-t border-stone-200 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Planos</h2>
            <p className="mt-2 text-stone-600">Comece de graça. Sem cartão de crédito.</p>
            <div className="mt-10">
              <SecaoPlanos />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Marca />
          <p className="max-w-xl text-xs leading-5">
            O MedPUC é uma ferramenta independente de organização de estudos e não é um serviço oficial da PUCPR. Datas
            e conteúdos são cadastrados por cada estudante.
          </p>
        </div>
        <p className="mx-auto mt-8 max-w-6xl px-4 text-center text-xs text-stone-500 sm:px-6">
          Criado por Giovana Borguezani
        </p>
      </footer>
    </div>
  );
}
