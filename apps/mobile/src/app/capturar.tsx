/**
 * capturar.tsx — os dois caminhos da Fase 1: clipboard e câmera.
 *
 * O clipboard é o de maior retorno por linha de código no projeto: ao abrir a
 * tela, se a área de transferência já tem um boleto válido, oferece adicionar.
 */

import { extrairDeTexto, formatarLinhaDigitavel, parseBoleto, type BoletoOk } from '@vence/core';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Scanner } from '@/features/scanner/Scanner';
import { buscarPorLinha, criarContaDeBoleto, BoletoDuplicado, type OrigemLeitura } from '@/lib/db';
import { brl, dataCurta } from '@/lib/formato';
import { Botao, Cartao, Campo, Entrada, Txt } from '@/ui/componentes';
import { ESP, RAIO, usarPaleta } from '@/ui/tema';

export default function Capturar() {
  const p = usarPaleta();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [texto, setTexto] = useState('');
  const [sugestao, setSugestao] = useState<BoletoOk | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ── Detecção de clipboard ────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        if (!(await Clipboard.hasStringAsync())) return;
        const conteudo = await Clipboard.getStringAsync();
        if (!vivo || !conteudo) return;
        const primeiro = extrairDeTexto(conteudo)[0];
        if (primeiro?.ok) setSugestao(primeiro);
      } catch {
        // Sem acesso ao clipboard o app segue normalmente.
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const resultado = texto.trim() ? parseBoleto(texto) : null;

  const salvar = useCallback(
    async (boleto: BoletoOk, origem: OrigemLeitura) => {
      setSalvando(true);
      setErro(null);
      try {
        const conta = await criarContaDeBoleto(boleto, {
          descricao: descricaoPadrao(boleto),
          categoriaId: null,
          valor: boleto.valor,
          vencimento: boleto.vencimento,
          origem,
        });
        router.replace(`/conta/${conta.id}`);
      } catch (e) {
        if (e instanceof BoletoDuplicado) {
          // Já existe: leva para a conta em vez de mostrar erro.
          const existente = await buscarPorLinha(boleto.linhaDigitavel).catch(() => null);
          if (existente) {
            router.replace(`/conta/${existente.id}`);
            return;
          }
          setErro(e.message);
        } else {
          setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
        }
      } finally {
        setSalvando(false);
      }
    },
    [router],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.app }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: ESP.lg, paddingBottom: insets.bottom + ESP.xl, gap: ESP.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {sugestao ? (
          <View style={[estilos.clipboard, { borderColor: p.carimbo, backgroundColor: p.carta }]}>
            <Txt variante="forte">Boleto na área de transferência</Txt>
            <Txt variante="pequeno" cor={p.tinta2} mono>
              {formatarLinhaDigitavel(sugestao.linhaDigitavel)}
            </Txt>
            <View style={{ flexDirection: 'row', gap: ESP.sm }}>
              <View style={{ flex: 1 }}>
                <Botao
                  titulo="Adicionar conta detectada"
                  carregando={salvando}
                  onPress={() => void salvar(sugestao, 'clipboard')}
                />
              </View>
              <Botao titulo="Agora não" variante="secundario" onPress={() => setSugestao(null)} />
            </View>
          </View>
        ) : null}

        <Campo rotulo="Linha digitável ou código de barras">
          <Entrada
            value={texto}
            onChangeText={setTexto}
            placeholder="34191.79001 01043.510047 91020.150008 4 12345678901234"
            multiline
            mono
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="numeric"
            style={{ minHeight: 84, textAlignVertical: 'top' }}
          />
          <Txt variante="pequeno" cor={p.tinta3}>
            Aceita 47 dígitos (bancário), 48 (arrecadação) ou 44 (código de barras). Pontuação é ignorada.
          </Txt>
        </Campo>

        {resultado && !resultado.ok ? (
          <View style={[estilos.erro, { borderColor: p.vencido, backgroundColor: p.vencidoFundo }]}>
            <Txt variante="micro" cor={p.vencido}>
              {resultado.codigo}
            </Txt>
            <Txt variante="pequeno" cor={p.vencido}>
              {resultado.erro}
            </Txt>
          </View>
        ) : null}

        {resultado?.ok ? (
          <Cartao>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt variante="micro" cor={p.tinta3}>
                {resultado.tipo === 'bancario' ? 'Boleto bancário' : 'Arrecadação'}
              </Txt>
              <Txt variante="pequeno" cor={p.tinta3}>
                {resultado.nomeBanco ?? resultado.nomeSegmento ?? '—'}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt variante="secao" mono>
                {resultado.valor === null ? '—' : brl(resultado.valor)}
              </Txt>
              <Txt variante="pequeno" cor={p.tinta2} mono>
                {dataCurta(resultado.vencimento)}
              </Txt>
            </View>
            <Botao
              titulo="Continuar"
              carregando={salvando}
              onPress={() => void salvar(resultado, 'manual')}
            />
          </Cartao>
        ) : null}

        <Campo rotulo="Câmera">
          <Scanner aoLer={(boleto) => void salvar(boleto, 'camera')} ativo={!salvando} />
        </Campo>

        {erro ? (
          <Txt variante="pequeno" cor={p.vencido}>
            {erro}
          </Txt>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** O código não carrega beneficiário: o melhor palpite é o emissor. */
function descricaoPadrao(boleto: BoletoOk): string {
  if (boleto.tipo === 'bancario') return boleto.nomeBanco ? `Boleto ${boleto.nomeBanco}` : 'Boleto bancário';
  return boleto.nomeSegmento ?? 'Conta de consumo';
}

const estilos = StyleSheet.create({
  clipboard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RAIO.lg,
    padding: ESP.lg,
    gap: ESP.md,
  },
  erro: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: RAIO.md,
    padding: ESP.md,
    gap: 2,
  },
});
