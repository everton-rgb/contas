/**
 * useSalvamentoAutomatico — salva alterações após uma pausa na digitação.
 *
 * - Um salvamento por vez; alterações feitas durante o envio vão no próximo.
 * - Falha mantém a alteração pendente (nada se perde) e mostra o erro.
 * - Conflito (outro dispositivo salvou antes) pausa o automático até o
 *   usuário decidir entre recarregar e sobrescrever.
 * - Ao sair da página ou esconder a aba, envia o que estiver pendente.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { traduzirErro } from '../lib/erros';

export type EstadoSalvamento = 'ocioso' | 'pendente' | 'salvando' | 'salvo' | 'erro' | 'conflito';

type Opcoes<T> = {
  salvar: (valor: T) => Promise<'salvo' | 'conflito'>;
  atraso?: number;
};

export function useSalvamentoAutomatico<T>({ salvar, atraso = 1000 }: Opcoes<T>) {
  const [estado, setEstado] = useState<EstadoSalvamento>('ocioso');
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const salvarAtual = useRef(salvar);
  const pendente = useRef<{ valor: T } | null>(null);
  const emVoo = useRef<Promise<void> | null>(null);
  const pausado = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    salvarAtual.current = salvar;
  }, [salvar]);

  const descarregar = useCallback(async (): Promise<void> => {
    clearTimeout(temporizador.current);
    while (emVoo.current) await emVoo.current;
    const item = pendente.current;
    if (!item || pausado.current) return;
    pendente.current = null;
    setEstado('salvando');

    const envio = (async () => {
      try {
        const resultado = await salvarAtual.current(item.valor);
        if (resultado === 'conflito') {
          pausado.current = true;
          pendente.current ??= item;
          setEstado('conflito');
          return;
        }
        setSalvoEm(new Date());
        setMensagemErro(null);
        setEstado(pendente.current ? 'pendente' : 'salvo');
      } catch (erro) {
        pendente.current ??= item;
        setMensagemErro(traduzirErro(erro));
        setEstado('erro');
      }
    })();

    emVoo.current = envio;
    try {
      await envio;
    } finally {
      emVoo.current = null;
    }
  }, []);

  const agendar = useCallback(
    (valor: T) => {
      pendente.current = { valor };
      if (pausado.current) return;
      setEstado('pendente');
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void descarregar(), atraso);
    },
    [atraso, descarregar],
  );

  /** Sai do conflito; `salvarPendente` decide se o texto local é enviado. */
  const retomar = useCallback(
    (salvarPendente: boolean) => {
      pausado.current = false;
      if (!salvarPendente) {
        pendente.current = null;
        setEstado('salvo');
        return Promise.resolve();
      }
      return descarregar();
    },
    [descarregar],
  );

  const temAlteracoes = useCallback(() => pendente.current !== null || emVoo.current !== null, []);

  useEffect(() => {
    function aoEsconder() {
      if (document.visibilityState === 'hidden') void descarregar();
    }
    function antesDeSair(evento: BeforeUnloadEvent) {
      if (!temAlteracoes()) return;
      void descarregar();
      evento.preventDefault();
    }
    function aoReconectar() {
      void descarregar();
    }
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('beforeunload', antesDeSair);
    window.addEventListener('online', aoReconectar);
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('beforeunload', antesDeSair);
      window.removeEventListener('online', aoReconectar);
      // Ao sair da tela, envia o que faltou.
      void descarregar();
    };
  }, [descarregar, temAlteracoes]);

  return { estado, salvoEm, mensagemErro, agendar, salvarAgora: descarregar, retomar, temAlteracoes };
}
