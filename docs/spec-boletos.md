# spec-boletos.md — App de controle de despesas com leitura de boletos

**Codinome:** Vence
**Stack:** Expo (React Native) + TypeScript + Supabase + EAS Build
**Alvo:** iOS 16+ (Android sai de graça)
**Distribuição inicial:** TestFlight

---

## 1. Decisão de escopo

O app **lê, organiza e avisa**. Não paga.

Pagar dentro do app exigiria ser Iniciador de Transação de Pagamento no Open Finance, com autorização do BCB — inviável para MVP. O fluxo termina em **copiar a linha digitável** e abrir o app do banco. Isso remove a barreira regulatória inteira e não custa quase nada em experiência: o usuário já faz esse gesto hoje.

---

## 2. Arquitetura

```
vence/
├── apps/mobile/              # Expo Router, RN 0.76+
│   └── src/
│       ├── app/              # rotas (file-based)
│       ├── lib/
│       │   ├── notificacoes.ts   ✅ pronto
│       │   ├── supabase.ts
│       │   └── db.ts             # camada de acesso tipada
│       ├── features/
│       │   ├── scanner/
│       │   ├── contas/
│       │   └── dashboard/
│       └── ui/               # design system
├── packages/core/            # lógica pura, sem RN, sem Node
│   └── src/
│       ├── boleto.ts             ✅ pronto — 30/30 testes
│       └── boleto.test.ts        ✅ pronto
└── supabase/
    ├── migrations/0001_init.sql  ✅ pronto
    └── functions/
        └── ingerir-pdf/          # extração de boleto de PDF
```

`packages/core` é isomórfico de propósito: o mesmo parser roda no device (leitura por câmera, offline) e na Edge Function (ingestão de PDF). Uma implementação, uma suíte de testes.

---

## 3. O que já está resolvido

### `packages/core/src/boleto.ts`

Motor determinístico, zero dependências, **30/30 testes passando** (incluindo 1.000 boletos sintéticos em fuzz).

Cobre:
- Boleto bancário (47 dígitos) e de arrecadação (48 dígitos)
- Aceita linha digitável, código de barras (44) ou texto livre
- Valida todos os DVs — módulo 10 por campo, módulo 11 geral, e o modo duplo da arrecadação
- Converte linha ⇄ barras nas duas direções
- Sinaliza pendências (`vencimento`, `valor`) que exigem confirmação humana
- Sugere categoria a partir do segmento de arrecadação

**Não mexer sem rodar os testes:**
```bash
node --experimental-strip-types packages/core/src/boleto.test.ts
```

### Os dois pontos onde quase toda implementação erra

**1. A virada do fator de vencimento (fevereiro de 2025).**
O fator é um contador de dias desde uma data base. Chegou a 9999 em 21/02/2025 e reiniciou em 1000 em 22/02/2025, com nova base:

| Base | Fator 1000 | Fator 9999 |
|---|---|---|
| Antiga (07/10/1997) | 03/07/2000 | 21/02/2025 |
| Nova (29/05/2022) | 22/02/2025 | ~2052 |

Qualquer lib do GitHub escrita antes de 2025 calcula **todo boleto atual** com ~24,6 anos de erro. O motor testa as duas bases e escolhe a plausível — as bases distam ~9.000 dias, então nunca há ambiguidade real. Os testes ancoram exatamente nessas quatro datas.

**2. Arrecadação não tem vencimento no código.**
Água, luz, IPTU, multa: o código de barras carrega valor e órgão, **nunca a data**. O parser retorna `vencimento: null` e `pendencias.vencimento: true`, sempre.

Isso é requisito de produto, não detalhe técnico: se a UX não tiver um caminho fluido para capturar essa data, metade das contas do usuário fica sem alerta e o app perde o propósito. Ver §5.

---

## 4. Captura — três caminhos, todos necessários

| Caminho | Peso real de uso | Custo | Fase |
|---|---|---|---|
| Colar da área de transferência | alto | trivial | 1 |
| Câmera (código de barras) | médio | baixo | 1 |
| PDF por e-mail/WhatsApp | alto | médio | 2 |

**Clipboard.** Ao abrir o app, checar se a área de transferência contém uma sequência válida e oferecer "Adicionar conta detectada". Maior retorno por linha de código no projeto inteiro.

**Câmera.** `react-native-vision-camera` v4 com `codeTypes: ['itf']`. Boleto é Interleaved 2 of 5 de 44 dígitos. Cuidado: o scanner do `expo-camera` mira ITF-14 e falha nos 44; o AVFoundation do iOS suporta `.interleaved2of5` nativamente, então o VisionCamera resolve. Requer `expo prebuild` — não roda no Expo Go.

**PDF.** Edge Function `ingerir-pdf`:
1. `unpdf` extrai o texto
2. `extrairDeTexto()` do core acha a linha digitável
3. Se o PDF for imagem (sem camada de texto), fallback para Claude API com vision — que serve também para ler o **vencimento impresso** dos boletos de arrecadação

O fallback de vision é a peça que fecha o buraco da arrecadação. Vale prompt estruturado retornando JSON com `vencimento`, `beneficiario`, `valor`, mais um campo `confianca` que alimenta a coluna homônima em `contas`.

