"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import type { Note } from "@/types/database";
import { format, parseISO } from "date-fns";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

export function NoteGrid({
  notes,
  onEdit,
  onTogglePin,
}: {
  notes: Note[];
  onEdit: (note: Note) => void;
  onTogglePin: (note: Note) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => onEdit(note)}
          className={cn(
            "group cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 dark:shadow-none dark:hover:shadow-lg dark:hover:shadow-black/20",
            note.is_pinned
              ? "border-amber-200 bg-amber-50/30 dark:border-amber-700/50 dark:bg-amber-950/20"
              : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="mb-2 flex items-start justify-between">
            <h3 className="line-clamp-1 font-medium text-slate-900 dark:text-slate-100">{note.title}</h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note);
              }}
              className={cn(
                "opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100",
                note.is_pinned && "text-amber-500 opacity-100"
              )}
            >
              <Pin className="h-4 w-4" />
            </button>
          </div>
          <p className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">
            {note.content || t("notes.noContent")}
          </p>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {format(parseISO(note.updated_at), "MMM d, yyyy")}
          </p>
        </div>
      ))}
    </div>
  );
}
