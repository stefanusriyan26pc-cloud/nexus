"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type LatexJsGenerator = {
  domFragment(): DocumentFragment;
  htmlDocument(baseURL?: string): Document;
};
type LatexJs = {
  parse: (text: string, options: { generator: LatexJsGenerator }) => unknown;
  HtmlGenerator: new (options: { hyphenate: boolean }) => LatexJsGenerator;
};

declare global {
  interface Window {
    latexjs?: LatexJs;
  }
}

// The UMD build loads its document classes/packages relative to its own URL,
// so the whole latex.js dist folder is served from /public/latexjs.
let loader: Promise<void> | null = null;
function loadLatexJs(): Promise<void> {
  if (window.latexjs) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/latexjs/latex.js";
      script.onload = () => resolve();
      script.onerror = () => {
        loader = null;
        reject(new Error("failed to load latex.js"));
      };
      document.head.appendChild(script);
    });
  }
  return loader;
}

/**
 * latex.js can't handle a few constructs every Overleaf document uses.
 * Rewrite them (line-preserving, so error lines still map to the source):
 * - \usepackage → blanked (loader would throw "require is not defined")
 * - \newcommand/\renewcommand without args → expanded textually
 * - equation/displaymath environments → \[ ... \]
 * - align/gather environments → \[ \begin{aligned/gathered} ... \]
 */
function sanitizeForLatexJs(source: string): string {
  const macros: [string, string][] = [];
  const lines = source.split("\n").map((line) => {
    const def = line.match(/^\s*\\(?:re)?newcommand\{\\([A-Za-z]+)\}(?:\[\d+\])?\{((?:[^{}]|\{[^{}]*\})*)\}\s*$/);
    if (def) {
      macros.push([def[1], def[2]]);
      return "";
    }
    if (/^\s*\\usepackage(\[[^\]]*\])?\{[^}]*\}\s*$/.test(line)) return "";
    return line;
  });
  let out = lines.join("\n");
  for (const [name, body] of macros) {
    out = out.replace(new RegExp("\\\\" + name + "(?![A-Za-z])", "g"), body.replace(/\$/g, "$$$$"));
  }
  return out
    .replace(/\\begin\{(?:equation|displaymath)\*?\}/g, "\\[")
    .replace(/\\end\{(?:equation|displaymath)\*?\}/g, "\\]")
    .replace(/\\begin\{(align|gather)\*?\}/g, (_m, env: string) => `\\[\\begin{${env}ed}`)
    .replace(/\\end\{(align|gather)\*?\}/g, (_m, env: string) => `\\end{${env}ed}\\]`);
}

type ParseIssue = { message: string; line: number | null };

function issueFromError(e: unknown): ParseIssue {
  const message = e instanceof Error ? e.message : String(e);
  const loc = (e as { location?: { start?: { line?: number } } })?.location;
  return { message, line: typeof loc?.start?.line === "number" ? loc.start.line : null };
}

/**
 * Overleaf-style compiled output: the document is rendered into an isolated
 * iframe with latex.js' own stylesheets (real TeX typography, CMU fonts) —
 * a white "page" like a PDF viewer pane. Errors keep the last good render
 * and surface a banner with a jump-to-source-line action.
 */
export function LatexFull({
  content,
  className,
  onRendered,
  onJumpToLine,
  onIframeReady,
}: {
  content: string;
  className?: string;
  onRendered?: () => void;
  /** Overleaf-style "go to source line" from the error banner. */
  onJumpToLine?: (line: number) => void;
  /** Fires whenever the compiled document (re)loads — used for printing. */
  onIframeReady?: (iframe: HTMLIFrameElement) => void;
}) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [parseError, setParseError] = useState<ParseIssue | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLatexJs()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.latexjs) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled || !window.latexjs || !iframeRef.current) return;
      try {
        const generator = new window.latexjs.HtmlGenerator({ hyphenate: false });
        window.latexjs.parse(sanitizeForLatexJs(content), { generator });
        const doc = generator.htmlDocument(`${window.location.origin}/latexjs/`);
        const style = doc.createElement("style");
        style.textContent =
          "html{background:#fff;} body{padding:2.5rem 3rem;} @media print { body{padding:0;} }";
        doc.head.appendChild(style);
        iframeRef.current.srcdoc = "<!DOCTYPE html>" + doc.documentElement.outerHTML;
        setParseError(null);
      } catch (e) {
        // Keep the last successful render visible; just surface the error.
        setParseError(issueFromError(e));
      }
      onRendered?.();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onRendered is a fire-once print hook
  }, [ready, content]);

  if (loadFailed) {
    return (
      <p className="py-10 text-center text-sm text-red-500">{t("notes.latexEngineFailed")}</p>
    );
  }

  return (
    <div className={cn("relative flex min-h-0 flex-col", className)}>
      {parseError && (
        <div className="absolute inset-x-2 top-2 z-10 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-md dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{t("notes.latexError")}</span>
            {parseError.line !== null && ` · ${t("notes.latexErrorLine").replace("{n}", String(parseError.line))}`}
            : {parseError.message}
          </p>
          {parseError.line !== null && onJumpToLine && (
            <button
              onClick={() => onJumpToLine(parseError.line!)}
              className="shrink-0 rounded-md bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700"
            >
              {t("notes.goToLine").replace("{n}", String(parseError.line))}
            </button>
          )}
        </div>
      )}
      {!ready ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("notes.latexLoading")}
        </p>
      ) : (
        <iframe
          ref={iframeRef}
          title="LaTeX output"
          onLoad={() => {
            if (iframeRef.current) onIframeReady?.(iframeRef.current);
          }}
          className="mx-auto block h-full w-full max-w-3xl min-h-0 flex-1 rounded-sm bg-white shadow-xl ring-1 ring-black/15"
        />
      )}
    </div>
  );
}
