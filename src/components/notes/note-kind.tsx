"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { getNoteKind, type NoteKind } from "@/lib/notes/note-type";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/database";
import { FileCode2, FileText, Presentation, StickyNote, Table } from "lucide-react";

// Office/Overleaf-inspired identities: Word blue, PowerPoint orange,
// Excel green, Overleaf-ish teal for LaTeX, neutral for quick notes.
export const KIND_META: Record<
  NoteKind,
  { icon: typeof FileText; labelKey: string; chip: string; glyph: string; tile: string }
> = {
  note: {
    icon: StickyNote,
    labelKey: "notes.kindNote",
    chip: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    glyph: "text-slate-400 dark:text-slate-500",
    tile: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
  docx: {
    icon: FileText,
    labelKey: "notes.kindDocx",
    chip: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    glyph: "text-blue-500 dark:text-blue-400",
    tile: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  },
  pptx: {
    icon: Presentation,
    labelKey: "notes.kindPptx",
    chip: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
    glyph: "text-orange-500 dark:text-orange-400",
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  },
  xlsx: {
    icon: Table,
    labelKey: "notes.kindXlsx",
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    glyph: "text-emerald-500 dark:text-emerald-400",
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  latex: {
    icon: FileCode2,
    labelKey: "notes.kindLatex",
    chip: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
    glyph: "text-teal-500 dark:text-teal-400",
    tile: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
  },
};

type NoteLike = Pick<Note, "note_type" | "content">;

/** Small rounded label chip, e.g. bottom-right of note cards. */
export function NoteKindChip({ note, className }: { note: NoteLike; className?: string }) {
  const { t } = useTranslation();
  const meta = KIND_META[getNoteKind(note)];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        meta.chip,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {t(meta.labelKey)}
    </span>
  );
}

/** Bare colored icon, e.g. in the editor's note switcher. */
export function NoteKindGlyph({ note, className }: { note: NoteLike; className?: string }) {
  const meta = KIND_META[getNoteKind(note)];
  const Icon = meta.icon;
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.glyph, className)} />;
}

/** Squared icon tile, e.g. leading the list rows. */
export function NoteKindTile({ note, className }: { note: NoteLike; className?: string }) {
  const { t } = useTranslation();
  const meta = KIND_META[getNoteKind(note)];
  const Icon = meta.icon;
  return (
    <span
      title={t(meta.labelKey)}
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tile, className)}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
