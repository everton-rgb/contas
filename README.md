# Vence

App de controle de despesas com leitura de boletos. Lê, organiza e avisa — não paga.

Especificação completa: [`docs/spec-boletos.md`](docs/spec-boletos.md).

## Estrutura

```
apps/mobile/           Expo SDK 57 (RN 0.86), Expo Router, Supabase
  src/app/             rotas: index, entrar, capturar, conta/[id]
  src/lib/             supabase, db, notificacoes, sincronizacao, formato
  src/features/        scanner (VisionCamera)
  src/ui/              tema e componentes
packages/core/         parser FEBRABAN, zero dependências, isomórfico
supabase/migrations/   schema + RLS
docs/previa.html       protótipo web do fluxo, com o parser real
```

`packages/core` roda igual no device e na Edge Function. O Metro alcança o
pacote pelo `watchFolders` configurado em `apps/mobile/metro.config.js`.

## Rodando

```bash
npm install
cp apps/mobile/.env.example apps/mobile/.env    # preencha com seu projeto Supabase
npm test                                        # parser: 30 testes

cd apps/mobile
npx expo prebuild --clean                       # gera ios/ e android/
npx expo run:ios                                # dev build no simulador ou device
```

**Expo Go não serve.** VisionCamera precisa de código nativo, então o ciclo é
`prebuild` + dev build (`npx expo run:ios` ou `eas build --profile development`).

Antes de rodar, aplique `supabase/migrations/0001_init.sql` no projeto e habilite
o login por magic link no painel do Supabase, com `vence://` na lista de
Redirect URLs.

## Estado

Feito: parser, schema, agendador de alertas, app Expo com auth por magic link,
captura por clipboard e câmera, CRUD de contas, tela de confirmação e lista de
vencimentos. O bundle fecha (`npx expo export`) e o typecheck passa.

Falta: rodar num device de verdade, build EAS e TestFlight. Nada do app foi
executado em aparelho ainda — só bundle e tipos.

Fase 2 e 3 (Edge Function de PDF, Share Extension, recorrências, dashboard)
seguem como na spec.

## Ao mexer

Não alterar `packages/core/src/boleto.ts` sem rodar `npm test`. Ver §10 da spec
para as armadilhas já catalogadas — em especial a virada do fator de vencimento
de 2025, a ausência de data nos boletos de arrecadação, e o limite de 64
notificações locais do iOS.

Uma armadilha nova, posterior à spec: a VisionCamera 5 trocou a API da v4
(`useCodeScanner` virou `useObjectOutput`) e passou a distinguir
`interleaved-2-of-5` de `itf-14`. Boleto é o primeiro. A v5 também não publica
mais config plugin — a permissão de câmera vai direto no `infoPlist` do
`app.json`.
