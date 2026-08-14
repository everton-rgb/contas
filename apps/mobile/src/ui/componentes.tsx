/**
 * componentes.tsx — peças compartilhadas do design system.
 */

import type { ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ESP, MONO, RAIO, TIPO, usarPaleta } from './tema';

// ── Texto ───────────────────────────────────────────────────────────────────

type VarianteTexto = keyof typeof TIPO;

export function Txt({
  children,
  variante = 'corpo',
  cor,
  mono,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variante?: VarianteTexto;
  cor?: string;
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
}) {
  const p = usarPaleta();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        TIPO[variante],
        { color: cor ?? p.tinta },
        mono ? MONO : null,
        variante === 'micro' ? { textTransform: 'uppercase' } : null,
        style as never,
      ]}
    >
      {children}
    </Text>
  );
}

// ── Cartão ──────────────────────────────────────────────────────────────────

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usarPaleta();
  return (
    <View
      style={[
        {
          backgroundColor: p.carta,
          borderColor: p.linhaSuave,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderRadius: RAIO.lg,
          padding: ESP.lg,
          gap: ESP.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Botões ──────────────────────────────────────────────────────────────────

export function Botao({
  titulo,
  onPress,
  desabilitado,
  carregando,
  variante = 'primario',
}: {
  titulo: string;
  onPress: () => void;
  desabilitado?: boolean;
  carregando?: boolean;
  variante?: 'primario' | 'secundario';
}) {
  const p = usarPaleta();
  const inativo = desabilitado || carregando;
  const primario = variante === 'primario';

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      style={({ pressed }) => ({
        backgroundColor: primario ? p.carimbo : 'transparent',
        borderColor: primario ? 'transparent' : p.linha,
        borderWidth: primario ? 0 : StyleSheet.hairlineWidth * 2,
        borderRadius: RAIO.md,
        paddingVertical: primario ? 16 : 12,
        paddingHorizontal: ESP.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: inativo ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? p.carimboTinta : p.tinta} />
      ) : (
        <Text style={[TIPO.forte, { color: primario ? p.carimboTinta : p.tinta }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

// ── Etiqueta de estado ──────────────────────────────────────────────────────

export type Urgencia = 'vencido' | 'hoje' | 'ok' | 'rascunho';

export function Etiqueta({ texto, urgencia }: { texto: string; urgencia: Urgencia }) {
  const p = usarPaleta();
  const cores: Record<Urgencia, { fg: string; bg: string }> = {
    vencido: { fg: p.vencido, bg: p.vencidoFundo },
    hoje: { fg: p.hoje, bg: p.hojeFundo },
    ok: { fg: p.ok, bg: p.okFundo },
    rascunho: { fg: p.tinta2, bg: p.linhaSuave },
  };
  const c = cores[urgencia];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: c.bg,
        borderRadius: RAIO.pill,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg }} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.fg }}>{texto}</Text>
    </View>
  );
}

// ── Campo de formulário ─────────────────────────────────────────────────────

export function Campo({
  rotulo,
  pendente,
  dica,
  children,
}: {
  rotulo: string;
  pendente?: boolean;
  dica?: string;
  children: ReactNode;
}) {
  const p = usarPaleta();
  return (
    <View style={{ gap: ESP.xs, paddingLeft: pendente ? 11 : 0 }}>
      {pendente ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 2,
            bottom: 2,
            width: 3,
            borderRadius: 2,
            backgroundColor: p.hoje,
          }}
        />
      ) : null}
      <Txt variante="micro" cor={p.tinta3}>
        {rotulo}
      </Txt>
      {children}
      {dica ? (
        <Txt variante="pequeno" cor={p.hoje}>
          {dica}
        </Txt>
      ) : null}
    </View>
  );
}

export function Entrada(props: TextInputProps & { mono?: boolean; ref?: Ref<TextInput> }) {
  const p = usarPaleta();
  const { mono, style, ...resto } = props;
  return (
    <TextInput
      placeholderTextColor={p.tinta3}
      {...resto}
      style={[
        {
          backgroundColor: p.carta,
          borderColor: p.linha,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderRadius: RAIO.md,
          paddingHorizontal: ESP.md,
          paddingVertical: 12,
          fontSize: 15,
          color: p.tinta,
        },
        mono ? MONO : null,
        style,
      ]}
    />
  );
}

// ── Estados de tela ─────────────────────────────────────────────────────────

export function Vazio({ texto }: { texto: string }) {
  const p = usarPaleta();
  return (
    <View style={{ padding: ESP.xxl, alignItems: 'center' }}>
      <Txt variante="pequeno" cor={p.tinta3}>
        {texto}
      </Txt>
    </View>
  );
}

export function Carregando() {
  const p = usarPaleta();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.app }}>
      <ActivityIndicator color={p.carimbo} />
    </View>
  );
}
