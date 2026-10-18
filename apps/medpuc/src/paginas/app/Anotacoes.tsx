import { ListaAnotacoes } from '../../componentes/anotacoes/ListaAnotacoes';
import { TituloPagina } from '../../componentes/ui/Visuais';
import { useTituloPagina } from '../../hooks/useUtilitarios';

export function Anotacoes() {
  useTituloPagina('Minhas anotações');
  return (
    <>
      <TituloPagina titulo="Minhas anotações" descricao="Gerais e de todas as disciplinas, salvas na sua conta." />
      <ListaAnotacoes />
    </>
  );
}
