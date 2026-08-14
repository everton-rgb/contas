/**
 * index.tsx — tela inicial: próximos vencimentos.
 *
 * Ordem de leitura: o que já venceu, o que vence agora, o resto. Rascunhos
 * sobem para o topo porque são o único item que exige ação do usuário para
 * virar alerta.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listarContas, type Conta } from '@/lib/db';
import { brl, dataCurta, diasAte, rotuloPrazo, urgenciaDe } from '@/lib/formato';
import { Botao, Etiqueta, Txt, Vazio } from '@/ui/componentes';
import { ESP, RAIO, usarPaleta } from '@/ui/tema';

export default function Vencimentos() {
  const p = usarPaleta();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [contas, setContas] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setContas(await listarContas());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as contas.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const secoes = useMemo(() => montarSecoes(contas), [contas]);
  const total = useMemo(
    () => contas.filter((c) => c.status === 'agendada' || c.status === 'vencida').reduce((s, c) => s + (c.valor ?? 0), 0),
    [contas],
  );
  const rascunhos = contas.filter((c) => c.status === 'rascunho').length;

  return (
    <View style={{ flex: 1, backgroundColor: p.app }}>
      <SectionList
        sections={secoes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: ESP.lg, paddingBottom: insets.bottom + 96, gap: ESP.sm }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => {
              setAtualizando(true);
              void carregar();
            }}
            tintColor={p.tinta3}
          />
        }
        ListHeaderComponent={
          <View style={[estilos.resumo, { backgroundColor: p.carta, borderColor: p.linhaSuave }]}>
            <Txt variante="micro" cor={p.tinta3}>
              Em aberto
            </Txt>
            <Txt variante="titulo" mono>
              {brl(total)}
            </Txt>
            <Txt variante="pequeno" cor={p.tinta3}>
              {contas.filter((c) => c.status === 'agendada').length} agendadas
              {rascunhos ? ` · ${rascunhos} aguardando confirmação` : ''}
            </Txt>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Txt variante="micro" cor={p.tinta3} style={{ paddingTop: ESP.md, paddingBottom: ESP.xs } as never}>
            {section.title}
          </Txt>
        )}
        renderItem={({ item }) => <LinhaConta conta={item} aoTocar={() => router.push(`/conta/${item.id}`)} />}
        ListEmptyComponent={
          carregando ? null : (
            <Vazio texto={erro ?? 'Nenhuma conta ainda. Toque em Adicionar para ler um boleto.'} />
          )
        }
      />

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + ESP.md, backgroundColor: p.app }]}>
        <Botao titulo="Adicionar conta" onPress={() => router.push('/capturar')} />
      </View>
    </View>
  );
}

// ── Linha ───────────────────────────────────────────────────────────────────

function LinhaConta({ conta, aoTocar }: { conta: Conta; aoTocar: () => void }) {
  const p = usarPaleta();
  const urgencia = urgenciaDe(conta.vencimento, conta.status);
  const cor = { vencido: p.vencido, hoje: p.hoje, ok: p.ok, rascunho: p.tinta3 }[urgencia];

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={`${conta.descricao}, ${rotuloPrazo(conta.vencimento, conta.status)}, ${brl(conta.valor)}`}
      style={({ pressed }) => [
        estilos.linha,
        { backgroundColor: p.carta, borderColor: p.linhaSuave, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[estilos.risco, { backgroundColor: cor }]} />

      <View style={{ flex: 1, gap: 2 }}>
        <Txt variante="forte" numberOfLines={1}>
          {conta.descricao}
        </Txt>
        <Txt variante="pequeno" cor={p.tinta3} numberOfLines={1}>
          {dataCurta(conta.vencimento)}
        </Txt>
      </View>

      <View style={{ alignItems: 'flex-end', gap: ESP.xs }}>
        <Txt variante="forte" mono>
          {conta.valor === null ? '—' : brl(conta.valor)}
        </Txt>
        <Etiqueta texto={rotuloPrazo(conta.vencimento, conta.status)} urgencia={urgencia} />
      </View>
    </Pressable>
  );
}

// ── Agrupamento ─────────────────────────────────────────────────────────────

function montarSecoes(contas: Conta[]): Array<{ title: string; data: Conta[] }> {
  const rascunhos = contas.filter((c) => c.status === 'rascunho');
  const ativas = contas
    .filter((c) => c.status === 'agendada' || c.status === 'vencida')
    .filter((c): c is Conta & { vencimento: string } => c.vencimento !== null)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const pagas = contas.filter((c) => c.status === 'paga');

  const secoes = [
    { title: 'Precisam de confirmação', data: rascunhos },
    { title: 'Vencidas', data: ativas.filter((c) => diasAte(c.vencimento) < 0) },
    { title: 'Próximos 7 dias', data: ativas.filter((c) => diasAte(c.vencimento) >= 0 && diasAte(c.vencimento) <= 7) },
    { title: 'Mais adiante', data: ativas.filter((c) => diasAte(c.vencimento) > 7) },
    { title: 'Pagas', data: pagas },
  ];

  return secoes.filter((s) => s.data.length > 0);
}

const estilos = StyleSheet.create({
  resumo: {
    borderRadius: RAIO.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: ESP.lg,
    gap: 2,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESP.md,
    borderRadius: RAIO.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: ESP.md,
  },
  risco: { width: 3, height: 32, borderRadius: 2 },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: ESP.lg,
    paddingTop: ESP.md,
  },
});
