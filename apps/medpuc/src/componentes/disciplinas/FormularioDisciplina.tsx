import { useEffect, useState, type FormEvent } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useDisciplinas, useSalvarDisciplina } from '../../hooks/useDisciplinas';
import { sugerirCor } from '../../lib/cores';
import { traduzirErro } from '../../lib/erros';
import { corObrigatoria, obrigatorio, primeiro, tamanhoMaximo } from '../../lib/validacao';
import type { Disciplina } from '../../tipos/dominio';
import { Botao } from '../ui/Botao';
import { AreaTexto, Campo } from '../ui/Campos';
import { Modal } from '../ui/Modal';
import { SeletorCor } from '../ui/SeletorCor';

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  disciplina?: Disciplina | null;
  aoSalvar?: (disciplina: Disciplina) => void;
};

export function FormularioDisciplina({ aberto, aoFechar, disciplina, aoSalvar }: Props) {
  const avisos = useNotificacoes();
  const { data: existentes = [] } = useDisciplinas();
  const salvar = useSalvarDisciplina();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('');
  const [professor, setProfessor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erros, setErros] = useState<{ nome?: string; cor?: string; professor?: string; descricao?: string }>({});

  useEffect(() => {
    if (!aberto) return;
    setNome(disciplina?.nome ?? '');
    setCor(disciplina?.cor ?? sugerirCor(existentes.map((d) => d.cor)));
    setProfessor(disciplina?.professor ?? '');
    setDescricao(disciplina?.descricao ?? '');
    setErros({});
    // As cores em uso só importam no momento de abrir.
  }, [aberto, disciplina]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos = {
      nome: primeiro(obrigatorio(nome, 'O nome'), tamanhoMaximo(nome, 120)),
      cor: corObrigatoria(cor),
      professor: tamanhoMaximo(professor, 120),
      descricao: tamanhoMaximo(descricao, 2000),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    try {
      const salva = await salvar.mutateAsync({ id: disciplina?.id, dados: { nome, cor, professor, descricao } });
      avisos.sucesso(disciplina ? 'Disciplina atualizada.' : 'Disciplina criada.');
      aoSalvar?.(salva);
      aoFechar();
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={disciplina ? 'Editar disciplina' : 'Nova disciplina'}
      descricao={disciplina ? undefined : 'Crie uma disciplina personalizada para organizar seus estudos.'}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-disciplina" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-disciplina" onSubmit={enviar} noValidate className="space-y-4">
        <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} data-autofoco />
        <SeletorCor valor={cor || '#8C1D40'} aoMudar={setCor} erro={erros.cor} />
        <Campo rotulo="Professor(a)" value={professor} onChange={(e) => setProfessor(e.target.value)} erro={erros.professor} opcional />
        <AreaTexto
          rotulo="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          erro={erros.descricao}
          placeholder="Ementa, critérios de avaliação, bibliografia…"
          opcional
        />
      </form>
    </Modal>
  );
}
