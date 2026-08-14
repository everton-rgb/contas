/**
 * conta/[id].tsx — confirmação e detalhe.
 *
 * Rascunho: formulário com os campos pendentes destacados e foco automático.
 * O botão só libera com data e valor — mesma regra da constraint
 * `contas_agendavel`, checada aqui para dar retorno na tela, não no banco.
 *
 * Agendada: a linha digitável em destaque, pronta para copiar e colar no app
 * do banco. Chegando pela notificação, a linha já vem copiada.
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import { formatarLinhaDigitavel } from '@vence/core';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buscarConta,
  confirmarConta,
  excluirConta,
  listarCategorias,
  marcarPaga,
  type Categoria,
  type Conta,
} from '@/lib/db';
import {
  brl,
  deISO,
  paraISO,
  proximoDiaDoMes,
  rotuloPrazo,
  ultimoDiaDoMes,
  urgenciaDe,
  valorDeTexto,
} from '@/lib/formato';
import { reconciliar } from '@/lib/sincronizacao';
import { Botao, Campo, Cartao, Carregando, Entrada, Etiqueta, Txt, Vazio } from '@/ui/componentes';
import { ESP, RAIO, usarPaleta } from '@/ui/tema';

export default function TelaConta() {
  const p = usarPaleta();
  const router = useRouter();
  const navegacao = useNavigation();
  const insets = useSafeAreaInsets();
  const { id, copiar } = useLocalSearchParams<{ id: string; copiar?: string }>();

  const [conta, setConta] = useState<Conta | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoCopia, setAvisoCopia] = useState<string | null>(null);

  // Formulário
  const [descricao, setDescricao] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [vencimento, setVencimento] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  const campoValor = useRef<TextInput>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const [c, cats] = await Promise.all([buscarConta(id), listarCategorias().catch(() => [])]);
        if (!vivo) return;
        setConta(c);
        setCategorias(cats);
        if (c) {
          setDescricao(c.descricao);
          setValorTexto(c.valor === null ? '' : String(c.valor).replace('.', ','));
          setVencimento(c.vencimento);
          setCategoriaId(c.categoria_id);
        }
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar.');
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  useEffect(() => {
    if (conta) navegacao.setOptions({ title: conta.status === 'rascunho' ? 'Confirmar conta' : conta.descricao });
  }, [conta, navegacao]);

  const copiarLinha = useCallback(async (linha: string) => {
    await Clipboard.setStringAsync(linha);
    setAvisoCopia('Linha digitável copiada. Cole no app do seu banco.');
    setTimeout(() => setAvisoCopia(null), 3500);
  }, []);

  // Chegou pela notificação: a linha já vai copiada, como manda a §6.
  const jaCopiou = useRef(false);
  useEffect(() => {
    if (jaCopiou.current || copiar !== '1' || !conta?.linha_digitavel) return;
    jaCopiou.current = true;
    void copiarLinha(conta.linha_digitavel);
  }, [conta, copiar, copiarLinha]);

  // Foco automático no primeiro campo pendente.
  useEffect(() => {
    if (conta?.status === 'rascunho' && conta.valor === null) {
      const t = setTimeout(() => campoValor.current?.focus(), 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [conta]);

  if (carregando) return <Carregando />;
  if (!conta) return <Vazio texto={erro ?? 'Conta não encontrada.'} />;

  const valor = valorDeTexto(valorTexto);
  const podeAgendar = valor !== null && vencimento !== null;
  const rascunho = conta.status === 'rascunho';

  async function confirmar() {
    setSalvando(true);
    setErro(null);
    try {
      const atualizada = await confirmarConta(id, {
        descricao: descricao.trim() || 'Conta',
        categoriaId,
        valor,
        vencimento,
      });
      setConta(atualizada);
      await reconciliar().catch(() => undefined);
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function pagar() {
    setSalvando(true);
    try {
      setConta(await marcarPaga(id, valor));
      await reconciliar().catch(() => undefined);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível marcar como paga.');
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir conta', 'A conta e os alertas dela somem. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await excluirConta(id);
            await reconciliar().catch(() => undefined);
            router.back();
          })();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.app }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: ESP.lg, paddingBottom: insets.bottom + ESP.xl, gap: ESP.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Cabeçalho: o boleto lido ───────────────────────────────────── */}
        <Cartao>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt variante="micro" cor={p.tinta3}>
              {conta.tipo === 'bancario' ? 'Boleto bancário' : conta.tipo === 'arrecadacao' ? 'Arrecadação' : 'Sem boleto'}
            </Txt>
            <Etiqueta
              texto={rotuloPrazo(conta.vencimento, conta.status)}
              urgencia={urgenciaDe(conta.vencimento, conta.status)}
            />
          </View>

          {conta.linha_digitavel ? (
            <>
              <Txt variante="pequeno" cor={p.tinta2} mono>
                {formatarLinhaDigitavel(conta.linha_digitavel)}
              </Txt>
              <Botao
                titulo="Copiar linha digitável"
                variante="secundario"
                onPress={() => void copiarLinha(conta.linha_digitavel as string)}
              />
            </>
          ) : null}

          {avisoCopia ? (
            <Txt variante="pequeno" cor={p.ok}>
              {avisoCopia}
            </Txt>
          ) : null}
        </Cartao>

        {/* ── Avisos do parser ───────────────────────────────────────────── */}
        {conta.avisos.length ? (
          <View style={{ gap: ESP.sm }}>
            {conta.avisos.map((aviso) => (
              <View key={aviso} style={[estilos.aviso, { backgroundColor: p.hojeFundo }]}>
                <Txt variante="pequeno" cor={p.hoje}>
                  {aviso}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Formulário ─────────────────────────────────────────────────── */}
        <Campo rotulo="Descrição">
          <Entrada value={descricao} onChangeText={setDescricao} placeholder="Conta de luz" />
        </Campo>

        <Campo
          rotulo="Valor"
          pendente={rascunho && valor === null}
          dica={conta.pendencia_valor ? 'O código não traz valor confiável — digite o impresso no boleto.' : undefined}
        >
          <Entrada
            ref={campoValor}
            value={valorTexto}
            onChangeText={setValorTexto}
            placeholder="0,00"
            inputMode="decimal"
            keyboardType="decimal-pad"
          />
        </Campo>

        <Campo
          rotulo="Vencimento"
          pendente={rascunho && vencimento === null}
          dica={
            conta.pendencia_vencimento
              ? 'Arrecadação não carrega data no código. Use a data impressa.'
              : undefined
          }
        >
          <Pressable
            onPress={() => setPicker(true)}
            style={[estilos.data, { backgroundColor: p.carta, borderColor: p.linha }]}
          >
            <Txt variante="corpo" cor={vencimento ? p.tinta : p.tinta3}>
              {vencimento ? deISO(vencimento).toLocaleDateString('pt-BR') : 'Escolher data'}
            </Txt>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: ESP.sm, flexWrap: 'wrap' }}>
            <Atalho texto="dia 10" onPress={() => setVencimento(proximoDiaDoMes(10))} />
            <Atalho texto="dia 20" onPress={() => setVencimento(proximoDiaDoMes(20))} />
            <Atalho texto="fim do mês" onPress={() => setVencimento(ultimoDiaDoMes())} />
          </View>

          {picker ? (
            <DateTimePicker
              value={vencimento ? deISO(vencimento) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              locale="pt-BR"
              onChange={(evento, data) => {
                if (Platform.OS !== 'ios') setPicker(false);
                if (evento.type === 'set' && data) setVencimento(paraISO(data));
              }}
            />
          ) : null}
        </Campo>

        {categorias.length ? (
          <Campo rotulo="Categoria">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ESP.sm }}>
              {categorias.map((cat) => {
                const ativa = cat.id === categoriaId;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategoriaId(ativa ? null : cat.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                    style={[
                      estilos.categoria,
                      { backgroundColor: p.carta, borderColor: ativa ? p.tinta : p.linha },
                    ]}
                  >
                    <View style={[estilos.bolinha, { backgroundColor: cat.cor }]} />
                    <Txt variante="pequeno" cor={ativa ? p.tinta : p.tinta2}>
                      {cat.nome}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </Campo>
        ) : null}

        {erro ? (
          <Txt variante="pequeno" cor={p.vencido}>
            {erro}
          </Txt>
        ) : null}

        {/* ── Ações ──────────────────────────────────────────────────────── */}
        <View style={{ gap: ESP.md }}>
          <Botao
            titulo={rascunho ? 'Confirmar e avisar' : 'Salvar alterações'}
            onPress={() => void confirmar()}
            desabilitado={!podeAgendar}
            carregando={salvando}
          />
          <Txt variante="pequeno" cor={p.tinta3}>
            {podeAgendar
              ? 'Avisamos 3 dias antes, 1 dia antes e no dia, às 8h.'
              : 'Precisa de data e valor para virar alerta.'}
          </Txt>

          {conta.status !== 'paga' && !rascunho ? (
            <Botao titulo="Marcar como paga" variante="secundario" onPress={() => void pagar()} />
          ) : null}
          <Botao titulo="Excluir conta" variante="secundario" onPress={confirmarExclusao} />
        </View>

        {conta.valor !== null ? (
          <Txt variante="pequeno" cor={p.tinta3}>
            Lido do código: {brl(conta.valor)}
          </Txt>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Atalho({ texto, onPress }: { texto: string; onPress: () => void }) {
  const p = usarPaleta();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[estilos.atalho, { borderColor: p.linha, backgroundColor: p.carta }]}
    >
      <Txt variante="pequeno" cor={p.tinta2}>
        {texto}
      </Txt>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  aviso: { padding: ESP.md, borderRadius: RAIO.sm },
  data: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RAIO.md,
    paddingHorizontal: ESP.md,
    paddingVertical: 13,
  },
  atalho: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RAIO.pill,
    paddingHorizontal: ESP.md,
    paddingVertical: 6,
  },
  categoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RAIO.pill,
    paddingHorizontal: ESP.md,
    paddingVertical: 6,
  },
  bolinha: { width: 8, height: 8, borderRadius: 4 },
});
