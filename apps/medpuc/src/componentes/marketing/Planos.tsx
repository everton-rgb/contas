import { Check } from 'lucide-react';
import { usePlanosDisponiveis } from '../../hooks/useConta';
import { limiteDe } from '../../hooks/useConta';
import { BotaoLink } from '../ui/Botao';
import { Esqueleto } from '../ui/Estados';

const INCLUIDO = [
  'Calendário acadêmico (mês, semana e dia)',
  'Conteúdos de estudo com progresso',
  'Tarefas com prazo e prioridade',
  'Caderno digital com salvamento automático',
  'Modelo de disciplinas do 3º período',
];

export function SecaoPlanos() {
  const { data: planos, isPending, isError } = usePlanosDisponiveis();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-vinho-200 bg-white p-6 shadow-cartao sm:p-8">
        {isPending ? (
          <Esqueleto className="h-40" />
        ) : (
          (isError || !planos?.length ? [null] : planos).map((plano) => {
            const limite = plano ? limiteDe(plano.limites, 'disciplinas') : null;
            return (
              <div key={plano?.id ?? 'gratuito'}>
                <p className="text-sm font-semibold tracking-wide text-vinho-700 uppercase">{plano?.nome ?? 'Gratuito'}</p>
                <p className="mt-2 font-serif text-4xl font-semibold">R$ 0</p>
                <p className="mt-2 text-sm text-stone-500">
                  {plano?.descricao ?? 'Todos os recursos atuais da plataforma.'}
                  {limite !== null && ` Até ${limite} disciplinas.`}
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-stone-700">
                  {INCLUIDO.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-vinho-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BotaoLink to="/cadastro" tamanho="lg" className="mt-8 w-full sm:w-auto">
                  Criar conta gratuita
                </BotaoLink>
              </div>
            );
          })
        )}
      </div>
      <div className="flex flex-col justify-center rounded-2xl border border-dashed border-stone-300 p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-stone-500 uppercase">Planos premium</p>
        <p className="mt-2 font-serif text-2xl font-semibold text-stone-800">Em desenvolvimento</p>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Recursos avançados estão sendo planejados. Nenhuma cobrança é feita hoje — quando houver planos pagos, a
          contratação será opcional e informada com antecedência.
        </p>
      </div>
    </div>
  );
}
