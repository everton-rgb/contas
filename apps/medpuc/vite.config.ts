import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { validarConfiguracao } from './src/lib/validacaoConfiguracao';

export default defineConfig(({ command, mode }) => {
  // No Netlify (NETLIFY=true), um build sem as variáveis do Supabase, ou com
  // a chave secreta no lugar da pública, falha em vez de publicar o site.
  if (command === 'build' && process.env.NETLIFY === 'true') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const resultado = validarConfiguracao(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY,
    );
    if (!resultado.valida) {
      throw new Error(`[MedPUC] ${resultado.motivo} Ajuste em Site configuration → Environment variables no Netlify.`);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            supabase: ['@supabase/supabase-js'],
            editor: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-list', '@tiptap/extension-placeholder'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/testes/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
