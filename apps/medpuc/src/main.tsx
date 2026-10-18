import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfiguracaoAusente } from './paginas/publicas/ConfiguracaoAusente';
import { configuracao } from './lib/configuracao';

const raiz = createRoot(document.getElementById('raiz')!);

if (!configuracao.valida) {
  raiz.render(<ConfiguracaoAusente motivo={configuracao.motivo} />);
} else {
  // Importados só com configuração válida: criam o cliente do Supabase.
  const [{ App }, { ProvedorAutenticacao }, { ProvedorNotificacoes }] = await Promise.all([
    import('./App'),
    import('./contextos/Autenticacao'),
    import('./contextos/Notificacoes'),
  ]);

  const clienteConsultas = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
      mutations: { retry: 0 },
    },
  });

  raiz.render(
    <StrictMode>
      <QueryClientProvider client={clienteConsultas}>
        <ProvedorNotificacoes>
          <ProvedorAutenticacao>
            <App />
          </ProvedorAutenticacao>
        </ProvedorNotificacoes>
      </QueryClientProvider>
    </StrictMode>,
  );
}
