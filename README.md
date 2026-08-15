# Vence

App de controle de despesas com leitura de boletos. Lê, organiza e avisa — não paga.

Especificação completa: [`docs/spec-boletos.md`](docs/spec-boletos.md).

## Testar no celular agora

Sem backend, sem conta Apple, sem build. O app entra em **modo local**: guarda
as contas num arquivo no próprio aparelho.

1. Instale o **Expo Go** na loja do seu celular.
2. No computador, na raiz do repositório:

```bash
npm install
cd apps/mobile
npm run go
```

3. Leia o QR code com a câmera (iPhone) ou pelo próprio Expo Go (Android).

O celular e o computador precisam estar na mesma rede. Se a rede bloquear a
conexão, rode `npm run go -- --tunnel`.

**O que dá para testar assim:** colar uma linha digitável, a detecção de
clipboard, a tela de confirmação com os campos pendentes, a lista de
vencimentos e os alertas locais em D-3, D-1 e no dia às 8h.

**O que não dá:** a câmera. A leitura de código de barras usa a VisionCamera,
que é código nativo e não existe no Expo Go — a tela mostra um aviso no lugar.
A reconciliação em background também fica de fora; abertura do app e edição de
conta continuam reagendando a fila normalmente.

Os dados ficam só no aparelho e somem se o app for desinstalado.

## Com backend e câmera

Preencha `apps/mobile/.env` a partir do `.env.example` e o app passa a usar
Supabase com login por magic link — o modo local desliga sozinho quando as duas
variáveis existem.

```bash
cd apps/mobile
npx expo prebuild --clean       # gera ios/ e android/
npx expo run:ios                # dev build no simulador ou device
```

Antes, aplique `supabase/migrations/0001_init.sql` no projeto e cadastre
`vence://` nas Redirect URLs do painel do Supabase.

Para build na nuvem, o `eas.json` traz os perfis `development`, `simulador`,
`preview` e `production`.

## Estrutura

```
apps/mobile/           Expo SDK 57 (RN 0.86), Expo Router
  src/app/             rotas: index, entrar, capturar, conta/[id]
  src/lib/             db (dispatcher), db-local, db-supabase, notificacoes,
                       sincronizacao, formato, ambiente, config
  src/features/        scanner (VisionCamera, carregado sob guarda)
  src/ui/              tema e componentes
packages/core/         parser FEBRABAN, zero dependências, isomórfico
supabase/migrations/   schema + RLS
docs/previa.html       protótipo web do fluxo, com o parser real
```

A camada de dados tem duas implementações com a mesma interface. As telas
importam de `lib/db` e não sabem qual está ativa.

## Verificação

```bash
npm test                        # parser: 30 testes
cd apps/mobile && npm run typecheck
npx expo export --platform ios  # fecha o grafo de módulos
npx expo-doctor
```

Nada foi executado em aparelho ainda. Typecheck e bundle provam que o grafo
fecha, não que as telas funcionam.

## Ao mexer

Não alterar `packages/core/src/boleto.ts` sem rodar `npm test`. Ver §10 da spec
para as armadilhas já catalogadas — em especial a virada do fator de vencimento
de 2025, a ausência de data nos boletos de arrecadação, e o limite de 64
notificações locais do iOS.

Armadilhas novas, posteriores à spec:

- A VisionCamera 5 trocou a API da v4 (`useCodeScanner` virou `useObjectOutput`)
  e passou a distinguir `interleaved-2-of-5` de `itf-14`. Boleto é o primeiro.
- A v5 não publica mais config plugin: a permissão de câmera vai direto no
  `infoPlist` do `app.json`.
- Módulo nativo ausente nem sempre lança erro capturável em JavaScript. Por isso
  `lib/ambiente.ts` detecta o Expo Go antes de tentar carregar.
