import { defineConfig } from 'vitest/config';

// Testes contra o Supabase local (npm run db:start). Verificam o RLS pela
// API, do mesmo jeito que um navegador adulterado tentaria.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['testes/api/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
