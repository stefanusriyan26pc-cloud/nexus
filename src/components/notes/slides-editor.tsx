"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { IconButton } from "@/components/ui/icon-button";
import {
  newSlide,
  type SlideData,
  type SlideLayout,
  type SlidesDoc,
} from "@/lib/notes/note-type";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Google Slides-style deck editor: thumbnail rail on the left, a 16:9
 * canvas in the middle with click-to-edit text. Emits the whole document
 * on every change; persistence is the parent's concern.
 */
export function SlidesEditor({
  value,
  onChange,
}: {
  value: SlidesDoc;
  onChange: (doc: SlidesDoc) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, value.slides.length - 1);
  const slide = value.slides[index];
  const railRef = useRef<HTMLDivElement>(null);

  // Keep the active thumbnail in view when navigating (works for both the
  // vertical desktop rail and the horizontal mobile filmstrip).
  useEffect(() => {
    railRef.current
      ?.querySelector(`[data-slide-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);

  const commit = (slides: SlideData[]) => onChange({ ...value, slides });

  const updateSlide = (patch: Partial<SlideData>) =>
    commit(value.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const addSlide = () => {
    const slides = [...value.slides];
    slides.splice(index + 1, 0, newSlide());
    commit(slides);
    setSelected(index + 1);
  };

  const duplicateSlide = (i: number) => {
    const slides = [...value.slides];
    slides.splice(i + 1, 0, { ...slides[i], id: crypto.randomUUID() });
    commit(slides);
    setSelected(i + 1);
  };

  const deleteSlide = (i: number) => {
    const slides = value.slides.filter((_, idx) => idx !== i);
    commit(slides.length ? slides : [newSlide("title")]);
    setSelected(Math.max(0, Math.min(i, slides.length - 1)));
  };

  const moveSlide = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.slides.length) return;
    const slides = [...value.slides];
    [slides[i], slides[j]] = [slides[j], slides[i]];
    commit(slides);
    setSelected(j);
  };

  if (!slide) return null;

  return (
    // Filmstrip below the canvas on mobile, vertical rail on the left at sm+.
    <div className="flex min-h-0 flex-1 flex-col-reverse sm:flex-row">
      {/* ── Thumbnail rail ─────────────────────────────────────────── */}
      <div
        ref={railRef}
        className="flex shrink-0 gap-2 overflow-x-auto border-t border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 sm:w-44 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:border-r sm:border-t-0"
      >
        <button
          onClick={addSlide}
          className="flex aspect-video w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-[10px] font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400 sm:aspect-auto sm:w-full sm:flex-row sm:gap-1.5 sm:py-1.5 sm:text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("notes.newSlide")}
        </button>
        {value.slides.map((s, i) => (
            <div key={s.id} data-slide-index={i} className="group relative w-24 shrink-0 sm:w-full">
              <button
                onClick={() => setSelected(i)}
                className={cn(
                  "flex aspect-video w-full flex-col overflow-hidden rounded-md border bg-white p-1.5 text-left shadow-sm transition-all dark:bg-slate-950",
                  i === index
                    ? "border-orange-400 ring-1 ring-orange-400"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                )}
              >
                <span
                  className={cn(
                    "w-full truncate text-[9px] font-semibold text-slate-800 dark:text-slate-200",
                    s.layout === "title" && "mt-auto mb-auto text-center text-[10px]"
                  )}
                >
                  {s.title || t("notes.untitledSlide")}
                </span>
                {s.layout === "content" && (
                  <span className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-[7px] leading-tight text-slate-500 dark:text-slate-400">
                    {s.body}
                  </span>
                )}
              </button>
              <span className="absolute -left-0.5 top-0.5 rounded bg-white/80 px-0.5 text-[9px] tabular-nums text-slate-400 dark:bg-slate-950/80">
                {i + 1}
              </span>
              {/* Slide actions — desktop hover shortcut (touch uses the toolbar) */}
              <div className="absolute right-1 top-1 hidden gap-0.5 rounded-md bg-white/95 p-0.5 shadow-sm group-hover:flex dark:bg-slate-900/95">
                <IconButton icon={ChevronUp} label={t("notes.moveSlideUp")} onClick={() => moveSlide(i, -1)} disabled={i === 0} className="h-5 w-5 disabled:opacity-30 [&_svg]:h-3 [&_svg]:w-3" />
                <IconButton icon={ChevronDown} label={t("notes.moveSlideDown")} onClick={() => moveSlide(i, 1)} disabled={i === value.slides.length - 1} className="h-5 w-5 disabled:opacity-30 [&_svg]:h-3 [&_svg]:w-3" />
                <IconButton icon={Copy} label={t("notes.duplicateSlide")} onClick={() => duplicateSlide(i)} className="h-5 w-5 [&_svg]:h-3 [&_svg]:w-3" />
                <IconButton icon={Trash2} label={t("notes.deleteSlide")} onClick={() => deleteSlide(i)} className="h-5 w-5 text-red-400 hover:text-red-500 [&_svg]:h-3 [&_svg]:w-3" />
              </div>
            </div>
          ))}
      </div>

      {/* ── Canvas ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-slate-100 p-4 dark:bg-slate-950 sm:p-8">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 pb-3">
          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {index + 1} / {value.slides.length}
          </span>
          {/* Slide actions (always reachable, incl. touch) */}
          <div className="flex items-center gap-0.5">
            <IconButton icon={ChevronUp} label={t("notes.moveSlideUp")} onClick={() => moveSlide(index, -1)} disabled={index === 0} className="h-7 w-7 disabled:opacity-30" />
            <IconButton icon={ChevronDown} label={t("notes.moveSlideDown")} onClick={() => moveSlide(index, 1)} disabled={index === value.slides.length - 1} className="h-7 w-7 disabled:opacity-30" />
            <IconButton icon={Copy} label={t("notes.duplicateSlide")} onClick={() => duplicateSlide(index)} className="h-7 w-7" />
            <IconButton icon={Trash2} label={t("notes.deleteSlide")} onClick={() => deleteSlide(index)} className="h-7 w-7 text-red-400 hover:text-red-500" />
          </div>
          {/* Layout switcher */}
          <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-700 dark:bg-slate-900">
            {(["title", "content"] as SlideLayout[]).map((layout) => (
              <button
                key={layout}
                onClick={() => updateSlide({ layout })}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  slide.layout === layout
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {layout === "title" ? t("notes.layoutTitle") : t("notes.layoutContent")}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
          {slide.layout === "title" ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-[6%]">
              <textarea
                rows={1}
                value={slide.title}
                onChange={(e) => updateSlide({ title: e.target.value })}
                placeholder={t("notes.clickAddTitle")}
                className="w-full resize-none bg-transparent text-center text-3xl font-bold text-slate-900 outline-none placeholder:text-slate-300 sm:text-5xl"
              />
              <textarea
                rows={2}
                value={slide.body}
                onChange={(e) => updateSlide({ body: e.target.value })}
                placeholder={t("notes.clickAddSubtitle")}
                className="w-full resize-none bg-transparent text-center text-base text-slate-500 outline-none placeholder:text-slate-300 sm:text-xl"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col p-[5%]">
              <textarea
                rows={1}
                value={slide.title}
                onChange={(e) => updateSlide({ title: e.target.value })}
                placeholder={t("notes.clickAddTitle")}
                className="w-full resize-none border-b border-transparent bg-transparent pb-2 text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-100 sm:text-4xl"
              />
              <textarea
                value={slide.body}
                onChange={(e) => updateSlide({ body: e.target.value })}
                placeholder={t("notes.clickAddBody")}
                className="mt-4 w-full flex-1 resize-none bg-transparent text-base leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 sm:text-xl"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
