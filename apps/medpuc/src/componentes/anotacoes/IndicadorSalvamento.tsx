import { CircleAlert, CloudCheck, LoaderCircle, PencilLine } from 'lucide-react';
import { format } from 'date-fns';
import type { EstadoSalvamento } from '../../hooks/useSalvamentoAutomatico';

type Props = {
  estado: EstadoSalvamento;
  salvoEm: Date | null;
  mensagemErro: string | null;
  aoTentarNovamente: () => void;
};

export function IndicadorSalvamento({ estado, salvoEm, mensagemErro, aoTentarNovamente }: Props) {
  let conteudo;
  if (estado === 'salvando') {
    conteudo = (
      <>
        <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> Salvando…
      </>
    );
  } else if (estado === 'pendente') {
    conteudo = (
      <>
        <PencilLine aria-hidden className="size-3.5" /> Alterações não salvas
      </>
    );
  } else if (estado === 'erro') {
    conteudo = (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-red-700">
        <CircleAlert aria-hidden className="size-3.5" />
        Não foi salvo{mensagemErro ? `: ${mensagemErro}` : '.'}
        <button type="button" onClick={aoTentarNovamente} className="font-medium underline">
          Tentar novamente
        </button>
      </span>
    );
  } else if (estado === 'conflito') {
    conteudo = (
      <span className="inline-flex items-center gap-1.5 text-amber-700">
        <CircleAlert aria-hidden className="size-3.5" /> Salvamento pausado
      </span>
    );
  } else {
    conteudo = (
      <>
        <CloudCheck aria-hidden className="size-3.5 text-emerald-600" />
        {salvoEm ? `Salvo às ${format(salvoEm, 'HH:mm')}` : 'Tudo salvo'}
      </>
    );
  }

  return (
    <p role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-stone-500" data-estado={estado}>
      {conteudo}
    </p>
  );
}
