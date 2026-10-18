import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { ambienteSupabaseLocal } from './testes/ambiente';

// Datas dos testes e do navegador no mesmo fuso da turma.
process.env.TZ ??= 'America/Sao_Paulo';

const ambiente = ambienteSupabaseLocal();
const chromium =
  process.env.PLAYWRIGHT_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

export default defineConfig({
  testDir: 'testes/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'pt-BR',
    timezoneId: process.env.TZ,
    trace: 'retain-on-failure',
    launchOptions: chromium ? { executablePath: chromium } : {},
  },
  projects: [
    { name: 'desktop', testIgnore: /celular/, use: { viewport: { width: 1366, height: 900 } } },
    {
      name: 'celular',
      testMatch: /celular/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { VITE_SUPABASE_URL: ambiente.url, VITE_SUPABASE_PUBLISHABLE_KEY: ambiente.publica },
  },
});
