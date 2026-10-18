import { CircleAlert, LoaderCircle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { traduzirErro } from '../../lib/erros';
import { Botao } from './Botao';

export function Carregando({ rotulo = 'Carregando…', className = '' }: { rotulo?: string; className?: string }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-10 text-sm text-stone-500 ${className}`}>
      <LoaderCircle aria-hidden className="size-5 animate-spin text-vinho-500" />
      <span>{rotulo}</span>
    </div>
  );
}

export function CarregandoTela() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-papel">
      <Carregando rotulo="Preparando seu espaço…" />
    </div>
  );
}

export function Esqueleto({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-stone-200/70 ${className}`} />;
}

export function EsqueletoLista({ linhas = 3 }: { linhas?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="space-y-2">
      {Array.from({ length: linhas }, (_, i) => (
        <Esqueleto key={i} className="h-12" />
      ))}
    </div>
  );
}

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
  compacto,
}: {
  icone?: ReactNode;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white/60 text-center ${
        compacto ? 'px-4 py-6' : 'px-6 py-12'
      }`}
    >
      {icone && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-vinho-50 text-vinho-600">{icone}</div>
      )}
      <p className="font-medium text-stone-800">{titulo}</p>
      {descricao && <p className="mt-1 max-w-md text-sm text-stone-500">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function MensagemErro({ erro, aoTentarNovamente }: { erro: unknown; aoTentarNovamente?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm sm:flex-row sm:items-center">
      <CircleAlert aria-hidden className="size-5 shrink-0 text-red-600" />
      <p className="flex-1 text-red-800">{traduzirErro(erro)}</p>
      {aoTentarNovamente && (
        <Botao variante="secundario" tamanho="sm" onClick={aoTentarNovamente} icone={<RotateCw aria-hidden className="size-3.5" />}>
          Tentar novamente
        </Botao>
      )}
    </div>
  );
}
