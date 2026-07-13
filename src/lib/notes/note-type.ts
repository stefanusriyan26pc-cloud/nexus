import type { Note } from "@/types/database";

export type NoteType = "simple" | "document";

// Math delimiters, headings, bold, lists, slide breaks, LaTeX commands —
// anything that only renders meaningfully through the document pipeline.
const DOCUMENT_SYNTAX =
  /\$\$|\\\(|\\\[|(?:^|[^\\$])\$[^\s$][^$\n]*[^\s$\\]\$|^#{1,4}\s|\*\*[^*]|^\s*[-*]\s|^\s*\d+\.\s|^---\s*$|\\(?:section|subsection|chapter|title|textbf|emph|begin)\b|^\|.*\|/m;

export function looksLikeDocument(content: string): boolean {
  return DOCUMENT_SYNTAX.test(content);
}

/** A complete LaTeX source — rendered with the full latex.js engine. */
export function isFullLatex(content: string): boolean {
  return /\\documentclass|\\begin\{document\}/.test(content);
}

/**
 * Office-style flavor of a note, shown on cards/lists: quick notes are
 * "note"; documents are classified by content — structured slide decks,
 * LaTeX source, markdown decks (--- breaks), sheet-like notes (mostly
 * table rows), or plain documents.
 */
export type NoteKind = "note" | "docx" | "pptx" | "xlsx" | "latex";

export function getNoteKind(note: Pick<Note, "note_type" | "content">): NoteKind {
  if (parseSlidesDoc(note.content)) return "pptx";
  if (parseDocDoc(note.content)) return "docx";
  if (parseSheetDoc(note.content)) return "xlsx";
  if (getNoteType(note) === "simple") return "note";
  const content = note.content;
  if (isFullLatex(content)) return "latex";
  if (/^---\s*$/m.test(content)) return "pptx";
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  const tableLines = lines.filter((l) => /^\|.*\|$/.test(l.trim())).length;
  if (lines.length > 0 && tableLines / lines.length >= 0.5) return "xlsx";
  return "docx";
}

// ── Structured slide decks (Google Slides-style editor) ────────────────
// Stored as JSON in note.content, marked by the `nexus` field so plain
// markdown/LaTeX notes are unaffected.

export type SlideLayout = "title" | "content";
export type SlideData = { id: string; layout: SlideLayout; title: string; body: string };
export type SlidesDoc = { nexus: "slides"; v: 1; slides: SlideData[] };

const SLIDES_PREFIX = '{"nexus":"slides"';

export function parseSlidesDoc(content: string): SlidesDoc | null {
  if (!content.startsWith(SLIDES_PREFIX)) return null;
  try {
    const doc = JSON.parse(content) as SlidesDoc;
    if (doc.nexus === "slides" && Array.isArray(doc.slides)) return doc;
  } catch {
    // fall through — treat as plain text
  }
  return null;
}

export function serializeSlidesDoc(doc: SlidesDoc): string {
  // `nexus` first so the string keeps the SLIDES_PREFIX marker.
  return JSON.stringify({ nexus: doc.nexus, v: doc.v, slides: doc.slides });
}

export function newSlide(layout: SlideLayout = "content"): SlideData {
  return { id: crypto.randomUUID(), layout, title: "", body: "" };
}

/** Markdown view of a deck — feeds presentation mode, export, and search. */
export function slidesToMarkdown(doc: SlidesDoc): string {
  return doc.slides
    .map((s) => {
      const heading = s.title ? `${s.layout === "title" ? "#" : "##"} ${s.title}` : "";
      return [heading, s.body].filter(Boolean).join("\n\n");
    })
    .join("\n\n---\n\n");
}

/** Convert a markdown deck (--- separators) into the structured format. */
export function slidesFromMarkdown(md: string): SlidesDoc {
  const chunks = md
    .split(/\n\s*---\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);
  const slides: SlideData[] = (chunks.length ? chunks : [""]).map((chunk, i) => {
    const lines = chunk.split("\n");
    const headingIdx = lines.findIndex((l) => /^#{1,2}\s/.test(l));
    const title = headingIdx >= 0 ? lines[headingIdx].replace(/^#{1,2}\s+/, "") : "";
    const body = lines
      .filter((_, idx) => idx !== headingIdx)
      .join("\n")
      .trim();
    return { id: crypto.randomUUID(), layout: i === 0 ? "title" : "content", title, body };
  });
  return { nexus: "slides", v: 1, slides };
}

// ── Rich documents (Google Docs-style WYSIWYG) ─────────────────────────

export type DocDoc = { nexus: "doc"; v: 1; html: string };

const DOC_PREFIX = '{"nexus":"doc"';

export function parseDocDoc(content: string): DocDoc | null {
  if (!content.startsWith(DOC_PREFIX)) return null;
  try {
    const doc = JSON.parse(content) as DocDoc;
    if (doc.nexus === "doc" && typeof doc.html === "string") return doc;
  } catch {
    // fall through
  }
  return null;
}

export function serializeDocDoc(doc: DocDoc): string {
  return JSON.stringify({ nexus: doc.nexus, v: doc.v, html: doc.html });
}

export function emptyDocDoc(): DocDoc {
  return { nexus: "doc", v: 1, html: "" };
}

export function docToPlainText(doc: DocDoc): string {
  return doc.html
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// ── Sheets (Excel-style grid) ───────────────────────────────────────────

export type SheetDoc = { nexus: "sheet"; v: 1; rows: string[][] };

const SHEET_PREFIX = '{"nexus":"sheet"';

export function parseSheetDoc(content: string): SheetDoc | null {
  if (!content.startsWith(SHEET_PREFIX)) return null;
  try {
    const doc = JSON.parse(content) as SheetDoc;
    if (doc.nexus === "sheet" && Array.isArray(doc.rows)) return doc;
  } catch {
    // fall through
  }
  return null;
}

export function serializeSheetDoc(doc: SheetDoc): string {
  return JSON.stringify({ nexus: doc.nexus, v: doc.v, rows: doc.rows });
}

export function emptySheetDoc(rows = 12, cols = 6): SheetDoc {
  return { nexus: "sheet", v: 1, rows: Array.from({ length: rows }, () => Array(cols).fill("")) };
}

/** Spreadsheet column label: 0 → A, 25 → Z, 26 → AA … */
export function sheetColName(index: number): string {
  let name = "";
  let i = index;
  do {
    name = String.fromCharCode(65 + (i % 26)) + name;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return name;
}

function sheetToPlainText(doc: SheetDoc): string {
  return doc.rows
    .map((row) => row.filter((c) => c.trim()).join(" · "))
    .filter(Boolean)
    .join("\n");
}

/** Human-readable snippet for cards/lists (JSON payloads would look raw). */
export function getNotePreviewText(note: Pick<Note, "content">): string {
  const deck = parseSlidesDoc(note.content);
  if (deck) {
    return deck.slides
      .map((s) => s.title || s.body.split("\n")[0])
      .filter(Boolean)
      .join(" · ");
  }
  const doc = parseDocDoc(note.content);
  if (doc) return docToPlainText(doc);
  const sheet = parseSheetDoc(note.content);
  if (sheet) return sheetToPlainText(sheet);
  return note.content;
}

/**
 * Notes created before note_type existed have it as null; fall back to
 * sniffing the content so math/markdown notes keep opening as documents.
 */
export function getNoteType(note: Pick<Note, "note_type" | "content">): NoteType {
  if (note.note_type === "simple" || note.note_type === "document") return note.note_type;
  return looksLikeDocument(note.content) ? "document" : "simple";
}
