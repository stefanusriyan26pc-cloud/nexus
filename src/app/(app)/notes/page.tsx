"use client";

import { Header } from "@/components/layout/header";
import { useProfile } from "@/components/layout/profile-provider";
import { NoteGrid } from "@/components/notes/note-grid";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ViewToggle } from "@/components/ui/view-toggle";
import { useTranslation } from "@/components/providers/i18n-provider";
import { sortNotes } from "@/lib/notes/sort-notes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/database";
import {
  BookOpen, Briefcase, ChevronRight, FolderOpen, GraduationCap,
  LayoutGrid, Lightbulb, List, NotebookPen, Plane, Plus,
  Search, Trash2, Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "grid" | "list" | "folders";

const NOTE_CATEGORIES = [
  { id: "Personal",  label: "Personal",  icon: BookOpen,       color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30"    },
  { id: "Work",      label: "Work",      icon: Briefcase,      color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  { id: "Learning",  label: "Learning",  icon: GraduationCap,  color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { id: "Ideas",     label: "Ideas",     icon: Lightbulb,      color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30"   },
  { id: "Finance",   label: "Finance",   icon: Wallet,         color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/30"     },
  { id: "Travel",    label: "Travel",    icon: Plane,          color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30"     },
] as const;

type CategoryId = typeof NOTE_CATEGORIES[number]["id"] | "";

export default function NotesPage() {
  const profile = useProfile();
  const { t } = useTranslation();
  const [notes, setNotes]             = useState<Note[]>([]);
  const [view, setView]               = useState<View>("grid");
  const [search, setSearch]           = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("");
  const [selected, setSelected]       = useState<Note | null>(null);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [title, setTitle]             = useState("");
  const [content, setContent]         = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [saving, setSaving]           = useState(false);

  const loadNotes = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notes")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setNotes(sortNotes(data ?? []));
    setLoading(false);
  };

  useEffect(() => { loadNotes(); }, []);

  const filtered = useMemo(() => {
    let result = notes;
    if (activeCategory) result = result.filter((n) => (n.category ?? "") === activeCategory);
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    return result;
  }, [notes, search, activeCategory]);

  // Category stats
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const note of notes) {
      const cat = note.category || "";
      map[cat] = (map[cat] ?? 0) + 1;
    }
    return map;
  }, [notes]);

  const openCreate = () => {
    setSelected(null);
    setTitle("");
    setContent("");
    setFormCategory(activeCategory || "");
    setModalOpen(true);
  };

  const openEdit = (note: Note) => {
    setSelected(note);
    setTitle(note.title);
    setContent(note.content);
    setFormCategory(note.category ?? "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (selected) {
      const { data } = await supabase
        .from("notes")
        .update({ title: title || "Untitled", content, category: formCategory })
        .eq("id", selected.id)
        .select()
        .single();
      if (data) setNotes(sortNotes(notes.map((n) => (n.id === data.id ? data : n))));
    } else {
      const { data } = await supabase
        .from("notes")
        .insert({ user_id: user!.id, title: title || "Untitled", content, category: formCategory })
        .select()
        .single();
      if (data) setNotes(sortNotes([data, ...notes]));
    }
    setSaving(false);
    setModalOpen(false);
  };

  const togglePin = async (note: Note) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notes")
      .update({ is_pinned: !note.is_pinned })
      .eq("id", note.id)
      .select()
      .single();
    if (data) setNotes(sortNotes(notes.map((n) => (n.id === data.id ? data : n))));
  };

  const deleteNote = async (id: string) => {
    const supabase = createClient();
    await supabase.from("notes").delete().eq("id", id);
    setNotes(notes.filter((n) => n.id !== id));
    setModalOpen(false);
  };

  const viewInFolder = view !== "folders" || activeCategory !== "";

  return (
    <>
      <Header title={t("notes.title")} subtitle={t("notes.subtitle")} profile={profile}>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          {t("notes.newNote")}
        </Button>
      </Header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ViewToggle
              views={[
                { id: "grid" as View,    label: t("notes.gridView"),   icon: LayoutGrid },
                { id: "list" as View,    label: t("notes.listView"),   icon: List },
                { id: "folders" as View, label: t("notes.folderView"), icon: FolderOpen },
              ]}
              active={view}
              onChange={(v) => { setView(v as View); setActiveCategory(""); }}
            />
            {/* Active category breadcrumb */}
            {activeCategory && (
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <ChevronRight className="h-4 w-4" />
                <button
                  onClick={() => setActiveCategory("")}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t("notes.backToFolders")}
                </button>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-800 dark:text-slate-200">{activeCategory}</span>
              </div>
            )}
          </div>
          {viewInFolder && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t("notes.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : view === "folders" && !activeCategory ? (
          /* ── Folder view ─────────────────────────────────────────── */
          <div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {NOTE_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] ?? 0;
                const CatIcon = cat.icon;
                const preview = notes.find((n) => (n.category ?? "") === cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", cat.bg)}>
                      <CatIcon className={cn("h-6 w-6", cat.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{cat.label}</p>
                        <span className="text-xs font-medium text-slate-400">{count} {t("notes.notesCount")}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {preview ? preview.title : "—"}
                      </p>
                    </div>
                  </button>
                );
              })}
              {/* Uncategorized folder */}
              {(categoryCounts[""] ?? 0) > 0 && (
                <button
                  onClick={() => setActiveCategory("")}
                  className="group flex items-start gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                    <NotebookPen className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{t("notes.uncategorized")}</p>
                      <span className="text-xs font-medium text-slate-400">{categoryCounts[""] ?? 0} {t("notes.notesCount")}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{t("notes.allNotes")}</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title={t("notes.emptyTitle")}
            description={t("notes.emptyDesc")}
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />{t("notes.createNote")}</Button>}
          />
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">{t("common.noData")}</p>
        ) : view === "grid" || (view === "folders" && activeCategory) ? (
          <NoteGrid notes={filtered} onEdit={openEdit} onTogglePin={togglePin} />
        ) : (
          <NoteList notes={filtered} onEdit={openEdit} onTogglePin={togglePin} onDelete={deleteNote} />
        )}
      </main>

      {/* ── Note Modal ─────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? t("notes.editNote") : t("notes.newNote")}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="border-0 px-0 text-lg font-semibold focus:ring-0"
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("notes.categoryLabel")}</label>
            <Select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
              <option value="">{t("notes.uncategorized")}</option>
              {NOTE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            rows={12}
            className="resize-none border-0 px-0 focus:ring-0"
          />
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            {selected ? (
              <Button variant="danger" size="sm" onClick={() => deleteNote(selected.id)}>
                <Trash2 className="h-4 w-4" /> {t("common.delete")}
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
