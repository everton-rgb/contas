/**
 * index.tsx — carregamento tolerante do scanner.
 *
 * A VisionCamera é código nativo: existe no dev build, não existe no Expo Go.
 * Importar direto derruba a tela inteira de captura no Expo Go, e captura é
 * justamente o que se quer testar. Aqui o módulo é carregado sob try/catch e,
 * quando não está disponível, a tela explica em vez de quebrar.
 *
 * Os outros caminhos (colar e clipboard) seguem funcionando nos dois builds.
 */

import type { BoletoOk } from '@vence/core';
import type { ComponentType } from 'react';
import { SUPORTA_NATIVO_PROPRIO } from '@/lib/ambiente';
import { StyleSheet, View } from 'react-native';
import { Txt } from '@/ui/componentes';
import { ESP, RAIO, usarPaleta } from '@/ui/tema';

export interface PropsScanner {
  aoLer: (boleto: BoletoOk) => void;
  ativo?: boolean;
}

let ScannerNativo: ComponentType<PropsScanner> | null = null;

if (SUPORTA_NATIVO_PROPRIO) {
  try {
    // require, não import: precisa falhar em tempo de execução, não de bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ScannerNativo = (require('./Scanner') as { Scanner: ComponentType<PropsScanner> }).Scanner;
  } catch {
    // Módulo nativo ausente mesmo fora do Expo Go: cai no aviso.
    ScannerNativo = null;
  }
}

/** true quando o build atual consegue abrir a câmera. */
export const CAMERA_DISPONIVEL = ScannerNativo !== null;

export function Scanner(props: PropsScanner) {
  const p = usarPaleta();

  if (ScannerNativo) return <ScannerNativo {...props} />;

  return (
    <View style={[estilos.indisponivel, { backgroundColor: p.carta, borderColor: p.linhaSuave }]}>
      <Txt variante="forte">Câmera indisponível neste build</Txt>
      <Txt variante="pequeno" cor={p.tinta2}>
        A leitura por código de barras usa a VisionCamera, que exige código nativo. No Expo Go ela não existe —
        rode um dev build (`npx expo run:ios`) para testar o scanner.
      </Txt>
      <Txt variante="pequeno" cor={p.tinta3}>
        Colar a linha digitável funciona normalmente aqui.
      </Txt>
    </View>
  );
}

const estilos = StyleSheet.create({
  indisponivel: {
    padding: ESP.lg,
    borderRadius: RAIO.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: ESP.sm,
  },
});
