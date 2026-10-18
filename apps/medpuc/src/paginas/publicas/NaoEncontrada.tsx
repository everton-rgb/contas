import { BotaoLink } from '../../componentes/ui/Botao';
import { Marca } from '../../componentes/ui/Visuais';
import { useTituloPagina } from '../../hooks/useUtilitarios';

export function NaoEncontrada() {
  useTituloPagina('Página não encontrada');
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Marca />
      <p className="mt-10 font-serif text-6xl font-semibold text-vinho-200">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-stone-500">O endereço pode ter mudado ou o item foi excluído.</p>
      <BotaoLink to="/" className="mt-8">
        Voltar ao início
      </BotaoLink>
    </main>
  );
}
