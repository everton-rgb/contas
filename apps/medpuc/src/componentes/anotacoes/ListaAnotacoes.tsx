import { NotebookPen, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useBuscaAnotacoes } from '../../hooks/useAnotacoes';
import { useMapaDisciplinas } from '../../hooks/useDisciplinas';
import { useDebounce } from '../../hooks/useUtilitarios';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Botao } from '../ui/Botao';
import { SelecaoCompacta } from '../ui/Campos';
import { EstadoVazio, EsqueletoLista, MensagemErro } from '../ui/Estados';
import { Etiqueta } from '../ui/Visuais';
import type { EstadoNavegacaoAnotacao } from '../../tipos/dominio';

type Ordem = 'recentes' | 'antigas' | 'titulo';

function quando(iso: string): string {
  const data = new Date(iso);
  const dias = (Date.now() - data.getTime()) / 86_400_000;
  return dias < 7
    ? `há ${formatDistanceToNowStrict(data, { locale: ptBR })}`
    : format(data, "d 'de' MMM 'de' yyyy", { locale: ptBR });
}

export function ListaAnotacoes({ disciplinaId }: { disciplinaId?: string }) {
  const navegar = useNavigate();
  const local = useLocation();
  const disciplinas = useMapaDisciplinas();
  const [termo, setTermo] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [ordem, setOrdem] = useState<Ordem>('recentes');
  const termoAtrasado = useDebounce(termo, 250);
  const disciplina = disciplinaId ?? (filtroDisciplina || null);
  const { data, isPending, isError, error, refetch, isFetching } = useBuscaAnotacoes(termoAtrasado, disciplina);

  const anotacoes = useMemo(() => {
    const lista = [...(data ?? [])];
    if (ordem === 'antigas') lista.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    else if (ordem === 'titulo') lista.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    return lista;
  }, [data, ordem]);

  function nova() {
    const estado: EstadoNavegacaoAnotacao = {
      voltar: `${local.pathname}${local.search}`,
      disciplinaId: disciplina,
      rascunho: crypto.randomUUID(),
    };
    navegar('/app/anotacoes/nova', { state: estado });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Pesquisar por título ou conteúdo"
            aria-label="Pesquisar anotações"
            className="h-10 w-full rounded-lg border border-stone-300 bg-white pr-3 pl-9 text-sm shadow-sm placeholder:text-stone-400 focus:border-vinho-500 focus:ring-2 focus:ring-vinho-100 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {!disciplinaId && (
            <SelecaoCompacta rotulo="Filtrar por disciplina" value={filtroDisciplina} onChange={(e) => setFiltroDisciplina(e.target.value)}>
              <option value="">Todas as disciplinas</option>
              {[...disciplinas.values()].map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </SelecaoCompacta>
          )}
          <SelecaoCompacta rotulo="Ordenar anotações" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
            <option value="recentes">Atualizadas recentemente</option>
            <option value="antigas">Atualizadas há mais tempo</option>
            <option value="titulo">Título (A–Z)</option>
          </SelecaoCompacta>
          <Botao icone={<Plus aria-hidden className="size-4" />} onClick={nova}>
            Nova anotação
          </Botao>
        </div>
      </div>

      {isPending ? (
        <EsqueletoLista />
      ) : isError ? (
        <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />
      ) : anotacoes.length === 0 ? (
        <EstadoVazio
          icone={<NotebookPen aria-hidden className="size-5" />}
          titulo={termoAtrasado ? 'Nenhuma anotação encontrada' : 'Nenhuma anotação ainda'}
          descricao={
            termoAtrasado
              ? `Nada corresponde a "${termoAtrasado}". Tente outro termo.`
              : 'Crie resumos, esquemas e checklists. Tudo é salvo automaticamente.'
          }
          acao={!termoAtrasado && <Botao variante="suave" onClick={nova}>Criar anotação</Botao>}
        />
      ) : (
        <ul className={`grid gap-3 sm:grid-cols-2 ${isFetching ? 'opacity-70' : ''} transition-opacity`}>
          {anotacoes.map((a) => {
            const d = a.disciplina_id ? disciplinas.get(a.disciplina_id) : undefined;
            return (
              <li key={a.id}>
                <Link
                  to={`/app/anotacoes/${a.id}`}
                  state={{ voltar: `${local.pathname}${local.search}` } satisfies EstadoNavegacaoAnotacao}
                  className="flex h-full flex-col rounded-2xl border border-stone-200/80 bg-white p-4 shadow-cartao transition-shadow hover:shadow-flutuante"
                >
                  <span className="line-clamp-1 font-semibold text-stone-900">{a.titulo}</span>
                  <span className="mt-1 line-clamp-2 min-h-10 text-sm text-stone-500">{a.trecho || 'Sem conteúdo ainda.'}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    {!disciplinaId && (d ? <Etiqueta cor={d.cor}>{d.nome}</Etiqueta> : <Etiqueta>Geral</Etiqueta>)}
                    <span>Atualizada {quando(a.updated_at)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
