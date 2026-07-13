"use client";

import { NoteDocument } from "@/components/notes/note-document";
import { useTranslation } from "@/components/providers/i18n-provider";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * Slides are separated by `---` lines; notes without any separator fall back
 * to one slide per top-level (# / ##) heading, or a single slide.
 */
export function splitSlides(content: string): string[] {
  const bySeparator = content
    .split(/\n\s*---\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bySeparator.length > 1) return bySeparator;

  const slides: string[] = [];
  let current: string[] = [];
  for (const line of content.split("\n")) {
    if (/^#{1,2}\s/.test(line) && current.some((l) => l.trim() !== "")) {
      slides.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  const last = current.join("\n").trim();
  if (last) slides.push(last);
  return slides.length > 0 ? slides : [content.trim()];
}

export function NotePresent({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const slides = useMemo(() => splitSlides(content), [content]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture-phase + stopPropagation so the note modal underneath
        // (which also listens for Escape) stays open.
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onClose, slides.length]);

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-white dark:bg-slate-950">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800/60">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {index + 1} / {slides.length}
          </span>
          <IconButton icon={X} label={t("notes.exitPresentation")} onClick={onClose} />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8 sm:px-16">
        <NoteDocument
          key={index}
          content={slides[index]}
          className="w-full max-w-3xl text-base sm:text-lg [&_h1]:text-3xl sm:[&_h1]:text-4xl [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h3]:text-xl sm:[&_h3]:text-2xl"
        />
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800/60">
        <IconButton
          icon={ChevronLeft}
          label={t("notes.prevSlide")}
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
          className="disabled:opacity-30"
        />
        <IconButton
          icon={ChevronRight}
          label={t("notes.nextSlide")}
          onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
          disabled={index === slides.length - 1}
          className="disabled:opacity-30"
        />
      </div>
    </div>
  );
}
