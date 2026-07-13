"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import type { DocDoc } from "@/lib/notes/note-type";
import { cn } from "@/lib/utils";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

/**
 * Google Docs-style WYSIWYG editor (TipTap/ProseMirror): formatting toolbar
 * on top, a white "page" you type into directly. Emits the whole document on
 * every change; persistence is the parent's concern.
 */
export function DocEditor({
  value,
  onChange,
}: {
  value: DocDoc;
  onChange: (doc: DocDoc) => void;
}) {
  const { t } = useTranslation();

  const editor = useEditor({
    extensions: [StarterKit],
    content: value.html || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "nexus-doc-body min-h-full outline-none",
        "aria-label": t("notes.docCanvas"),
      },
    },
    onUpdate: ({ editor: e }) => onChange({ ...value, html: e.getHTML() }),
  });

  const button = (
    icon: typeof Bold,
    label: string,
    action: (e: Editor) => void,
    isActive?: (e: Editor) => boolean,
    isDisabled?: (e: Editor) => boolean
  ) => {
    const Icon = icon;
    const active = editor ? isActive?.(editor) ?? false : false;
    const disabled = !editor || (isDisabled ? isDisabled(editor) : false);
    return (
      <button
        key={label}
        type="button"
        title={label}
        disabled={disabled}
        onMouseDown={(ev) => ev.preventDefault()} // keep editor selection
        onClick={() => editor && action(editor)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30",
          active
            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* ── Formatting toolbar ─────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        {button(Undo2, t("notes.tbUndo"), (e) => e.chain().focus().undo().run(), undefined, (e) => !e.can().undo())}
        {button(Redo2, t("notes.tbRedo"), (e) => e.chain().focus().redo().run(), undefined, (e) => !e.can().redo())}
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        {button(Bold, `${t("notes.tbBold")} (⌘B)`, (e) => e.chain().focus().toggleBold().run(), (e) => e.isActive("bold"))}
        {button(Italic, `${t("notes.tbItalic")} (⌘I)`, (e) => e.chain().focus().toggleItalic().run(), (e) => e.isActive("italic"))}
        {button(Strikethrough, t("notes.tbStrike"), (e) => e.chain().focus().toggleStrike().run(), (e) => e.isActive("strike"))}
        {button(Code, t("notes.tbCode"), (e) => e.chain().focus().toggleCode().run(), (e) => e.isActive("code"))}
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        {button(Heading1, t("notes.tbHeading1"), (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), (e) => e.isActive("heading", { level: 1 }))}
        {button(Heading2, t("notes.tbHeading2"), (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), (e) => e.isActive("heading", { level: 2 }))}
        {button(Heading3, t("notes.tbHeading3"), (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), (e) => e.isActive("heading", { level: 3 }))}
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        {button(List, t("notes.tbList"), (e) => e.chain().focus().toggleBulletList().run(), (e) => e.isActive("bulletList"))}
        {button(ListOrdered, t("notes.tbOrderedList"), (e) => e.chain().focus().toggleOrderedList().run(), (e) => e.isActive("orderedList"))}
        {button(Quote, t("notes.tbQuote"), (e) => e.chain().focus().toggleBlockquote().run(), (e) => e.isActive("blockquote"))}
        {button(Minus, t("notes.tbHr"), (e) => e.chain().focus().setHorizontalRule().run())}
      </div>

      {/* ── Page canvas ────────────────────────────────────────────── */}
      <div
        className="min-h-0 flex-1 cursor-text overflow-y-auto bg-slate-100 p-4 dark:bg-slate-950 sm:p-8"
        onClick={() => editor?.chain().focus().run()}
      >
        <div className="mx-auto min-h-full w-full max-w-3xl rounded-lg bg-white px-8 py-10 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 sm:px-14 sm:py-14">
          <EditorContent editor={editor} className="min-h-96" />
        </div>
      </div>
    </div>
  );
}
