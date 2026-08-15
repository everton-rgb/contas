/**
 * entrar.tsx — autenticação por magic link.
 *
 * Sem senha: o usuário digita o e-mail, recebe um link, e o deep link
 * `vence://` devolve para o app com a sessão pronta.
 */

import * as Linking from 'expo-linking';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Botao, Entrada, Txt } from '@/ui/componentes';
import { ESP, usarPaleta } from '@/ui/tema';

export default function Entrar() {
  const p = usarPaleta();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function enviar() {
    setEnviando(true);
    setErro(null);
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: Linking.createURL('/') },
    });
    setEnviando(false);
    if (error) setErro(error.message);
    else setEnviado(true);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.app }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: ESP.xl,
          paddingBottom: insets.bottom + ESP.xl,
          gap: ESP.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: ESP.sm }}>
          <Txt variante="titulo">Vence</Txt>
          <Txt variante="corpo" cor={p.tinta2}>
            Lê o boleto, organiza e avisa antes de vencer.
          </Txt>
        </View>

        {enviado ? (
          <View style={{ gap: ESP.md }}>
            <Txt variante="forte">Link enviado</Txt>
            <Txt variante="pequeno" cor={p.tinta2}>
              Abra o e-mail em {email.trim()} e toque no link. Ele traz você de volta para cá já conectado.
            </Txt>
            <Botao titulo="Usar outro e-mail" variante="secundario" onPress={() => setEnviado(false)} />
          </View>
        ) : (
          <View style={{ gap: ESP.md }}>
            <Entrada
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => valido && void enviar()}
            />
            {erro ? (
              <Txt variante="pequeno" cor={p.vencido}>
                {erro}
              </Txt>
            ) : null}
            <Botao titulo="Entrar" onPress={() => void enviar()} desabilitado={!valido} carregando={enviando} />
            <Txt variante="pequeno" cor={p.tinta3}>
              Sem senha. Enviamos um link de acesso para o seu e-mail.
            </Txt>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
