import { Check } from 'lucide-react';
import { useId } from 'react';
import { PALETA_DISCIPLINAS } from '../../lib/cores';

export function SeletorCor({ valor, aoMudar, rotulo = 'Cor', erro }: { valor: string; aoMudar: (cor: string) => void; rotulo?: string; erro?: string }) {
  const id = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-stone-700">{rotulo}</legend>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-describedby={erro ? `${id}-erro` : undefined}>
        {PALETA_DISCIPLINAS.map((cor) => {
          const selecionada = cor.toLowerCase() === valor.toLowerCase();
          return (
            <button
              key={cor}
              type="button"
              role="radio"
              aria-checked={selecionada}
              aria-label={`Cor ${cor}`}
              onClick={() => aoMudar(cor)}
              className={`flex size-8 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-110 ${
                selecionada ? 'ring-2 ring-stone-800' : ''
              }`}
              style={{ backgroundColor: cor }}
            >
              {selecionada && <Check aria-hidden className="size-4 text-white" />}
            </button>
          );
        })}
        <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-stone-400 text-xs text-stone-500 hover:border-stone-600" title="Outra cor">
          <span aria-hidden>+</span>
          <input
            type="color"
            value={valor}
            onChange={(e) => aoMudar(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Escolher outra cor"
          />
        </label>
      </div>
      {erro && (
        <p id={`${id}-erro`} className="mt-1.5 text-xs text-red-600">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
