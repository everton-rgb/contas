/**
 * db.ts — camada de acesso tipada.
 *
 * Despacha para a implementação com Supabase ou para a local, conforme
 * MODO_LOCAL. As telas importam sempre daqui e não sabem qual está ativa.
 */

import { MODO_LOCAL } from './config';
import * as local from './db-local';
import * as remoto from './db-supabase';

export * from './tipos';
export { MODO_LOCAL };

const impl = MODO_LOCAL ? local : remoto;

export const listarContas = impl.listarContas;
export const buscarConta = impl.buscarConta;
export const buscarPorLinha = impl.buscarPorLinha;
export const listarCategorias = impl.listarCategorias;
export const marcarVencidas = impl.marcarVencidas;
export const criarContaDeBoleto = impl.criarContaDeBoleto;
export const confirmarConta = impl.confirmarConta;
export const marcarPaga = impl.marcarPaga;
export const excluirConta = impl.excluirConta;

/** Existe só no modo local — no Supabase quem apaga é o usuário, conta a conta. */
export const apagarTudo = MODO_LOCAL ? local.apagarTudo : null;
