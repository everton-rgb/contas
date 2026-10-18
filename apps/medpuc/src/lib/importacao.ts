/**
 * importacao.ts — leitura das listas coladas pelo administrador.
 *
 * Disciplinas: uma por linha, "Nome" ou "Nome;#RRGGBB".
 * Datas: "Disciplina;Tipo;Título;Data;Início;Fim" (início e fim opcionais).
 * Aceita ponto e vírgula ou tabulação (colar direto de planilha).
 */

import { corValida, sugerirCor } from './cores';
import { isoValida } from './datas';
import { normalizar } from './texto';
import { TIPOS_EVENTO, type TipoEvento } from '../tipos/dominio';

export type ErroLinha = { linha: number; mensagem: string };

export type DisciplinaImportada = { nome: string; cor: string };
export type EventoImportado = {
  disciplina: string;
  tipo: TipoEvento;
  titulo: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
};

function separar(linha: string): string[] {
  return linha.split(/;|\t/).map((c) => c.trim());
}

function linhasUteis(texto: string): { numero: number; conteudo: string }[] {
  return texto
    .split(/\r?\n/)
    .map((conteudo, i) => ({ numero: i + 1, conteudo: conteudo.trim() }))
    .filter((l) => l.conteudo && !l.conteudo.startsWith('#'));
}

export function lerDisciplinas(
  texto: string,
  coresEmUso: string[] = [],
): { itens: DisciplinaImportada[]; erros: ErroLinha[] } {
  const itens: DisciplinaImportada[] = [];
  const erros: ErroLinha[] = [];
  const vistos = new Set<string>();
  const cores = [...coresEmUso];

  for (const { numero, conteudo } of linhasUteis(texto)) {
    const [nome, cor] = separar(conteudo);
    if (!nome) {
      erros.push({ linha: numero, mensagem: 'Nome da disciplina vazio.' });
      continue;
    }
    if (nome.length > 120) {
      erros.push({ linha: numero, mensagem: 'Nome com mais de 120 caracteres.' });
      continue;
    }
    if (cor && !corValida(cor)) {
      erros.push({ linha: numero, mensagem: `Cor "${cor}" inválida. Use o formato #RRGGBB.` });
      continue;
    }
    const chave = normalizar(nome);
    if (vistos.has(chave)) {
      erros.push({ linha: numero, mensagem: `"${nome}" aparece mais de uma vez.` });
      continue;
    }
    vistos.add(chave);
    const corFinal = cor || sugerirCor(cores);
    cores.push(corFinal);
    itens.push({ nome, cor: corFinal });
  }
  return { itens, erros };
}

function lerData(valor: string): string | null {
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor);
  const iso = br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : valor;
  return isoValida(iso) ? iso : null;
}

function lerHora(valor: string | undefined): string | null | false {
  if (!valor) return null;
  const m = /^(\d{1,2})[:h](\d{2})$/.exec(valor);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return false;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function lerTipo(valor: string): TipoEvento | null {
  const chave = normalizar(valor).replace(/\s+/g, '_');
  const tipo = TIPOS_EVENTO.find(
    (t) => t.valor === chave || normalizar(t.rotulo).replace(/\s+/g, '_') === chave,
  );
  if (tipo) return tipo.valor;
  if (chave === 'pratica' || chave === 'avaliacao') return 'avaliacao_pratica';
  return null;
}

export function lerEventos(
  texto: string,
  disciplinasConhecidas: string[],
): { itens: EventoImportado[]; erros: ErroLinha[] } {
  const itens: EventoImportado[] = [];
  const erros: ErroLinha[] = [];
  const conhecidas = new Map(disciplinasConhecidas.map((n) => [normalizar(n), n]));

  for (const { numero, conteudo } of linhasUteis(texto)) {
    const [disciplina, tipoTexto, titulo, dataTexto, inicioTexto, fimTexto] = separar(conteudo);
    const nomeDisciplina = conhecidas.get(normalizar(disciplina ?? ''));
    if (!nomeDisciplina) {
      erros.push({ linha: numero, mensagem: `Disciplina "${disciplina ?? ''}" não está no modelo.` });
      continue;
    }
    const tipo = lerTipo(tipoTexto ?? '');
    if (!tipo) {
      erros.push({ linha: numero, mensagem: `Tipo "${tipoTexto ?? ''}" não reconhecido.` });
      continue;
    }
    if (!titulo) {
      erros.push({ linha: numero, mensagem: 'Título vazio.' });
      continue;
    }
    const data = lerData(dataTexto ?? '');
    if (!data) {
      erros.push({ linha: numero, mensagem: `Data "${dataTexto ?? ''}" inválida. Use DD/MM/AAAA.` });
      continue;
    }
    const inicio = lerHora(inicioTexto);
    const fim = lerHora(fimTexto);
    if (inicio === false || fim === false) {
      erros.push({ linha: numero, mensagem: 'Horário inválido. Use HH:MM.' });
      continue;
    }
    if (fim && (!inicio || fim <= inicio)) {
      erros.push({ linha: numero, mensagem: 'O término precisa ser depois do início.' });
      continue;
    }
    itens.push({ disciplina: nomeDisciplina, tipo, titulo: titulo.slice(0, 160), data, hora_inicio: inicio, hora_fim: fim });
  }
  return { itens, erros };
}
