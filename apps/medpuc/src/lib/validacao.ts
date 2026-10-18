/**
 * validacao.ts — validação de formulários.
 *
 * Espelha as restrições do banco (tamanhos, formatos) para avisar antes de
 * enviar. O banco continua sendo a barreira final.
 */

import { corValida } from './cores';
import { isoValida } from './datas';

export function obrigatorio(valor: string | null | undefined, rotulo = 'Este campo'): string | undefined {
  return valor && valor.trim() ? undefined : `${rotulo} é obrigatório.`;
}

export function tamanhoMaximo(valor: string | null | undefined, maximo: number): string | undefined {
  return valor && valor.length > maximo ? `Use no máximo ${maximo} caracteres.` : undefined;
}

export function emailValido(email: string): string | undefined {
  if (!email.trim()) return 'Informe seu e-mail.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? undefined : 'Informe um e-mail válido.';
}

export function senhaValida(senha: string): string | undefined {
  if (!senha) return 'Informe uma senha.';
  if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.';
  return undefined;
}

export function dataValida(iso: string | null | undefined, rotulo = 'A data'): string | undefined {
  if (!iso) return `${rotulo} é obrigatória.`;
  return isoValida(iso) ? undefined : `${rotulo} é inválida.`;
}

export function dataOpcionalValida(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  return isoValida(iso) ? undefined : 'Data inválida.';
}

export function horarioValido(inicio: string | null | undefined, fim: string | null | undefined): string | undefined {
  if (fim && !inicio) return 'Informe o horário de início.';
  if (inicio && fim && fim <= inicio) return 'O término precisa ser depois do início.';
  return undefined;
}

export function corObrigatoria(cor: string | null | undefined): string | undefined {
  return corValida(cor) ? undefined : 'Escolha uma cor.';
}

/** Primeiro erro definido entre os validadores. */
export function primeiro(...erros: (string | undefined)[]): string | undefined {
  return erros.find(Boolean);
}
