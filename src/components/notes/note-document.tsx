"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { findMathMatches } from "@/components/notes/latex-content";
import type { ReactNode } from "react";

/** Apply `fn` only to the stretches of text outside math spans. */
function transformOutsideMath(text: string, fn: (chunk: string) => string): string {
  const spans = findMathMatches(text);
  let out = "";
  let last = 0;
  for (const span of spans) {
    out += fn(text.slice(last, span.start));
    out += text.slice(span.start, span.end);
    last = span.end;
  }
  return out + fn(text.slice(last));
}

// Overleaf-style LaTeX display environments → $$ blocks (KaTeX needs the
// aligned/gathered variants inside math mode).
function latexEnvironmentsToMath(text: string): string {
  return text
    .replace(
      /\\begin\{(equation\*?|displaymath)\}([\s\S]*?)\\end\{\1\}/g,
      (_m, _env, body: string) => `\n\n$$\n${body.trim()}\n$$\n\n`
    )
    .replace(
      /\\begin\{(align|gather)(\*?)\}([\s\S]*?)\\end\{\1\2\}/g,
      (_m, env: string, _star, body: string) =>
        `\n\n$$\n\\begin{${env}ed}\n${body.trim()}\n\\end{${env}ed}\n$$\n\n`
    );
}

// Common LaTeX document commands → Markdown, so notes pasted from an
// Overleaf-style paper still render as a document instead of raw markup.
function latexCommandsToMarkdown(chunk: string): string {
  return chunk
    .replace(/\\(documentclass|usepackage|maketitle|tableofcontents|newpage|pagebreak|label|bibliographystyle|bibliography)(\[[^\]]*\])?(\{[^}]*\})?/g, "")
    .replace(/\\(begin|end)\{(document|abstract|center|figure|table)\}(\[[^\]]*\])?/g, "")
    .replace(/\\title\{([^}]*)\}/g, "\n# $1\n")
    .replace(/\\author\{([^}]*)\}/g, "\n*$1*\n")
    .replace(/\\date\{[^}]*\}/g, "")
    .replace(/\\chapter\*?\{([^}]*)\}/g, "\n# $1\n")
    .replace(/\\section\*?\{([^}]*)\}/g, "\n## $1\n")
    .replace(/\\subsection\*?\{([^}]*)\}/g, "\n### $1\n")
    .replace(/\\subsubsection\*?\{([^}]*)\}/g, "\n#### $1\n")
    .replace(/\\paragraph\{([^}]*)\}/g, "\n**$1** ")
    .replace(/\\textbf\{([^}]*)\}/g, "**$1**")
    .replace(/\\(textit|emph)\{([^}]*)\}/g, "*$2*")
    .replace(/\\texttt\{([^}]*)\}/g, "`$1`")
    .replace(/\\underline\{([^}]*)\}/g, "$1")
    .replace(/\\(begin|end)\{(itemize|enumerate)\}/g, "")
    .replace(/^[ \t]*\\item[ \t]*/gm, "- ")
    .replace(/^[ \t]*%.*$/gm, "");
}

// remark-math is greedy about single dollars ("$100 dan $200" becomes math);
// escape currency-style dollars that aren't part of a valid math span.
const escapeCurrencyDollars = (chunk: string) => chunk.replace(/\$(?=\d)/g, "\\$");

// remark-math only recognizes dollar delimiters; normalize the LaTeX-style
// \[...\] / \(...\) forms so both conventions work in notes.
function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr: string) => `\n\n$$\n${expr}\n$$\n\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, expr: string) => `$${expr}$`);
}

/** Full note → Markdown-with-$math$ pipeline (also used for the outline). */
export function preprocessNote(text: string): string {
  const normalized = latexEnvironmentsToMath(normalizeMathDelimiters(text));
  return transformOutsideMath(normalized, (chunk) =>
    escapeCurrencyDollars(latexCommandsToMarkdown(chunk))
  );
}

export function headingSlug(text: string, index: number): string {
  const base = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return `nd-${base || "heading"}-${index}`;
}

export type OutlineItem = { level: number; text: string; id: string };

export function extractOutline(content: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  let inFence = false;
  for (const line of preprocessNote(content).split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^(#{1,4})\s+(.+?)\s*$/);
    if (m) items.push({ level: m[1].length, text: m[2], id: headingSlug(m[2], items.length) });
  }
  return items;
}

function nodeText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return nodeText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/**
 * Full document renderer for notes: Markdown (GFM) + LaTeX math, plus a
 * compatibility layer for common LaTeX document commands. Used by the note
 * editor preview, presentation mode, and PDF export — note cards keep the
 * lighter `LatexContent` snippet renderer.
 */
export function NoteDocument({ content, className }: { content: string; className?: string }) {
  // Number headings in render order so ids line up with extractOutline().
  let headingIndex = 0;
  const headingId = (children: ReactNode) => headingSlug(nodeText(children), headingIndex++);

  return (
    <div className={cn("text-sm leading-relaxed text-slate-700 dark:text-slate-300", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, output: "html" }]]}
        components={{
          h1: ({ children }) => (
            <h1 id={headingId(children)} className="mb-3 mt-6 scroll-mt-4 text-2xl font-bold text-slate-900 first:mt-0 dark:text-slate-100">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 id={headingId(children)} className="mb-2 mt-5 scroll-mt-4 text-xl font-semibold text-slate-900 first:mt-0 dark:text-slate-100">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={headingId(children)} className="mb-2 mt-4 scroll-mt-4 text-lg font-semibold text-slate-900 first:mt-0 dark:text-slate-100">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 id={headingId(children)} className="mb-1 mt-3 scroll-mt-4 font-semibold text-slate-900 first:mt-0 dark:text-slate-100">{children}</h4>
          ),
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-slate-300 pl-4 italic text-slate-600 dark:border-slate-600 dark:text-slate-400">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">{children}</pre>
          ),
          code: ({ children, className: codeClass }) => (
            <code className={cn("rounded bg-slate-100 px-1 py-0.5 text-[0.85em] dark:bg-slate-800", codeClass)}>
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold dark:border-slate-700 dark:bg-slate-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-2 py-1 dark:border-slate-700">{children}</td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-slate-200 dark:border-slate-800" />,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied remote URLs, no static dimensions
            <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} className="my-3 max-w-full rounded-lg" />
          ),
        }}
      >
        {preprocessNote(content)}
      </ReactMarkdown>
    </div>
  );
}
