/**
 * Notificacoes.tsx — avisos breves ("Prova salva", "Não foi possível...").
 * Anunciados por leitores de tela via aria-live.
 */

import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tipo = 'sucesso' | 'erro';
type Aviso = { id: number; tipo: Tipo; mensagem: string };

type ContextoValor = {
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
};

const ContextoNotificacoes = createContext<ContextoValor | null>(null);

export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(1);

  const remover = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

  const adicionar = useCallback(
    (tipo: Tipo, mensagem: string) => {
      const id = proximo.current++;
      setAvisos((lista) => [...lista.slice(-3), { id, tipo, mensagem }]);
      setTimeout(() => remover(id), tipo === 'erro' ? 7000 : 4000);
    },
    [remover],
  );

  const valor = useMemo<ContextoValor>(
    () => ({ sucesso: (m) => adicionar('sucesso', m), erro: (m) => adicionar('erro', m) }),
    [adicionar],
  );

  return (
    <ContextoNotificacoes.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6"
      >
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            role={aviso.tipo === 'erro' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm animate-deslizar items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-flutuante"
          >
            {aviso.tipo === 'sucesso' ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            ) : (
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
            )}
            <p className="flex-1 text-stone-700">{aviso.mensagem}</p>
            <button
              type="button"
              onClick={() => remover(aviso.id)}
              className="-m-1 rounded p-1 text-stone-400 hover:text-stone-600"
              aria-label="Fechar aviso"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ContextoNotificacoes.Provider>
  );
}

export function useNotificacoes(): ContextoValor {
  const contexto = useContext(ContextoNotificacoes);
  if (!contexto) throw new Error('useNotificacoes precisa estar dentro de ProvedorNotificacoes');
  return contexto;
}