Padrão de Edge Function como fronteira de segurança para a chave da Claude API — mesmo desenho já usado na `extract-pdf` do GeoOps.

---

## 5. Fluxo de confirmação

Toda conta lida entra como `rascunho`. A constraint `contas_agendavel` no banco **impede** que vire `agendada` sem data e valor — o alerta nunca é agendado em cima de dado incompleto.

Tela de confirmação:
- Campos com pendência aparecem destacados e com foco automático
- Data: seletor abrindo já no mês corrente, com atalhos "dia 10", "dia 20" (padrões de vencimento)
- Se veio de recorrência conhecida (mesmo beneficiário no histórico), pré-preencher com o padrão observado
- Botão único: **Confirmar e avisar**

Regra de ouro: um boleto de água escaneado deve virar alerta em **dois toques**.

---

## 6. Notificações

`apps/mobile/src/lib/notificacoes.ts` ✅ pronto.

Locais, não push. Sem APNs, sem servidor, sem certificado, funciona offline.

**Limite do iOS: 64 notificações locais pendentes por app.** Com 3 alertas por conta (D-3, D-1, D-0 às 8h), estoura em ~21 contas. A solução implementada mantém no device apenas as ~56 mais próximas e reconcilia a fila inteira em três gatilhos: abertura do app, alteração de conta, e `expo-background-task`.

A reconciliação cancela tudo e reagenda a janela. Com ≤64 itens o custo é irrelevante e elimina a classe inteira de bugs de sincronização parcial.

Ao tocar na notificação: abrir a conta **com a linha digitável já copiada** e um toast confirmando. O usuário sai do app direto para o banco.

---

## 7. Banco

`supabase/migrations/0001_init.sql` ✅ pronto. RLS habilitado em todas as tabelas desde o primeiro dia.

- `contas` — núcleo, com rastreabilidade da leitura (`origem`, `confianca`, `avisos`, `payload_bruto`)
- `recorrencias` — contas fixas geram instâncias automaticamente
- `alertas` — espelho da fila; a tabela tem a fila completa, o device tem a janela
- `anexos` — Storage privado, particionado por `user_id`
- `categorias` — semeadas automaticamente no primeiro login

Duas constraints que carregam regra de negócio:
- `contas_linha_unica (user_id, linha_digitavel)` — reler o mesmo PDF não duplica
- `contas_agendavel` — só sai de rascunho com data e valor

---

## 8. Roadmap

### Fase 1 — MVP funcional · 5–8 dias
- [x] Motor de parsing + testes
- [x] Schema + RLS
- [x] Agendador de notificações
- [ ] Projeto Expo + Supabase Auth (magic link)
- [ ] Scanner de câmera (VisionCamera + prebuild)
- [ ] Detecção de clipboard
- [ ] CRUD de contas + tela de confirmação
- [ ] Lista "próximos vencimentos" como tela inicial
- [ ] Build EAS + TestFlight

**Critério de saída:** escanear um boleto de energia, confirmar a data, receber o alerta.

### Fase 2 — Ingestão e recorrência · +3–4 dias
- [ ] Edge Function `ingerir-pdf` com fallback de vision
- [ ] Share Extension iOS (`expo-share-extension`) — receber PDF direto do Mail/WhatsApp
- [ ] Recorrências e geração automática
- [ ] Marcar como pago + anexar comprovante

A Share Extension é o recurso que mais muda a experiência: elimina o passo de salvar-e-importar. Também é o que mais complica o build — por isso fase 2.

### Fase 3 — Inteligência · +3–5 dias
- [ ] Dashboard: gasto por categoria, evolução mensal, projeção do mês
- [ ] Orçamento por categoria com alerta de estouro
- [ ] Detecção de anomalia ("conta de luz 60% acima da média")
- [ ] Exportação CSV/OFX

---

## 9. Custos e prazos

| Item | Valor |
|---|---|
| Apple Developer Program | US$ 99/ano |
| Supabase | free tier resolve |
| EAS Build | free tier: 30 builds/mês |
| Claude API (OCR de fallback) | centavos por boleto |

Fase 1 entrega um app usável em **5 a 8 dias** de trabalho focado. Sem TestFlight e rodando em dev build no próprio device, dá para ter o ciclo escanear→avisar funcionando em **2 a 3 dias**.

---

## 10. Armadilhas catalogadas

1. **Fator de vencimento pós-2025** — §3. Não usar lib de terceiro sem verificar.
2. **Arrecadação sem data** — §3. Requisito de UX, não bug.
3. **Limite de 64 notificações no iOS** — §6. Silencioso: o iOS simplesmente descarta o excedente sem erro.
4. **`expo-camera` não lê ITF-44** — §4. Usar VisionCamera.
5. **Fuso horário na data de vencimento** — vencimento é `date`, não `timestamptz`. O parser trabalha em UTC; o agendador constrói `Date` local a partir dos componentes ano/mês/dia, nunca por `new Date(string)`.
6. **Módulo 11 da arrecadação** — existem duas convenções para resto = 1 (DV 0 vs 1). O parser adota DV 0 com modo tolerante. Se aparecer boleto legítimo rejeitado, é aqui. Guardar o caso real como teste de regressão.
7. **Expo Go não serve** — VisionCamera e Share Extension exigem dev build (`expo prebuild` + `eas build --profile development`).
