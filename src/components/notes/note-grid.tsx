"use client";

import { LatexContent } from "@/components/notes/latex-content";
import { NoteKindChip } from "@/components/notes/note-kind";
import { useTranslation } from "@/components/providers/i18n-provider";
import { getNotePreviewText, getNoteType } from "@/lib/notes/note-type";
import type { Note } from "@/types/database";
import { format, parseISO } from "date-fns";
import { Pin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NoteGrid({
  notes,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  notes: Note[];
  onEdit: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => onEdit(note)}
          className={cn(
            "group flex cursor-pointer flex-col rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-black/20",
            note.is_pinned
              ? "border-amber-200 bg-amber-50/30 dark:border-amber-700/50 dark:bg-amber-950/20"
              : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-1">
            <h3 className="line-clamp-1 font-medium text-slate-900 dark:text-slate-100">{note.title}</h3>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note);
                }}
                aria-label={note.is_pinned ? t("notes.unpin") : t("notes.pin")}
                className={cn(
                  "text-slate-400 opacity-100 transition-opacity hover:text-amber-500 sm:opacity-0 sm:group-hover:opacity-100",
                  note.is_pinned && "text-amber-500 opacity-100"
                )}
              >
                <Pin className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
                aria-label={t("common.delete")}
                className="text-slate-400 opacity-100 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </span>
          </div>
          <p className="line-clamp-4 flex-1 text-sm text-slate-500 dark:text-slate-400">
            {!note.content
              ? t("notes.noContent")
              : getNoteType(note) === "document"
              ? <LatexContent text={getNotePreviewText(note)} />
              : <span className="whitespace-pre-wrap">{note.content}</span>}
          </p>
          {/* Footer pinned to the bottom; kind chip always bottom-right. */}
          <p className="mt-auto flex items-end justify-between gap-1.5 pt-3 text-xs text-slate-400 dark:text-slate-500">
            {format(parseISO(note.updated_at), "MMM d, yyyy")}
            <NoteKindChip note={note} />
          </p>
        </div>
      ))}
    </div>
  );
}
