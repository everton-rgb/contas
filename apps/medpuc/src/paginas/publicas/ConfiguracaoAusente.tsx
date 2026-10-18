/**
 * Exibida quando o build não tem as variáveis do Supabase (ou tem uma chave
 * secreta no lugar da pública). Evita uma tela branca sem explicação.
 */
export function ConfiguracaoAusente({ motivo }: { motivo: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-papel px-6">
      <div className="max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-cartao">
        <p className="text-xs font-semibold tracking-wide text-vinho-700 uppercase">MedPUC</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold">Configuração incompleta</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">{motivo}</p>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Defina <code className="rounded bg-stone-100 px-1">VITE_SUPABASE_URL</code> e{' '}
          <code className="rounded bg-stone-100 px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> (no arquivo{' '}
          <code className="rounded bg-stone-100 px-1">.env.local</code> ou no painel do Netlify) e gere o build novamente.
        </p>
      </div>
    </main>
  );
}
