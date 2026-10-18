/**
 * Configuração inicial: o aluno copia disciplinas de um modelo publicado
 * para a própria conta. O modelo nunca é editado por aqui.
 */

import { CalendarCheck2, Check, LayoutTemplate, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { FormularioDisciplina } from '../../componentes/disciplinas/FormularioDisciplina';
import { Botao } from '../../componentes/ui/Botao';
import { Carregando, EstadoVazio, MensagemErro } from '../../componentes/ui/Estados';
import { Cartao, PontoCor, TituloPagina } from '../../componentes/ui/Visuais';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useDisciplinas } from '../../hooks/useDisciplinas';
import { useImportarModelo, useModelos } from '../../hooks/useModelos';
import { useTituloPagina } from '../../hooks/useUtilitarios';
import { traduzirErro } from '../../lib/erros';
import { plural } from '../../lib/texto';
import type { ModeloCompleto } from '../../servicos/modelos';

function CartaoModelo({ modelo, jaAdicionadas }: { modelo: ModeloCompleto; jaAdicionadas: Set<string> }) {
  const avisos = useNotificacoes();
  const navegar = useNavigate();
  const importar = useImportarModelo();
  const disponiveis = modelo.modelos_disciplinas.filter((d) => !jaAdicionadas.has(d.id));
  const [selecionadas, setSelecionadas] = useState<Set<string>>(() => new Set(disponiveis.map((d) => d.id)));
  const [importarDatas, setImportarDatas] = useState(true);

  useEffect(() => {
    setSelecionadas((atual) => new Set([...atual].filter((id) => !jaAdicionadas.has(id))));
  }, [jaAdicionadas]);

  const totalDatas = modelo.modelos_disciplinas
    .filter((d) => selecionadas.has(d.id))
    .reduce((n, d) => n + d.modelos_eventos.length, 0);

  function alternar(id: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  async function adicionar() {
    try {
      const criadas = await importar.mutateAsync({ ids: [...selecionadas], importarDatas: importarDatas && totalDatas > 0 });
      avisos.sucesso(`${plural(criadas.length, 'disciplina adicionada', 'disciplinas adicionadas')} à sua conta.`);
      navegar('/app/disciplinas');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <Cartao className="overflow-hidden">
      <div className="border-b border-stone-100 p-5">
        <p className="text-xs font-semibold tracking-wide text-vinho-700 uppercase">
          {modelo.instituicao} · {modelo.curso} · {modelo.periodo}º período
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold">{modelo.titulo}</h2>
        {modelo.descricao && <p className="mt-1 text-sm text-stone-500">{modelo.descricao}</p>}
      </div>
      <ul className="divide-y divide-stone-100">
        {modelo.modelos_disciplinas.map((d) => {
          const adicionada = jaAdicionadas.has(d.id);
          const marcada = adicionada || selecionadas.has(d.id);
          return (
            <li key={d.id}>
              <label className={`flex items-center gap-3 px-5 py-3 ${adicionada ? 'cursor-default' : 'cursor-pointer hover:bg-stone-50'}`}>
                <input
                  type="checkbox"
                  className="size-4 accent-vinho-600"
                  checked={marcada}
                  disabled={adicionada}
                  onChange={() => alternar(d.id)}
                />
                <PontoCor cor={d.cor} />
                <span className="flex-1 text-sm font-medium text-stone-800">{d.nome}</span>
                <span className="text-xs text-stone-500">
                  {adicionada ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check aria-hidden className="size-3.5" /> Já está na sua conta
                    </span>
                  ) : d.modelos_eventos.length ? (
                    plural(d.modelos_eventos.length, 'data cadastrada', 'datas cadastradas')
                  ) : (
                    'Sem datas no modelo'
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/60 p-5 sm:flex-row sm:items-center">
        {totalDatas > 0 ? (
          <label className="flex flex-1 items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" className="size-4 accent-vinho-600" checked={importarDatas} onChange={(e) => setImportarDatas(e.target.checked)} />
            Importar também {plural(totalDatas, 'data cadastrada', 'datas cadastradas')} no modelo
          </label>
        ) : (
          <p className="flex-1 text-sm text-stone-500">
            Este modelo ainda não tem datas de provas. Depois de adicionar, cadastre as datas da sua turma em cada disciplina.
          </p>
        )}
        <Botao onClick={adicionar} disabled={selecionadas.size === 0} carregando={importar.isPending}>
          {selecionadas.size
            ? `Adicionar ${plural(selecionadas.size, 'disciplina', 'disciplinas')}`
            : disponiveis.length
              ? 'Selecione disciplinas'
              : 'Todas já adicionadas'}
        </Botao>
      </div>
    </Cartao>
  );
}

export function ConfiguracaoInicial() {
  useTituloPagina('Configuração inicial');
  const { data: modelos, isPending, isError, error, refetch } = useModelos(true);
  const { data: disciplinas = [] } = useDisciplinas();
  const [criando, setCriando] = useState(false);
  const jaAdicionadas = useMemo(
    () => new Set(disciplinas.map((d) => d.modelo_disciplina_id).filter((id): id is string => !!id)),
    [disciplinas],
  );

  return (
    <>
      <TituloPagina
        titulo="Configuração inicial do período"
        descricao="Monte sua organização a partir de um modelo e ajuste tudo à sua turma."
      />

      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icone: LayoutTemplate, texto: 'Escolha as disciplinas do modelo que você está cursando.' },
          { icone: Plus, texto: 'Edite nomes e cores ou crie disciplinas personalizadas.' },
          { icone: CalendarCheck2, texto: 'Cadastre as datas das suas provas: elas variam por turma e professor.' },
        ].map(({ icone: Icone, texto }, i) => (
          <li key={texto} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-vinho-50 text-vinho-600">
              <Icone aria-hidden className="size-4" />
            </span>
            <span>
              <span className="font-semibold text-stone-800">{i + 1}. </span>
              {texto}
            </span>
          </li>
        ))}
      </ol>

      {isPending ? (
        <Carregando />
      ) : isError ? (
        <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />
      ) : !modelos?.length ? (
        <EstadoVazio
          icone={<LayoutTemplate aria-hidden className="size-5" />}
          titulo="Nenhum modelo disponível ainda"
          descricao="Quando o administrador publicar a lista de disciplinas do período, ela aparecerá aqui. Enquanto isso, crie suas disciplinas."
          acao={<Botao onClick={() => setCriando(true)}>Criar disciplina</Botao>}
        />
      ) : (
        <div className="space-y-6">
          {modelos.map((m) => (
            <CartaoModelo key={m.id} modelo={m} jaAdicionadas={jaAdicionadas} />
          ))}
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-stone-300 p-5 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-stone-600">Cursa alguma disciplina que não está no modelo?</p>
            <Botao variante="secundario" icone={<Plus aria-hidden className="size-4" />} onClick={() => setCriando(true)}>
              Criar disciplina personalizada
            </Botao>
          </div>
        </div>
      )}

      <FormularioDisciplina aberto={criando} aoFechar={() => setCriando(false)} />
    </>
  );
}
