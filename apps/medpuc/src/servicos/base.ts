import { comoErroApp } from '../lib/erros';

type Resposta<T> = { data: T | null; error: unknown };

/**
 * Aguarda a consulta e devolve `data`, ou lança ErroApp com mensagem em
 * português. Erros de rede (fetch rejeitado) também viram ErroApp.
 */
export async function resolver<T>(consulta: PromiseLike<Resposta<T>>): Promise<T> {
  let resposta: Resposta<T>;
  try {
    resposta = await consulta;
  } catch (erro) {
    throw comoErroApp(erro);
  }
  if (resposta.error) throw comoErroApp(resposta.error);
  return resposta.data as T;
}

/** Converte '' em null para colunas opcionais. */
export function ouNulo<T extends string | null | undefined>(valor: T): Exclude<T, ''> | null {
  return valor === '' || valor === undefined ? null : (valor as Exclude<T, ''>);
}
