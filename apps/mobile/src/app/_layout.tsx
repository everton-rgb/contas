/**
 * _layout.tsx — raiz do app.
 *
 * Segura três coisas: a sessão do Supabase, o handler de notificação, e a
 * reconciliação da fila de alertas na abertura e a cada volta do background.
 */

import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { configurarHandler, pedirPermissao } from '@/lib/notificacoes';
import { aoAbrirApp, registrarTarefaDeFundo } from '@/lib/sincronizacao';
import { Carregando } from '@/ui/componentes';
import { usarPaleta } from '@/ui/tema';
import { SessaoContexto } from '@/lib/sessao';

export default function Raiz() {
  const p = usarPaleta();
  const router = useRouter();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  // ── Sessão ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Notificações ──────────────────────────────────────────────────────────
  useEffect(() => {
    void configurarHandler();
  }, []);

  // Tocar na notificação abre a conta. A tela cuida de copiar a linha.
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
    if (!sessao) return;

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
  }, [sessao]);

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
          <Stack.Protected guard={sessao !== null}>
            <Stack.Screen name="index" options={{ title: 'Vencimentos' }} />
            <Stack.Screen name="capturar" options={{ title: 'Capturar', presentation: 'modal' }} />
            <Stack.Screen name="conta/[id]" options={{ title: 'Conta' }} />
          </Stack.Protected>

          <Stack.Protected guard={sessao === null}>
            <Stack.Screen name="entrar" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </SessaoContexto.Provider>
  );
}
