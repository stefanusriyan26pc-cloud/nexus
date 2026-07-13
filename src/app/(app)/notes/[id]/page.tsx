"use client";

import { DocEditor } from "@/components/notes/doc-editor";
import { LatexFull } from "@/components/notes/latex-full";
import { jumpEditorToLine, LatexSourceEditor } from "@/components/notes/latex-source-editor";
import type { EditorView } from "@uiw/react-codemirror";
import { NoteDocument, extractOutline } from "@/components/notes/note-document";
import { NoteKindGlyph } from "@/components/notes/note-kind";
import { NotePresent } from "@/components/notes/note-present";
import { SheetEditor } from "@/components/notes/sheet-editor";
import { SlidesEditor } from "@/components/notes/slides-editor";
import { useTranslation } from "@/components/providers/i18n-provider";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/input";
import {
  docToPlainText,
  emptyDocDoc,
  emptySheetDoc,
  getNotePreviewText,
  getNoteType,
  isFullLatex,
  parseDocDoc,
  parseSheetDoc,
  parseSlidesDoc,
  serializeDocDoc,
  serializeSheetDoc,
  serializeSlidesDoc,
  sheetColName,
  slidesFromMarkdown,
  slidesToMarkdown,
  type NoteType,
} from "@/lib/notes/note-type";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Note, NoteFolder } from "@/types/database";
import {
  ArrowLeft,
  Bold,
  Columns2,
  Eye,
  FileCode2,
  FileDown,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  ListTree,
  PanelLeft,
  PanelLeftClose,
  PencilLine,
  Pin,
  Play,
  Plus,
  Presentation,
  Radical,
  Save,
  Sigma,
  SquareSplitVertical,
  StickyNote,
  Table,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

type ViewMode = "editor" | "split" | "preview";
type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type Snapshot = { title: string; content: string; folderId: string; noteType: NoteType };

type NoteListItem = Pick<Note, "id" | "title" | "content" | "note_type" | "is_pinned" | "updated_at">;

// When a brand-new note gets its first save we router.replace() to its real
// URL, which remounts the keyed editor. The handoff carries the live editor
// state across that remount so typing/caret aren't interrupted, while keeping
// the Next router in sync with the URL (history.replaceState would desync it).
type Handoff = { id: string; latest: Snapshot; saved: Snapshot; caret: [number, number] | null };
let pendingHandoff: Handoff | null = null;

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  // Key by note id: switching notes remounts the editor, which flushes any
  // pending autosave for the previous note and resets all editor state.
  return <NoteEditor key={id} noteId={id} />;
}

