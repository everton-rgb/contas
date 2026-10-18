/**
 * Editor rico do caderno digital (TipTap): títulos, listas, checklists.
 * O documento é guardado como JSON; o texto puro alimenta a pesquisa.
 */

import { TaskItem, TaskList } from '@tiptap/extension-list';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, useEditorState, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Redo2,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

type Props = {
  conteudoInicial: JSONContent;
  aoMudar: (documento: JSONContent, texto: string) => void;
};

function BotaoFerramenta({
  icone: Icone,
  rotulo,
  ativo,
  desabilitado,
  aoClicar,
}: {
  icone: LucideIcon;
  rotulo: string;
  ativo?: boolean;
  desabilitado?: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={aoClicar}
      disabled={desabilitado}
      aria-label={rotulo}
      aria-pressed={ativo}
      title={rotulo}
      className={`flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-30 ${
        ativo ? 'bg-vinho-50 text-vinho-700' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
      }`}
    >
      <Icone aria-hidden className="size-4" />
    </button>
  );
}

export function EditorTexto({ conteudoInicial, aoMudar }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Comece a escrever… Use a barra acima para títulos, listas e checklists.' }),
    ],
    content: conteudoInicial,
    editorProps: {
      attributes: { 'aria-label': 'Conteúdo da anotação', role: 'textbox', 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor: e }) => aoMudar(e.getJSON(), e.getText({ blockSeparator: '\n' })),
  });

  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h1: e.isActive('heading', { level: 1 }),
            h2: e.isActive('heading', { level: 2 }),
            negrito: e.isActive('bold'),
            italico: e.isActive('italic'),
            lista: e.isActive('bulletList'),
            numerada: e.isActive('orderedList'),
            checklist: e.isActive('taskList'),
            citacao: e.isActive('blockquote'),
            desfazer: e.can().undo(),
            refazer: e.can().redo(),
          }
        : null,
  });

  if (!editor || !estado) return null;
  const cadeia = () => editor.chain().focus();

  return (
    <div className="editor-anotacao">
      <div
        role="toolbar"
        aria-label="Formatação"
        className="sticky top-14 z-10 -mx-1 mb-4 flex flex-wrap items-center gap-0.5 rounded-xl border border-stone-200 bg-white/95 p-1 shadow-sm backdrop-blur lg:top-2"
      >
        <BotaoFerramenta icone={Heading1} rotulo="Título" ativo={estado.h1} aoClicar={() => cadeia().toggleHeading({ level: 1 }).run()} />
        <BotaoFerramenta icone={Heading2} rotulo="Subtítulo" ativo={estado.h2} aoClicar={() => cadeia().toggleHeading({ level: 2 }).run()} />
        <span aria-hidden className="mx-1 h-5 w-px bg-stone-200" />
        <BotaoFerramenta icone={Bold} rotulo="Negrito" ativo={estado.negrito} aoClicar={() => cadeia().toggleBold().run()} />
        <BotaoFerramenta icone={Italic} rotulo="Itálico" ativo={estado.italico} aoClicar={() => cadeia().toggleItalic().run()} />
        <span aria-hidden className="mx-1 h-5 w-px bg-stone-200" />
        <BotaoFerramenta icone={List} rotulo="Lista" ativo={estado.lista} aoClicar={() => cadeia().toggleBulletList().run()} />
        <BotaoFerramenta icone={ListOrdered} rotulo="Lista numerada" ativo={estado.numerada} aoClicar={() => cadeia().toggleOrderedList().run()} />
        <BotaoFerramenta icone={ListTodo} rotulo="Checklist" ativo={estado.checklist} aoClicar={() => cadeia().toggleTaskList().run()} />
        <BotaoFerramenta icone={Quote} rotulo="Citação" ativo={estado.citacao} aoClicar={() => cadeia().toggleBlockquote().run()} />
        <span aria-hidden className="mx-1 h-5 w-px bg-stone-200" />
        <BotaoFerramenta icone={Undo2} rotulo="Desfazer" desabilitado={!estado.desfazer} aoClicar={() => cadeia().undo().run()} />
        <BotaoFerramenta icone={Redo2} rotulo="Refazer" desabilitado={!estado.refazer} aoClicar={() => cadeia().redo().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
