import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSalvamentoAutomatico } from './useSalvamentoAutomatico';

describe('useSalvamentoAutomatico', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('agrupa a digitação e salva só o último valor após a pausa', async () => {
    const salvar = vi.fn().mockResolvedValue('salvo');
    const { result } = renderHook(() => useSalvamentoAutomatico<string>({ salvar, atraso: 1000 }));

    act(() => {
      result.current.agendar('a');
      result.current.agendar('ab');
      result.current.agendar('abc');
    });
    expect(result.current.estado).toBe('pendente');
    expect(salvar).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(salvar).toHaveBeenCalledWith('abc');
    expect(result.current.estado).toBe('salvo');
    expect(result.current.salvoEm).toBeInstanceOf(Date);
  });

  it('mantém a alteração pendente quando falha e salva ao tentar de novo', async () => {
    const salvar = vi.fn().mockRejectedValueOnce({ message: 'Failed to fetch' }).mockResolvedValue('salvo');
    const { result } = renderHook(() => useSalvamentoAutomatico<string>({ salvar, atraso: 500 }));

    act(() => result.current.agendar('texto'));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current.estado).toBe('erro');
    expect(result.current.mensagemErro).toMatch(/conexão/);
    expect(result.current.temAlteracoes()).toBe(true);

    await act(() => result.current.salvarAgora());
    expect(salvar).toHaveBeenLastCalledWith('texto');
    expect(result.current.estado).toBe('salvo');
    expect(result.current.temAlteracoes()).toBe(false);
  });

  it('não sobrepõe salvamentos: o que chega durante o envio vai no próximo', async () => {
    let concluir: (v: 'salvo') => void = () => undefined;
    const salvar = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (concluir = r)))
      .mockResolvedValue('salvo');
    const { result } = renderHook(() => useSalvamentoAutomatico<string>({ salvar, atraso: 100 }));

    act(() => result.current.agendar('v1'));
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(result.current.estado).toBe('salvando');

    act(() => result.current.agendar('v2'));
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(salvar).toHaveBeenCalledTimes(1);

    await act(async () => concluir('salvo'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(salvar).toHaveBeenCalledTimes(2);
    expect(salvar).toHaveBeenLastCalledWith('v2');
    expect(result.current.estado).toBe('salvo');
  });

  it('pausa em conflito até o usuário decidir', async () => {
    const salvar = vi.fn().mockResolvedValueOnce('conflito').mockResolvedValue('salvo');
    const { result } = renderHook(() => useSalvamentoAutomatico<string>({ salvar, atraso: 100 }));

    act(() => result.current.agendar('minha versão'));
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(result.current.estado).toBe('conflito');

    act(() => result.current.agendar('mais texto'));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(salvar).toHaveBeenCalledTimes(1);

    await act(() => result.current.retomar(true));
    expect(salvar).toHaveBeenLastCalledWith('mais texto');
    expect(result.current.estado).toBe('salvo');
  });

  it('envia o pendente ao desmontar', async () => {
    const salvar = vi.fn().mockResolvedValue('salvo');
    const { result, unmount } = renderHook(() => useSalvamentoAutomatico<string>({ salvar, atraso: 5000 }));
    act(() => result.current.agendar('saindo'));
    unmount();
    await vi.advanceTimersByTimeAsync(0);
    expect(salvar).toHaveBeenCalledWith('saindo');
  });
});