function NoteEditor({ noteId }: { noteId: string }) {
  const isNew = noteId === "new";
  const router = useRouter();
  const { t } = useTranslation();

  // Seed from the handoff on the post-first-save remount (cleared in load()).
  const [seed] = useState<Handoff | null>(() =>
    pendingHandoff && pendingHandoff.id === noteId ? pendingHandoff : null
  );

  const [loading, setLoading] = useState(!isNew && !seed);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notesList, setNotesList] = useState<NoteListItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(isNew ? null : noteId);
  const [title, setTitle] = useState(seed?.latest.title ?? "");
  const [content, setContent] = useState(seed?.latest.content ?? "");
  const [folderId, setFolderId] = useState(seed?.latest.folderId ?? "");
  const [noteType, setNoteType] = useState<NoteType>(seed?.latest.noteType ?? "document");
  const [mode, setMode] = useState<ViewMode>("split");
  const [status, setStatus] = useState<SaveStatus>(seed ? "saved" : "idle");
  const [presenting, setPresenting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(isNew);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [autosaveOn, setAutosaveOn] = useState(true);
  const [autoCompile, setAutoCompile] = useState(true);
  const [compiledLatex, setCompiledLatex] = useState(seed?.latest.content ?? "");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latexViewRef = useRef<EditorView | null>(null);
  const latexIframeRef = useRef<HTMLIFrameElement | null>(null);
  const pendingLatexPrintRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const noteIdRef = useRef<string | null>(isNew ? null : noteId);
  const savedRef = useRef<Snapshot | null>(
    isNew ? { title: "", content: "", folderId: "", noteType: "document" } : seed ? seed.saved : null
  );
  const savingRef = useRef(false);
  const queuedRef = useRef(false);

  const deferredContent = useDeferredValue(content);
  const slidesDoc = useMemo(
    () => (noteType === "document" ? parseSlidesDoc(content) : null),
    [content, noteType]
  );
  const docDoc = useMemo(
    () => (noteType === "document" ? parseDocDoc(content) : null),
    [content, noteType]
  );
  const sheetDoc = useMemo(
    () => (noteType === "document" ? parseSheetDoc(content) : null),
    [content, noteType]
  );
  // Structured editors (slides/doc/sheet) replace the markdown split view.
  const structured = Boolean(slidesDoc || docDoc || sheetDoc);
  const outline = useMemo(
    () => (structured ? [] : extractOutline(deferredContent)),
    [deferredContent, structured]
  );
  const fullLatex = noteType === "document" && !structured && isFullLatex(deferredContent);
  // Present/export/word-count read the deck through its markdown projection.
  const presentableContent = useMemo(
    () => (slidesDoc ? slidesToMarkdown(slidesDoc) : content),
    [slidesDoc, content]
  );

  // Split needs width; phones start in editor mode. Deferred past hydration
  // so the server-rendered split layout matches the first client render.
  useEffect(() => {
    if (window.innerWidth >= 640) return;
    const raf = requestAnimationFrame(() => setMode("editor"));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    async function load() {
      const fromHandoff = seed !== null;
      if (fromHandoff) {
        pendingHandoff = null;
        const caret = seed.caret;
        if (caret) {
          requestAnimationFrame(() => {
            const ta = textareaRef.current;
            if (ta) {
              ta.focus();
              ta.setSelectionRange(caret[0], caret[1]);
            }
          });
        }
      }
      const supabase = createClient();
      const [foldersRes, listRes, noteRes] = await Promise.all([
        supabase.from("note_folders").select("*").order("position"),
        supabase
          .from("notes")
          .select("id,title,content,note_type,is_pinned,updated_at")
          .order("is_pinned", { ascending: false })
          .order("updated_at", { ascending: false }),
        isNew || fromHandoff
          ? Promise.resolve(null)
          : supabase.from("notes").select("*").eq("id", noteId).single(),
      ]);
      setFolders(foldersRes.data ?? []);
      setNotesList((listRes.data as NoteListItem[]) ?? []);
      if (isNew || fromHandoff) return;
      const note = (noteRes?.data ?? null) as Note | null;
      if (!note) {
        router.replace("/notes");
        return;
      }
      setTitle(note.title);
      setContent(note.content);
      setCompiledLatex(note.content);
      setFolderId(note.folder_id ?? "");
      const type = getNoteType(note);
      setNoteType(type);
      savedRef.current = { title: note.title, content: note.content, folderId: note.folder_id ?? "", noteType: type };
      setLoading(false);
    }
    load();
  }, [noteId, isNew, router, seed]);

  // Note switcher: remembered preference, else open by default on wide
  // screens (post-hydration, like mode).
  useEffect(() => {
    const stored = window.localStorage.getItem("nexus-notes-sidebar");
    const wantOpen = stored !== null ? stored === "1" : window.innerWidth >= 1024;
    if (!wantOpen) return;
    const raf = requestAnimationFrame(() => setSidebarOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleSidebar = () =>
    setSidebarOpen((open) => {
      window.localStorage.setItem("nexus-notes-sidebar", open ? "0" : "1");
      return !open;
    });

  // Remembered editor preferences (Office-style save / Overleaf-style compile).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (window.localStorage.getItem("nexus-notes-autosave") === "0") setAutosaveOn(false);
      if (window.localStorage.getItem("nexus-notes-autocompile") === "0") setAutoCompile(false);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleAutosave = () =>
    setAutosaveOn((on) => {
      window.localStorage.setItem("nexus-notes-autosave", on ? "0" : "1");
      return !on;
    });

  const toggleAutoCompile = () =>
    setAutoCompile((on) => {
      window.localStorage.setItem("nexus-notes-autocompile", on ? "0" : "1");
      return !on;
    });

  const latestRef = useRef<Snapshot>({ title: "", content: "", folderId: "", noteType: "document" });
  const doSaveRef = useRef<() => void>(() => {});

  const doSave = useCallback(async () => {
    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }
    const snapshot: Snapshot = { title, content, folderId, noteType };
    // Nothing worth persisting yet — don't create empty notes.
    if (!noteIdRef.current && !snapshot.title.trim() && !snapshot.content.trim()) return;

    savingRef.current = true;
    setStatus("saving");
    const supabase = createClient();
    const payload = {
      title: snapshot.title.trim() || t("notes.untitled"),
      content: snapshot.content,
      folder_id: snapshot.folderId || null,
      note_type: snapshot.noteType,
    };

    let error = null;
    const isUpdate = Boolean(noteIdRef.current);
    if (noteIdRef.current) {
      ({ error } = await supabase.from("notes").update(payload).eq("id", noteIdRef.current));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: insertError } = await supabase
        .from("notes")
        .insert({ ...payload, user_id: user!.id })
        .select()
        .single();
      error = insertError;
      if (data) {
        noteIdRef.current = data.id;
        setCurrentId(data.id);
        const ta = textareaRef.current;
        pendingHandoff = {
          id: data.id,
          latest: latestRef.current,
          saved: snapshot,
          caret: ta ? [ta.selectionStart, ta.selectionEnd] : null,
        };
        // Suppress this instance's unmount flush; the remounted editor
        // reconciles any delta via the handoff's saved snapshot.
        savedRef.current = latestRef.current;
        router.replace(`/notes/${data.id}`, { scroll: false });
      }
    }

    savingRef.current = false;
    if (error) {
      setStatus("error");
      return;
    }
    // Insert path already set savedRef for the remount handoff.
    if (isUpdate) savedRef.current = snapshot;
    setStatus("saved");
    // Keep the sidebar list in sync without refetching.
    const savedId = noteIdRef.current;
    if (savedId) {
      setNotesList((prev) =>
        prev.some((n) => n.id === savedId)
          ? prev.map((n) =>
              n.id === savedId
                ? { ...n, title: payload.title, content: payload.content, note_type: payload.note_type }
                : n
            )
          : [
              {
                id: savedId,
                title: payload.title,
                content: payload.content,
                note_type: payload.note_type,
                is_pinned: false,
                updated_at: new Date().toISOString(),
              },
              ...prev,
            ]
      );
    }
    if (queuedRef.current) {
      queuedRef.current = false;
      doSaveRef.current();
    }
  }, [title, content, folderId, noteType, t, router]);

  useEffect(() => {
    latestRef.current = { title, content, folderId, noteType };
    doSaveRef.current = doSave;
  });

  // Autosave: debounce after the last change.
  useEffect(() => {
    const saved = savedRef.current;
    if (!saved) return; // still loading
    if (
      saved.title === title &&
      saved.content === content &&
      saved.folderId === folderId &&
      saved.noteType === noteType
    ) {
      return;
    }
    setStatus("dirty");
    if (!autosaveOn) return; // manual save via the Save button / ⌘S
    const timer = setTimeout(doSave, 1200);
    return () => clearTimeout(timer);
  }, [title, content, folderId, noteType, doSave, autosaveOn]);

  // ⌘S / Ctrl+S — Office-style explicit save.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        doSaveRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Overleaf-style compile: auto-compile re-renders the LaTeX preview shortly
  // after typing stops; when off, only the Compile button updates it.
  useEffect(() => {
    if (!fullLatex || !autoCompile) return;
    const timer = setTimeout(() => setCompiledLatex(deferredContent), 800);
    return () => clearTimeout(timer);
  }, [deferredContent, fullLatex, autoCompile]);

  // Flush pending changes when navigating away mid-debounce.
  useEffect(
    () => () => {
      const saved = savedRef.current;
      const latest = latestRef.current;
      if (
        saved &&
        (saved.title !== latest.title ||
          saved.content !== latest.content ||
          saved.folderId !== latest.folderId ||
          saved.noteType !== latest.noteType)
      ) {
        doSaveRef.current();
      }
    },
    []
  );

  // "Export PDF": render the print-only portal, then open the print dialog.
  // Full-LaTeX documents print their compiled iframe directly (printLatex).
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      window.removeEventListener("afterprint", done);
      cancelAnimationFrame(frame);
    };
  }, [printing]);

  const deleteNote = async () => {
    if (noteIdRef.current) {
      const supabase = createClient();
      await supabase.from("notes").delete().eq("id", noteIdRef.current);
    }
    savedRef.current = { title, content, folderId, noteType }; // don't resave on unmount
    router.push("/notes");
  };

  // Delete any note straight from the switcher sidebar.
  const deleteFromSidebar = async (id: string) => {
    if (id === noteIdRef.current) {
      await deleteNote();
      return;
    }
    const supabase = createClient();
    await supabase.from("notes").delete().eq("id", id);
    setNotesList((prev) => prev.filter((n) => n.id !== id));
  };

  // ── Toolbar helpers ────────────────────────────────────────────────
  const updateContent = (next: string, selStart: number, selEnd: number) => {
    setContent(next);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  const wrapSelection = (before: string, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    updateContent(
      value.slice(0, s) + before + sel + after + value.slice(e),
      s + before.length,
      s + before.length + sel.length
    );
  };

  const prefixLine = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    updateContent(
      value.slice(0, lineStart) + prefix + value.slice(lineStart),
      s + prefix.length,
      s + prefix.length
    );
  };

  const insertBlock = (block: string, cursorOffset: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const needsLead = s > 0 && value[s - 1] !== "\n" ? "\n" : "";
    const inserted = `${needsLead}${block}`;
    updateContent(value.slice(0, s) + inserted + value.slice(s), s + needsLead.length + cursorOffset, s + needsLead.length + cursorOffset);
  };

  const handleEditorKeys = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === "b") {
      e.preventDefault();
      wrapSelection("**");
    } else if (e.key === "i") {
      e.preventDefault();
      wrapSelection("*");
    }
  };

  // Choose-type-first flow: the picker selects the template, then the editor
  // opens with the title focused.
  const applyTemplate = (body: string, type: NoteType) => {
    setContent(body);
    setCompiledLatex(body);
    setNoteType(type);
    setShowTemplates(false);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  };

  // "Download PDF" for LaTeX: print the compiled iframe itself so the output
  // contains only the typeset document (Overleaf-style).
  const handleLatexIframe = (iframe: HTMLIFrameElement) => {
    latexIframeRef.current = iframe;
    if (pendingLatexPrintRef.current) {
      pendingLatexPrintRef.current = false;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
  };

  const printLatex = () => {
    const win = latexIframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
      return;
    }
    // Preview not mounted (editor-only mode): open split, print once compiled.
    pendingLatexPrintRef.current = true;
    setMode("split");
  };

  // Overleaf-style "go to line" from the LaTeX error banner.
  const jumpToSourceLine = (line: number) => {
    if (mode === "preview") setMode("split");
    setTimeout(() => {
      if (latexViewRef.current) {
        jumpEditorToLine(latexViewRef.current, line);
        return;
      }
      const ta = textareaRef.current;
      if (!ta) return;
      const lines = ta.value.split("\n");
      const start = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0);
      ta.focus();
      ta.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    }, 60);
  };

  // Overleaf-style resizable split: drag the divider; dragging all the way
  // to either edge snaps into editor-only / preview-only mode.
  const startDividerDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    const move = (ev: PointerEvent) => {
      ev.preventDefault();
      const ratio = (ev.clientX - rect.left) / rect.width;
      if (ratio < 0.1) {
        setMode("preview");
        setSplitRatio(0.5);
        stop();
      } else if (ratio > 0.9) {
        setMode("editor");
        setSplitRatio(0.5);
        stop();
      } else {
        setSplitRatio(Math.min(0.8, Math.max(0.2, ratio)));
      }
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", stop);
  };

  const jumpToHeading = (headingId: string) => {
    setOutlineOpen(false);
    if (mode === "editor") setMode("split");
    requestAnimationFrame(() =>
      document.getElementById(headingId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  const statusLabel =
    status === "saving" ? t("common.saving")
    : status === "saved" ? t("notes.saved")
    : status === "dirty" ? t("notes.unsaved")
    : status === "error" ? t("notes.saveError")
    : "";

  const wordCount = useMemo(() => {
    const source = slidesDoc
      ? presentableContent
      : docDoc
      ? docToPlainText(docDoc)
      : sheetDoc
      ? getNotePreviewText({ content: deferredContent })
      : deferredContent;
    return source.trim().split(/\s+/).filter(Boolean).length;
  }, [deferredContent, slidesDoc, presentableContent, docDoc, sheetDoc]);

  const toolbarButton =
    "flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

  const modeOptions: { id: ViewMode; icon: typeof PencilLine; label: string }[] = [
    { id: "editor", icon: PencilLine, label: t("notes.viewEditor") },
    { id: "split", icon: Columns2, label: t("notes.viewSplit") },
    { id: "preview", icon: Eye, label: t("notes.preview") },
  ];

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="h-10 w-1/2 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  // ── Choose-type-first: pick a note type before entering the editor ──
  if (showTemplates) {
    // 3-2 layout: XLSX/DOCX/PPTX on top, Quick Note & LaTeX staggered below.
    const templates = [
      { icon: Table, color: "text-emerald-600 dark:text-emerald-400", label: t("notes.kindXlsx"), desc: t("notes.tplXlsxDesc"), body: serializeSheetDoc(emptySheetDoc()), type: "document" as NoteType, place: "" },
      { icon: FileText, color: "text-blue-600 dark:text-blue-400", label: t("notes.kindDocx"), desc: t("notes.tplDocxDesc"), body: serializeDocDoc(emptyDocDoc()), type: "document" as NoteType, place: "" },
      { icon: Presentation, color: "text-orange-600 dark:text-orange-400", label: t("notes.kindPptx"), desc: t("notes.tplPptxDesc"), body: serializeSlidesDoc(slidesFromMarkdown(t("notes.tplSlidesBody"))), type: "document" as NoteType, place: "" },
      { icon: StickyNote, color: "text-slate-500 dark:text-slate-400", label: t("notes.tplQuick"), desc: t("notes.tplQuickDesc"), body: "", type: "simple" as NoteType, place: "sm:col-start-2" },
      { icon: FileCode2, color: "text-teal-600 dark:text-teal-400", label: t("notes.kindLatex"), desc: t("notes.tplLatexDesc"), body: t("notes.tplLatexBody"), type: "document" as NoteType, place: "" },
    ];
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex shrink-0 items-center px-3 py-2 sm:px-4">
          <IconButton icon={ArrowLeft} label={t("notes.backToNotes")} onClick={() => router.push("/notes")} />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            <h2 className="mb-1 text-center text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("notes.templateTitle")}
            </h2>
            <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("notes.templateSubtitle")}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              {templates.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => applyTemplate(tpl.body, tpl.type)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500 sm:col-span-2",
                    tpl.place
                  )}
                >
                  <tpl.icon className={cn("h-6 w-6", tpl.color)} />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tpl.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{tpl.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
        <IconButton icon={ArrowLeft} label={t("notes.backToNotes")} onClick={() => router.push("/notes")} />
        <IconButton
          icon={PanelLeft}
          label={t("notes.toggleNoteList")}
          onClick={toggleSidebar}
          className={cn("hidden sm:inline-flex", sidebarOpen && "bg-slate-100 dark:bg-slate-800")}
        />
        <input
          ref={titleInputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("notes.titlePlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 sm:text-lg"
        />
        <span
          className={cn(
            "hidden whitespace-nowrap text-xs sm:block",
            status === "error" ? "text-red-500" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {statusLabel}
        </span>
        <Select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="hidden w-36 md:block"
        >
          <option value="">{t("notes.uncategorized")}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>
        <IconButton
          icon={Save}
          label={`${t("common.save")} (⌘S)`}
          onClick={() => doSaveRef.current()}
          disabled={status !== "dirty" && status !== "error"}
          className="disabled:opacity-40"
        />
        {noteType === "document" && !docDoc && !sheetDoc && (
          <IconButton
            icon={Presentation}
            label={t("notes.present")}
            onClick={() => setPresenting(true)}
            disabled={!content.trim()}
            className="disabled:opacity-40"
          />
        )}
        <IconButton
          icon={FileDown}
          label={t("notes.exportPdf")}
          onClick={() => (fullLatex ? printLatex() : setPrinting(true))}
          disabled={!content.trim()}
          className="disabled:opacity-40"
        />
        <IconButton
          icon={Trash2}
          label={t("common.delete")}
          onClick={deleteNote}
          className="text-red-400 hover:text-red-500 dark:hover:text-red-300"
        />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Note switcher ──────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="hidden w-60 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 sm:flex">
            <div className="flex shrink-0 items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t("notes.title")}
              </span>
              <span className="flex items-center gap-0.5">
                <IconButton
                  icon={Plus}
                  label={t("notes.newNote")}
                  onClick={() => router.push("/notes/new")}
                  className="h-6 w-6"
                />
                <IconButton
                  icon={PanelLeftClose}
                  label={t("notes.toggleNoteList")}
                  onClick={toggleSidebar}
                  className="h-6 w-6"
                />
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {notesList.map((n) => {
                const active = n.id === currentId;
                return (
                  <div key={n.id} className="group/item relative">
                    <button
                      onClick={() => { if (!active) router.push(`/notes/${n.id}`); }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-7 text-left text-xs transition-colors",
                        active
                          ? "bg-white font-medium text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
                      )}
                    >
                      <NoteKindGlyph note={n} />
                      <span className="truncate">{n.title || t("notes.untitled")}</span>
                      {n.is_pinned && <Pin className="ml-auto h-3 w-3 shrink-0 text-amber-500" />}
                    </button>
                    <button
                      onClick={() => deleteFromSidebar(n.id)}
                      aria-label={`${t("common.delete")}: ${n.title || t("notes.untitled")}`}
                      className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-red-500 group-hover/item:block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {notesList.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  {t("notes.emptyTitle")}
                </p>
              )}
            </div>
          </aside>
        )}

        {/* ── Panes ──────────────────────────────────────────────────── */}
        <div ref={splitContainerRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col sm:flex-row">
        {slidesDoc && (
          <SlidesEditor value={slidesDoc} onChange={(doc) => setContent(serializeSlidesDoc(doc))} />
        )}
        {docDoc && (
          <DocEditor value={docDoc} onChange={(doc) => setContent(serializeDocDoc(doc))} />
        )}
        {sheetDoc && (
          <SheetEditor value={sheetDoc} onChange={(doc) => setContent(serializeSheetDoc(doc))} />
        )}
        {!structured && (noteType === "simple" || mode !== "preview") && (
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            style={
              noteType === "document" && mode === "split"
                ? { flexBasis: `${splitRatio * 100}%`, flexGrow: 0, flexShrink: 0 }
                : undefined
            }
          >
            {fullLatex ? (
              // Overleaf-style source editor: line numbers + TeX highlighting.
              <LatexSourceEditor
                value={content}
                onChange={setContent}
                onViewReady={(view) => { latexViewRef.current = view; }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => { setContent(e.target.value); setShowTemplates(false); }}
                onKeyDown={handleEditorKeys}
                placeholder={t("notes.contentPlaceholder")}
                spellCheck={false}
                className={cn(
                  "min-h-0 flex-1 resize-none bg-white p-4 leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 dark:bg-slate-950 dark:text-slate-200 sm:p-5",
                  noteType === "document" ? "font-mono text-[13px]" : "text-[15px] sm:px-8"
                )}
              />
            )}
          </div>
        )}
        {!structured && noteType === "document" && mode === "split" && (
          <div
            role="separator"
            aria-orientation="vertical"
            title={t("notes.dragToResize")}
            onPointerDown={startDividerDrag}
            onDoubleClick={() => setSplitRatio(0.5)}
            className="group relative z-10 hidden w-2 shrink-0 cursor-col-resize select-none items-center justify-center border-x border-slate-300 bg-slate-200 transition-colors hover:border-blue-500 hover:bg-blue-400 active:bg-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-600 sm:flex"
          >
            {/* wider invisible hit area */}
            <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
            {/* grip dots */}
            <span className="pointer-events-none relative flex flex-col gap-1">
              <span className="h-1 w-1 rounded-full bg-slate-500 group-hover:bg-white dark:bg-slate-400" />
              <span className="h-1 w-1 rounded-full bg-slate-500 group-hover:bg-white dark:bg-slate-400" />
              <span className="h-1 w-1 rounded-full bg-slate-500 group-hover:bg-white dark:bg-slate-400" />
            </span>
          </div>
        )}
        {!structured && noteType === "document" && mode !== "editor" && (
          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 border-t border-slate-200 dark:border-slate-800 sm:border-t-0",
              fullLatex
                ? "flex flex-col overflow-hidden bg-slate-400/30 dark:bg-slate-950"
                : "overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-900/40 sm:p-6"
            )}
          >
            {!deferredContent.trim() ? (
              <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">{t("notes.noContent")}</p>
            ) : fullLatex ? (
              <>
                {/* Overleaf-style toolbar: Recompile + download on the left */}
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-300/60 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    onClick={() => setCompiledLatex(content)}
                    className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    <Play className="h-3 w-3" />
                    {t("notes.compile")}
                  </button>
                  <IconButton
                    icon={FileDown}
                    label={t("notes.exportPdf")}
                    onClick={printLatex}
                    className="h-7 w-7"
                  />
                  <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={autoCompile}
                      onChange={toggleAutoCompile}
                      className="h-3.5 w-3.5 accent-green-600"
                    />
                    {t("notes.autoCompile")}
                  </label>
                </div>
                {compiledLatex.trim() ? (
                  <LatexFull
                    content={compiledLatex}
                    onJumpToLine={jumpToSourceLine}
                    onIframeReady={handleLatexIframe}
                    className="min-h-0 flex-1 p-3 sm:p-5"
                  />
                ) : (
                  <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">{t("notes.pressCompile")}</p>
                )}
              </>
            ) : (
              <NoteDocument content={deferredContent} className="mx-auto max-w-2xl" />
            )}
          </div>
        )}

        </div>
      </div>

      {/* ── Footer: toolbar + view switcher ────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900 sm:px-4">
        {slidesDoc ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {t("notes.slideCount").replace("{n}", String(slidesDoc.slides.length))}
          </span>
        ) : sheetDoc ? (
          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {sheetDoc.rows.length} × {sheetColName((sheetDoc.rows[0]?.length ?? 1) - 1)}
          </span>
        ) : docDoc ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">{t("notes.kindDocx")}</span>
        ) : noteType === "simple" ? (
          <button
            onClick={() => setNoteType("document")}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <FileText className="h-3.5 w-3.5" />
            {t("notes.toDocument")}
          </button>
        ) : fullLatex ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">{t("notes.kindLatex")}</span>
        ) : (
        <>
        <button title={`${t("notes.tbBold")} (⌘B)`} onClick={() => wrapSelection("**")} className={toolbarButton}><Bold className="h-3.5 w-3.5" /></button>
        <button title={`${t("notes.tbItalic")} (⌘I)`} onClick={() => wrapSelection("*")} className={toolbarButton}><Italic className="h-3.5 w-3.5" /></button>
        <button title={t("notes.tbHeading1")} onClick={() => prefixLine("# ")} className={toolbarButton}><Heading1 className="h-3.5 w-3.5" /></button>
        <button title={t("notes.tbHeading2")} onClick={() => prefixLine("## ")} className={toolbarButton}><Heading2 className="h-3.5 w-3.5" /></button>
        <button title={t("notes.tbList")} onClick={() => prefixLine("- ")} className={toolbarButton}><List className="h-3.5 w-3.5" /></button>
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <button title={t("notes.tbInlineMath")} onClick={() => wrapSelection("$")} className={toolbarButton}><Radical className="h-3.5 w-3.5" /></button>
        <button title={t("notes.tbBlockMath")} onClick={() => insertBlock("$$\n\n$$\n", 3)} className={toolbarButton}><Sigma className="h-3.5 w-3.5" /></button>
        <button title={t("notes.tbSlideBreak")} onClick={() => insertBlock("\n---\n\n", 5)} className={toolbarButton}><SquareSplitVertical className="h-3.5 w-3.5" /></button>
        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Outline */}
        <div className="relative">
          <button
            title={t("notes.outline")}
            onClick={() => setOutlineOpen((o) => !o)}
            disabled={outline.length === 0}
            className={cn(toolbarButton, "disabled:opacity-40", outlineOpen && "bg-slate-100 dark:bg-slate-800")}
          >
            <ListTree className="h-3.5 w-3.5" />
          </button>
          {outlineOpen && outline.length > 0 && (
            <div className="absolute bottom-9 left-0 z-20 max-h-64 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {outline.map((item) => (
                <button
                  key={item.id}
                  onClick={() => jumpToHeading(item.id)}
                  className="block w-full truncate px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        <span className="ml-auto hidden text-xs text-slate-400 md:block dark:text-slate-500">
          {noteType === "document" && !fullLatex && !structured && <>{t("notes.latexHint")} · </>}
          {t("notes.wordCount").replace("{n}", String(wordCount))}
        </span>

        {/* Office-style autosave toggle */}
        <label className="ml-2 flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
          <input
            type="checkbox"
            checked={autosaveOn}
            onChange={toggleAutosave}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          {t("notes.autosave")}
        </label>

        {noteType === "document" && !structured && (
          <>
            <IconButton
              icon={StickyNote}
              label={t("notes.toSimple")}
              onClick={() => setNoteType("simple")}
              className="ml-2 h-7 w-7"
            />
            {/* View switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800 sm:ml-1">
              {modeOptions.map((opt) => (
                <button
                  key={opt.id}
                  title={opt.label}
                  onClick={() => setMode(opt.id)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    mode === opt.id
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {presenting && (
        <NotePresent
          title={title || t("notes.untitled")}
          content={presentableContent}
          onClose={() => setPresenting(false)}
        />
      )}

      {printing &&
        createPortal(
          <div className="note-print-root">
            {slidesDoc ? (
              // One 16:9 page per slide.
              <div>
                {slidesDoc.slides.map((s) => (
                  <div
                    key={s.id}
                    style={{ pageBreakAfter: "always" }}
                    className="mb-8 flex aspect-video w-full flex-col rounded-lg border border-slate-300 p-12"
                  >
                    {s.layout === "title" ? (
                      <div className="my-auto text-center">
                        <h2 className="text-4xl font-bold text-slate-900">{s.title}</h2>
                        <p className="mt-4 whitespace-pre-wrap text-lg text-slate-500">{s.body}</p>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-3xl font-semibold text-slate-900">{s.title}</h2>
                        <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed text-slate-700">{s.body}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : docDoc ? (
              <div>
                <h1 className="mb-6 text-3xl font-bold text-slate-900">{title || t("notes.untitled")}</h1>
                <div className="nexus-doc-body" dangerouslySetInnerHTML={{ __html: docDoc.html }} />
              </div>
            ) : sheetDoc ? (
              <div>
                <h1 className="mb-6 text-3xl font-bold text-slate-900">{title || t("notes.untitled")}</h1>
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {sheetDoc.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c} className="border border-slate-300 px-2 py-1">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // LaTeX prints via its own compiled iframe (printLatex), never here.
              <>
                <h1 className="mb-6 text-3xl font-bold text-slate-900">{title || t("notes.untitled")}</h1>
                {noteType === "document" ? (
                  <NoteDocument content={content} />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{content}</div>
                )}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
