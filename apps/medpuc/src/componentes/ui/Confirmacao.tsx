import { Botao } from './Botao';
import { Modal } from './Modal';

type Props = {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
};

export function Confirmacao({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = 'Excluir',
  carregando,
  aoConfirmar,
  aoCancelar,
}: Props) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoCancelar}
      titulo={titulo}
      largura="sm"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoCancelar} data-autofoco>
            Cancelar
          </Botao>
          <Botao variante="perigo" onClick={aoConfirmar} carregando={carregando}>
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      <p className="text-sm leading-6 text-stone-600">{mensagem}</p>
    </Modal>
  );
}
