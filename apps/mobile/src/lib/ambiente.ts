/**
 * ambiente.ts — em que tipo de build o app está rodando.
 *
 * O Expo Go traz um conjunto fixo de módulos nativos. VisionCamera,
 * Nitro e expo-background-task não estão nele. Detectar isso antes de tentar
 * carregar é mais confiável do que depender de o erro ser capturável: um
 * módulo nativo ausente nem sempre lança em JavaScript.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';

/** true quando rodando dentro do app Expo Go, e não num dev/release build. */
export const EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Módulos que só existem quando há código nativo próprio. */
export const SUPORTA_NATIVO_PROPRIO = !EXPO_GO;
