"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { sheetColName, type SheetDoc } from "@/lib/notes/note-type";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Excel-style grid editor (MVP, no formulas): lettered columns, numbered
 * rows, click-to-edit cells, Enter/arrow navigation, add/remove rows and
 * columns. Emits the whole sheet on every change.
 */
export function SheetEditor({
  value,
  onChange,
}: {
  value: SheetDoc;
  onChange: (doc: SheetDoc) => void;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const rowCount = value.rows.length;
  const colCount = value.rows[0]?.length ?? 0;

  const commit = (rows: string[][]) => onChange({ ...value, rows });

  const setCell = (r: number, c: number, cell: string) =>
    commit(value.rows.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? cell : v)) : row)));

  const addRow = () => commit([...value.rows, Array(colCount).fill("")]);
  const removeRow = () => rowCount > 1 && commit(value.rows.slice(0, -1));
  const addCol = () => commit(value.rows.map((row) => [...row, ""]));
  const removeCol = () => colCount > 1 && commit(value.rows.map((row) => row.slice(0, -1)));

  const focusCell = (r: number, c: number) => {
    const target = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-cell="${r}-${c}"]`
    );
    if (target) {
      target.focus();
      target.select();
    }
  };

  const handleKeys = (e: ReactKeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const input = e.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    let next: [number, number] | null = null;

    if (e.key === "Enter") next = [Math.min(r + 1, rowCount - 1), c];
    else if (e.key === "ArrowDown") next = [Math.min(r + 1, rowCount - 1), c];
    else if (e.key === "ArrowUp") next = [Math.max(r - 1, 0), c];
    else if (e.key === "ArrowLeft" && atStart) next = [r, Math.max(c - 1, 0)];
    else if (e.key === "ArrowRight" && atEnd) next = [r, Math.min(c + 1, colCount - 1)];

    if (next) {
      e.preventDefault();
      focusCell(next[0], next[1]);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* ── Sheet toolbar ──────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {sheetColName(active.c)}{active.r + 1}
        </span>
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <button onClick={addRow} className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          <Plus className="h-3 w-3" /> {t("notes.addRow")}
        </button>
        <button onClick={removeRow} disabled={rowCount <= 1} className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800">
          <Minus className="h-3 w-3" /> {t("notes.removeRow")}
        </button>
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <button onClick={addCol} className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          <Plus className="h-3 w-3" /> {t("notes.addCol")}
        </button>
        <button onClick={removeCol} disabled={colCount <= 1} className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800">
          <Minus className="h-3 w-3" /> {t("notes.removeCol")}
        </button>
        <span className="ml-auto tabular-nums text-slate-400 dark:text-slate-500">
          {rowCount} × {colCount}
        </span>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      <div ref={gridRef} className="min-h-0 flex-1 overflow-auto bg-white dark:bg-slate-950">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 h-7 w-10 border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
              {Array.from({ length: colCount }, (_, c) => (
                <th
                  key={c}
                  className={cn(
                    "sticky top-0 z-10 h-7 min-w-28 border border-slate-200 bg-slate-50 px-2 text-center text-[11px] font-semibold dark:border-slate-800 dark:bg-slate-900",
                    active.c === c ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {sheetColName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, r) => (
              <tr key={r}>
                <td
                  className={cn(
                    "sticky left-0 z-10 border border-slate-200 bg-slate-50 px-2 text-center text-[11px] font-semibold tabular-nums dark:border-slate-800 dark:bg-slate-900",
                    active.r === r ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {r + 1}
                </td>
                {row.map((cell, c) => (
                  <td key={c} className="border border-slate-200 p-0 dark:border-slate-800">
                    <input
                      data-cell={`${r}-${c}`}
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      onFocus={() => setActive({ r, c })}
                      onKeyDown={(e) => handleKeys(e, r, c)}
                      className={cn(
                        "h-8 w-full min-w-28 bg-transparent px-2 text-sm text-slate-800 outline-none dark:text-slate-200",
                        "focus:relative focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
