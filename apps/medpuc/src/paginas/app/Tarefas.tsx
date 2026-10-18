import { ListaTarefas } from '../../componentes/tarefas/ListaTarefas';
import { TituloPagina } from '../../componentes/ui/Visuais';
import { useTituloPagina } from '../../hooks/useUtilitarios';

export function Tarefas() {
  useTituloPagina('Tarefas');
  return (
    <>
      <TituloPagina titulo="Tarefas" descricao="Tudo o que precisa ser feito, ordenado por prazo e prioridade." />
      <ListaTarefas />
    </>
  );
}
