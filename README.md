# Vence

App de controle de despesas com leitura de boletos. Lê, organiza e avisa — não paga.

Especificação completa: [`docs/spec-boletos.md`](docs/spec-boletos.md).

## Estrutura

```
apps/mobile/src/lib/notificacoes.ts   agendador de alertas locais (janela de 56)
packages/core/src/boleto.ts           parser FEBRABAN, zero dependências
packages/core/src/boleto.test.ts      30 testes, incluindo fuzz
supabase/migrations/0001_init.sql      schema + RLS
```

`packages/core` é isomórfico: o mesmo parser roda no device e na Edge Function.

## Testes

```bash
npm test
# ou: node --experimental-strip-types packages/core/src/boleto.test.ts
```

Não alterar `boleto.ts` sem rodar a suíte. Ver §10 da spec para as armadilhas
já catalogadas — em especial a virada do fator de vencimento de 2025 e a
ausência de data nos boletos de arrecadação.

## Estado

Fase 1 em andamento. Prontos: parser, schema, agendador de notificações.
Pendentes: projeto Expo, auth, scanner, clipboard, CRUD, build EAS.
