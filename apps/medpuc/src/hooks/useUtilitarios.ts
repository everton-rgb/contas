import { useEffect, useState } from 'react';

export function useDebounce<T>(valor: T, atraso = 300): T {
  const [atual, setAtual] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setAtual(valor), atraso);
    return () => clearTimeout(id);
  }, [valor, atraso]);
  return atual;
}

/** Data/hora atual, atualizada a cada `intervalo` ms (contagem regressiva). */
export function useAgora(intervalo = 60_000): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return agora;
}

export function useTituloPagina(titulo: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · MedPUC` : 'MedPUC — Organização acadêmica para Medicina';
  }, [titulo]);
}
