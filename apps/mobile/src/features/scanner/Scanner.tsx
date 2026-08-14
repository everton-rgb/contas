/**
 * Scanner.tsx — leitura do código de barras do boleto.
 *
 * ⚠️ Armadilha nº 4 da spec: boleto é Interleaved 2 of 5 de 44 dígitos, não
 * ITF-14. A VisionCamera 5 trata os dois como tipos distintos — pedir
 * `'itf-14'` aqui faria o scanner ignorar todo boleto real.
 *
 * Exige dev build. Não roda no Expo Go.
 */

import { parseBoleto, type BoletoOk } from '@vence/core';
import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  isScannedCode,
  useCameraPermission,
  useObjectOutput,
  type ScannedObject,
} from 'react-native-vision-camera';
import { Botao, Txt } from '@/ui/componentes';
import { ESP, RAIO, usarPaleta } from '@/ui/tema';

export function Scanner({ aoLer, ativo = true }: { aoLer: (boleto: BoletoOk) => void; ativo?: boolean }) {
  const p = usarPaleta();
  const { hasPermission, requestPermission, canRequestPermission } = useCameraPermission();

  // O scanner dispara muitas vezes por segundo sobre o mesmo código. Só o
  // primeiro parse bem-sucedido interessa.
  const jaLeu = useRef(false);

  const aoEscanear = useCallback(
    (objetos: ScannedObject[]) => {
      if (jaLeu.current) return;
      for (const obj of objetos) {
        if (!isScannedCode(obj) || !obj.value) continue;
        const resultado = parseBoleto(obj.value);
        if (resultado.ok) {
          jaLeu.current = true;
          aoLer(resultado);
          return;
        }
      }
    },
    [aoLer],
  );

  const saida = useObjectOutput({
    types: ['interleaved-2-of-5'],
    onObjectsScanned: aoEscanear,
  });

  if (!hasPermission) {
    return (
      <View style={[estilos.aviso, { backgroundColor: p.carta, borderColor: p.linhaSuave }]}>
        <Txt variante="forte">Precisamos da câmera</Txt>
        <Txt variante="pequeno" cor={p.tinta2}>
          {canRequestPermission
            ? 'É só para ler o código de barras do boleto. Nada é enviado para fora do aparelho.'
            : 'Permissão negada. Libere a câmera para o Vence nos Ajustes do sistema.'}
        </Txt>
        {canRequestPermission ? (
          <Botao titulo="Permitir câmera" onPress={() => void requestPermission()} variante="secundario" />
        ) : null}
      </View>
    );
  }

  return (
    <View style={estilos.moldura}>
      <Camera style={StyleSheet.absoluteFill} device="back" isActive={ativo} outputs={[saida]} />
      <View style={estilos.mira} pointerEvents="none">
        <View style={[estilos.faixa, { borderColor: p.carimboTinta }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: {
    height: 240,
    borderRadius: RAIO.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mira: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // O código do boleto é largo e baixo: a mira imita a proporção real.
  faixa: {
    width: '86%',
    height: 74,
    borderWidth: 2,
    borderRadius: RAIO.sm,
    opacity: 0.85,
  },
  aviso: {
    padding: ESP.lg,
    borderRadius: RAIO.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: ESP.md,
  },
});
