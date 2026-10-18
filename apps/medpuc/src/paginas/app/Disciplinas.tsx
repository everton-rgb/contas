import { BookOpen, LayoutTemplate, Plus } from 'lucide-react';
import { useState } from 'react';
import { CartaoDisciplina } from '../../componentes/disciplinas/CartaoDisciplina';
import { FormularioDisciplina } from '../../componentes/disciplinas/FormularioDisciplina';
import { Botao, BotaoLink } from '../../componentes/ui/Botao';
import { EstadoVazio, Esqueleto, MensagemErro } from '../../componentes/ui/Estados';
import { TituloPagina } from '../../componentes/ui/Visuais';
import { limiteDe, useMeuPlano } from '../../hooks/useConta';
import { useResumoAcademico } from '../../hooks/useResumoAcademico';
import { useTituloPagina } from '../../hooks/useUtilitarios';

export function Disciplinas() {
  useTituloPagina('Minhas disciplinas');
  const resumo = useResumoAcademico();
  const { data: plano } = useMeuPlano();
  const [criando, setCriando] = useState(false);
  const limite = limiteDe(plano?.limites, 'disciplinas');

  return (
    <>
      <TituloPagina
        titulo="Minhas disciplinas"
        descricao={
          limite !== null && resumo.disciplinas.length
            ? `${resumo.disciplinas.length} de ${limite} disciplinas do plano ${plano?.nome ?? ''}`
            : 'Cada disciplina reúne conteúdos, avaliações, anotações e tarefas.'
        }
        acoes={
          <>
            <BotaoLink to="/app/configuracao" variante="secundario" icone={<LayoutTemplate aria-hidden className="size-4" />}>
              Adicionar do modelo
            </BotaoLink>
            <Botao icone={<Plus aria-hidden className="size-4" />} onClick={() => setCriando(true)}>
              Nova disciplina
            </Botao>
          </>
        }
      />

      {resumo.erro ? (
        <MensagemErro erro={resumo.erro} aoTentarNovamente={resumo.recarregar} />
      ) : resumo.carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Esqueleto key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : resumo.disciplinas.length === 0 ? (
        <EstadoVazio
          icone={<BookOpen aria-hidden className="size-5" />}
          titulo="Você ainda não tem disciplinas"
          descricao="Adicione as disciplinas do 3º período a partir do modelo, ou crie as suas do zero."
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <BotaoLink to="/app/configuracao">Usar o modelo do período</BotaoLink>
              <Botao variante="secundario" onClick={() => setCriando(true)}>
                Criar disciplina
              </Botao>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resumo.disciplinas.map((d) => (
            <CartaoDisciplina
              key={d.id}
              disciplina={d}
              proximaAvaliacao={resumo.proximaAvaliacao.get(d.id)}
              pendentes={resumo.pendentes.get(d.id) ?? 0}
              progresso={resumo.progresso.get(d.id)}
            />
          ))}
        </div>
      )}

      <FormularioDisciplina aberto={criando} aoFechar={() => setCriando(false)} />
    </>
  );
}
