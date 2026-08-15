/**
 * _layout.tsx — raiz do app.
 *
 * Segura três coisas: a sessão do Supabase, o handler de notificação, e a
 * reconciliação da fila de alertas na abertura e a cada volta do background.
 *
 * Em MODO_LOCAL não há login: o app entra direto, com os dados no aparelho.
 */

import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { MODO_LOCAL } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { configurarHandler, pedirPermissao } from '@/lib/notificacoes';
import { aoAbrirApp, registrarTarefaDeFundo } from '@/lib/sincronizacao';
import { SessaoContexto } from '@/lib/sessao';
import { Carregando } from '@/ui/componentes';
import { usarPaleta } from '@/ui/tema';

export default function Raiz() {
  const p = usarPaleta();
  const router = useRouter();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(!MODO_LOCAL);

  const autenticado = MODO_LOCAL || sessao !== null;

  // ── Sessão ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (MODO_LOCAL) return;

    void supabase()
      .auth.getSession()
      .then(({ data }) => {
        setSessao(data.session);
        setCarregando(false);
      });
    const { data: sub } = supabase().auth.onAuthStateChange((_evento, nova) => setSessao(nova));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Notificações ──────────────────────────────────────────────────────────
  useEffect(() => {
    void configurarHandler();
  }, []);

  // Tocar na notificação abre a conta com a linha digitável já copiada.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resposta) => {
      const contaId = resposta.notification.request.content.data?.contaId;
      if (typeof contaId === 'string') router.push(`/conta/${contaId}?copiar=1`);
    });
    return () => sub.remove();
  }, [router]);

  // ── Reconciliação da fila ─────────────────────────────────────────────────
  const estadoApp = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!autenticado) return;

    const reconciliar = () => {
      void aoAbrirApp().catch(() => {
        // Sem rede a fila local continua válida: nada a fazer.
      });
    };

    void pedirPermissao().then((ok) => {
      if (ok) {
        reconciliar();
        void registrarTarefaDeFundo();
      }
    });

    const sub = AppState.addEventListener('change', (proximo) => {
      if (estadoApp.current.match(/inactive|background/) && proximo === 'active') reconciliar();
      estadoApp.current = proximo;
    });
    return () => sub.remove();
  }, [autenticado]);

  if (carregando) return <Carregando />;

  return (
    <SessaoContexto.Provider value={sessao}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: p.app },
            headerTintColor: p.tinta,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: p.app },
          }}
        >
          <Stack.Protected guard={autenticado}>
            <Stack.Screen name="index" options={{ title: 'Vencimentos' }} />
            <Stack.Screen name="capturar" options={{ title: 'Capturar', presentation: 'modal' }} />
            <Stack.Screen name="conta/[id]" options={{ title: 'Conta' }} />
          </Stack.Protected>

          <Stack.Protected guard={!autenticado}>
            <Stack.Screen name="entrar" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </SessaoContexto.Provider>
  );
}
