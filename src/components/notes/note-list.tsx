"use client";

import { IconButton } from "@/components/ui/icon-button";
import { useTranslation } from "@/components/providers/i18n-provider";
import type { Note } from "@/types/database";
import { format, parseISO } from "date-fns";
import { Pin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NoteList({
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
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {notes.map((note) => (
        <div
          key={note.id}
          className={cn(
            "group flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50",
            note.is_pinned && "bg-amber-50/30 dark:bg-amber-950/10"
          )}
        >
          <button
            type="button"
            onClick={() => onTogglePin(note)}
            className={cn(
              "shrink-0 text-slate-300 transition-colors hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400",
              note.is_pinned && "text-amber-500 dark:text-amber-400"
            )}
            aria-label={note.is_pinned ? t("notes.unpin") : t("notes.pin")}
          >
            <Pin className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(note)}
            className="flex min-w-0 flex-1 items-center gap-4 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {note.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {note.content || t("notes.noContent")}
              </p>
            </div>
            <span className="hidden shrink-0 text-xs text-slate-400 dark:text-slate-500 sm:block">
              {format(parseISO(note.updated_at), "MMM d, yyyy")}
            </span>
          </button>

          <IconButton
            icon={Trash2}
            label={t("common.delete")}
            onClick={() => onDelete(note.id)}
            className="text-red-400 opacity-100 transition-opacity hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:text-red-300"
          />
        </div>
      ))}
    </div>
  );
}
