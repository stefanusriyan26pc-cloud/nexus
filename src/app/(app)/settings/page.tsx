"use client";

import { Header } from "@/components/layout/header";
import { useProfile } from "@/components/layout/profile-provider";
import { useTranslation } from "@/components/providers/i18n-provider";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useLocalePreference } from "@/hooks/use-locale-preference";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { ensureDefaultCategories } from "@/lib/finance/categories";
import { type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NoteFolder, TransactionCategory, UserBank } from "@/types/database";
import { IconButton } from "@/components/ui/icon-button";
import {
  Bell, Globe, Loader2, Moon, RefreshCw, Shield,
  User, CheckCircle2, ArrowRightLeft, ChevronRight,
  Landmark, Plus, Trash2, Pencil, Check, X, Tags, FolderOpen,
} from "lucide-react";
import { useEffect, useState } from "react";

const NOTIF_KEY = "nexus_notifications";

const FOLDER_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#64748b", "#78716c", "#d97706", "#be185d",
];

type SectionId = "regional" | "notifications" | "appearance" | "banks" | "categories" | "security";

const NAV_ITEMS: { id: SectionId; icon: React.ElementType; labelKey: string; subtitleKey: string; color: string }[] = [
  { id: "regional",      icon: Globe,   labelKey: "settings.regional",      subtitleKey: "settings.regionalSub",      color: "indigo" },
  { id: "notifications", icon: Bell,    labelKey: "settings.notifications",  subtitleKey: "settings.notificationsSub", color: "amber"  },
  { id: "appearance",    icon: Moon,    labelKey: "theme.title",             subtitleKey: "settings.appearanceSub",    color: "cyan" },
  { id: "banks",         icon: Landmark, labelKey: "settings.banks",         subtitleKey: "settings.banksSub",         color: "emerald" },
  { id: "categories",    icon: Tags,    labelKey: "settings.categories",     subtitleKey: "settings.categoriesSub",    color: "violet" },
  { id: "security",      icon: Shield,  labelKey: "settings.security",       subtitleKey: "settings.securitySub",      color: "red"    },
];

const COLOR_MAP: Record<string, { icon: string; bg: string; activeBg: string; activeFg: string }> = {
  indigo: { icon: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", activeBg: "bg-blue-50 dark:bg-blue-900/20", activeFg: "text-blue-700 dark:text-blue-300" },
  amber:  { icon: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/30",   activeBg: "bg-amber-50 dark:bg-amber-900/20",   activeFg: "text-amber-700 dark:text-amber-300"   },
  cyan: { icon: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/30", activeBg: "bg-cyan-50 dark:bg-cyan-900/20", activeFg: "text-cyan-700 dark:text-cyan-300" },
  emerald: { icon: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", activeBg: "bg-emerald-50 dark:bg-emerald-900/20", activeFg: "text-emerald-700 dark:text-emerald-300" },
  violet: { icon: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/30", activeBg: "bg-violet-50 dark:bg-violet-900/20", activeFg: "text-violet-700 dark:text-violet-300" },
  red:    { icon: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/30",       activeBg: "bg-red-50 dark:bg-red-900/20",       activeFg: "text-red-700 dark:text-red-300"       },
};

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
        )}
      >
        <span className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, color = "indigo" }: {
  icon: React.ElementType; title: string; subtitle?: string; color?: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", c.bg, c.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const profile = useProfile();
  const { t } = useTranslation();
  const { locale, changeLocale } = useLocalePreference();
  const { currency, changeCurrency } = useCurrencyPreference();
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [fetchingRates, setFetchingRates] = useState(false);
  const [ratesDate, setRatesDate] = useState<string | null>(null);
  const [notifs, setNotifs] = useState({ tasks: true, savings: true, finance: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("regional");
  const [banks, setBanks] = useState<UserBank[]>([]);
  const [newBankName, setNewBankName] = useState("");
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBankName, setEditingBankName] = useState("");

  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [editingFolderColor, setEditingFolderColor] = useState(FOLDER_COLORS[0]);

  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(NOTIF_KEY);
    if (saved) setNotifs(JSON.parse(saved));
    async function loadAll() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await ensureDefaultCategories(supabase, user.id);
      const [bankRes, folderRes, catRes] = await Promise.all([
        supabase.from("user_banks").select("*").order("position"),
        supabase.from("note_folders").select("*").order("position"),
        supabase.from("transaction_categories").select("*").order("position"),
      ]);
      setBanks(bankRes.data ?? []);
      setFolders(folderRes.data ?? []);
      setCategories(catRes.data ?? []);
    }
    loadAll();
  }, []);

  const addBank = async () => {
    const name = newBankName.trim();
    if (!name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("user_banks")
      .insert({ user_id: user!.id, name, position: banks.length })
      .select()
      .single();
    if (data) setBanks([...banks, data]);
    setNewBankName("");
  };

  const startEditBank = (bank: UserBank) => {
    setEditingBankId(bank.id);
    setEditingBankName(bank.name);
  };

  const saveEditBank = async () => {
    if (!editingBankId || !editingBankName.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("user_banks")
      .update({ name: editingBankName.trim() })
      .eq("id", editingBankId)
      .select()
      .single();
    if (data) setBanks(banks.map((b) => (b.id === data.id ? data : b)));
    setEditingBankId(null);
    setEditingBankName("");
  };

  const deleteBank = async (id: string) => {
    const supabase = createClient();
    await supabase.from("user_banks").delete().eq("id", id);
    setBanks(banks.filter((b) => b.id !== id));
  };

  const addFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("note_folders")
      .insert({ user_id: user!.id, name, color: newFolderColor, position: folders.length })
      .select()
      .single();
    if (data) setFolders([...folders, data]);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
  };

  const startEditFolder = (folder: NoteFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setEditingFolderColor(folder.color);
  };

  const saveEditFolder = async () => {
    if (!editingFolderId || !editingFolderName.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("note_folders")
      .update({ name: editingFolderName.trim(), color: editingFolderColor })
      .eq("id", editingFolderId)
      .select()
      .single();
    if (data) setFolders(folders.map((f) => (f.id === data.id ? data : f)));
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const deleteFolder = async (folder: NoteFolder) => {
    if (!confirm(`Delete folder "${folder.name}"? Notes inside will move to Uncategorized.`)) return;
    const supabase = createClient();
    await supabase.from("note_folders").delete().eq("id", folder.id);
    setFolders(folders.filter((f) => f.id !== folder.id));
  };

  const addCategory = async (type: "income" | "expense") => {
    const name = (type === "income" ? newIncomeCat : newExpenseCat).trim();
    if (!name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const position = categories.filter((c) => c.type === type).length;
    const { data } = await supabase
      .from("transaction_categories")
      .insert({ user_id: user!.id, type, name, position })
      .select()
      .single();
    if (data) setCategories([...categories, data]);
    if (type === "income") setNewIncomeCat(""); else setNewExpenseCat("");
  };

  const startEditCategory = (cat: TransactionCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const saveEditCategory = async () => {
    if (!editingCatId || !editingCatName.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("transaction_categories")
      .update({ name: editingCatName.trim() })
      .eq("id", editingCatId)
      .select()
      .single();
    if (data) setCategories(categories.map((c) => (c.id === data.id ? data : c)));
    setEditingCatId(null);
    setEditingCatName("");
  };

  const deleteCategory = async (id: string) => {
    const supabase = createClient();
    await supabase.from("transaction_categories").delete().eq("id", id);
    setCategories(categories.filter((c) => c.id !== id));
  };

  const saveNotif = (next: typeof notifs) => {
    setNotifs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  };

  const fetchRates = async () => {
    setFetchingRates(true);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/IDR");
      const json = await res.json();
      if (json.rates) {
        setExchangeRates(json.rates);
        setRatesDate(new Date().toLocaleTimeString());
      }
    } catch { /* ignore */ }
    finally { setFetchingRates(false); }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    setPwLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    });
    setPwMsg(error ? "Failed to send reset email." : `Reset link sent to ${profile.email}`);
    setPwLoading(false);
  };

  const rateToIDR = (code: string): string | null => {
    if (code === "IDR") return null;
    const r = exchangeRates[code];
    if (!r) return null;
    return `Rp ${Math.round(1 / r).toLocaleString("id-ID")}`;
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <Header title={t("settings.title")} subtitle={t("settings.subtitle")} profile={profile} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sub-sidebar ── */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:flex">
          {/* Profile card */}
          <div className="border-b border-slate-100 dark:border-slate-800 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white shadow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{profile?.full_name ?? "—"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Preferences
            </p>
            {NAV_ITEMS.map(({ id, icon: Icon, labelKey, subtitleKey, color }) => {
              const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                    isActive
                      ? cn(c.activeBg, "ring-1 ring-slate-200 dark:ring-slate-700")
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    isActive ? cn(c.bg, c.icon) : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", isActive ? "text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-300")}>
                      {t(labelKey)}
                    </p>
                    <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{t(subtitleKey)}</p>
                  </div>
                  {isActive && <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", c.icon)} />}
                </button>
              );
            })}
          </nav>

          {/* Version footer */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Nexus · Settings</p>
          </div>
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/30">
          <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">

            {/* Mobile nav pills */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-1 md:hidden">
              {NAV_ITEMS.map(({ id, icon: Icon, labelKey, color }) => {
                const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? cn(c.bg, c.icon, "ring-1 ring-slate-200 dark:ring-slate-700")
                        : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>

            {/* ── Regional ── */}
            {activeSection === "regional" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-5">
                  <SectionTitle icon={Globe} title={t("settings.regional")} subtitle="Language and currency" color="indigo" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("settings.currencyLabel")}</label>
                      <Select value={currency} onChange={(e) => changeCurrency(e.target.value)}>
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t("language.title")}</label>
                      <Select value={locale} onChange={(e) => changeLocale(e.target.value as Locale)}>
                        <option value="en">{t("language.en")}</option>
                        <option value="id">{t("language.id")}</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Live exchange rates */}
                <div className="bg-slate-50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Live Exchange Rates</span>
                      {ratesDate && <span className="text-xs text-slate-400">· {ratesDate}</span>}
                    </div>
                    <button
                      onClick={fetchRates}
                      disabled={fetchingRates}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
                    >
                      {fetchingRates
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />}
                      Refresh
                    </button>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                    {SUPPORTED_CURRENCIES.filter((c) => c.code !== "IDR").map((c) => {
                      const rate = rateToIDR(c.code);
                      return (
                        <div key={c.code} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-xs font-bold text-slate-700 dark:text-slate-300">{c.code}</span>
                            <span className="text-xs text-slate-400">{c.symbol}</span>
                          </div>
                          <span className={cn("text-xs font-medium tabular-nums", rate ? "text-slate-700 dark:text-slate-200" : "text-slate-300 dark:text-slate-600")}>
                            {rate ?? "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-2.5">
                    <p className="text-[11px] text-slate-400">Mid-market rates · same reference as Wise.com · open.er-api.com</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Notifications ── */}
            {activeSection === "notifications" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
                <div className="px-6 pt-5 pb-1">
                  <SectionTitle icon={Bell} title={t("settings.notifications")} subtitle="Alert preferences" color="amber" />
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 px-6">
                  <Toggle
                    checked={notifs.tasks}
                    onChange={(v) => saveNotif({ ...notifs, tasks: v })}
                    label="Task due reminders"
                    description="Get notified before tasks are due"
                  />
                  <Toggle
                    checked={notifs.savings}
                    onChange={(v) => saveNotif({ ...notifs, savings: v })}
                    label="Savings milestones"
                    description="Celebrate when you hit a goal milestone"
                  />
                  <Toggle
                    checked={notifs.finance}
                    onChange={(v) => saveNotif({ ...notifs, finance: v })}
                    label="Monthly finance summary"
                    description="Monthly spending recap on the 1st"
                  />
                </div>
                <div className="mx-6 my-4 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Preferences are saved locally and activate when browser notifications are enabled.
                  </p>
                </div>
              </div>
            )}

            {/* ── Appearance ── */}
            {activeSection === "appearance" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-6 py-5">
                <SectionTitle icon={Moon} title={t("theme.title")} subtitle={t("theme.description")} color="cyan" />
                <ThemeToggle />
              </div>
            )}

            {/* ── Banks ── */}
            {activeSection === "banks" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-6 py-5">
                <SectionTitle icon={Landmark} title={t("settings.banks")} subtitle={t("settings.banksSub")} color="emerald" />
                <div className="flex gap-2">
                  <Input
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g. BCA, Mandiri, GoPay"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBank(); } }}
                  />
                  <Button onClick={addBank} disabled={!newBankName.trim()}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                {banks.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">No banks yet — add one above so it shows up in the wallet form.</p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {banks.map((bank) => (
                      <div key={bank.id} className="flex items-center justify-between py-2.5">
                        {editingBankId === bank.id ? (
                          <Input
                            value={editingBankName}
                            onChange={(e) => setEditingBankName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEditBank(); } }}
                            autoFocus
                            className="max-w-xs"
                          />
                        ) : (
                          <span className="text-sm text-slate-700 dark:text-slate-300">{bank.name}</span>
                        )}
                        <div className="flex items-center gap-1">
                          {editingBankId === bank.id ? (
                            <>
                              <IconButton icon={Check} label="Save" onClick={saveEditBank} />
                              <IconButton icon={X} label="Cancel" onClick={() => setEditingBankId(null)} />
                            </>
                          ) : (
                            <>
                              <IconButton icon={Pencil} label={t("common.edit")} onClick={() => startEditBank(bank)} />
                              <IconButton icon={Trash2} label={t("common.delete")} onClick={() => deleteBank(bank.id)} className="text-red-400 hover:text-red-500" />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Categories ── */}
            {activeSection === "categories" && (
              <div className="space-y-6">
                {/* Note folders */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-6 py-5">
                  <SectionTitle icon={FolderOpen} title="Note Folders" subtitle="Used to organize your notes" color="violet" />
                  <div className="flex flex-wrap items-start gap-2">
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g. Recipes"
                      className="max-w-xs"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFolder(); } }}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {FOLDER_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewFolderColor(c)}
                          className={cn(
                            "h-6 w-6 rounded-full transition-transform hover:scale-110",
                            newFolderColor === c ? "ring-2 ring-offset-2 ring-blue-500" : ""
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Button onClick={addFolder} disabled={!newFolderName.trim()}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  {folders.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No folders yet — add one above so it shows up in Notes.</p>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                      {folders.map((folder) => (
                        <div key={folder.id} className="flex items-center justify-between py-2.5">
                          {editingFolderId === folder.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={editingFolderName}
                                onChange={(e) => setEditingFolderName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEditFolder(); } }}
                                autoFocus
                                className="max-w-xs"
                              />
                              <div className="flex items-center gap-1">
                                {FOLDER_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => setEditingFolderColor(c)}
                                    className={cn(
                                      "h-5 w-5 rounded-full transition-transform hover:scale-110",
                                      editingFolderColor === c ? "ring-2 ring-offset-1 ring-blue-500" : ""
                                    )}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: folder.color }} />
                              {folder.name}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            {editingFolderId === folder.id ? (
                              <>
                                <IconButton icon={Check} label="Save" onClick={saveEditFolder} />
                                <IconButton icon={X} label="Cancel" onClick={() => setEditingFolderId(null)} />
                              </>
                            ) : (
                              <>
                                <IconButton icon={Pencil} label={t("common.edit")} onClick={() => startEditFolder(folder)} />
                                <IconButton icon={Trash2} label={t("common.delete")} onClick={() => deleteFolder(folder)} className="text-red-400 hover:text-red-500" />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transaction categories */}
                {(["income", "expense"] as const).map((type) => (
                  <div key={type} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-6 py-5">
                    <SectionTitle
                      icon={Tags}
                      title={type === "income" ? "Income Categories" : "Expense Categories"}
                      subtitle="Used in the Income/Expense form"
                      color="violet"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={type === "income" ? newIncomeCat : newExpenseCat}
                        onChange={(e) => (type === "income" ? setNewIncomeCat(e.target.value) : setNewExpenseCat(e.target.value))}
                        placeholder={type === "income" ? "e.g. Bonus" : "e.g. Subscriptions"}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(type); } }}
                      />
                      <Button onClick={() => addCategory(type)} disabled={!(type === "income" ? newIncomeCat : newExpenseCat).trim()}>
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                    {categories.filter((c) => c.type === type).length === 0 ? (
                      <p className="mt-4 text-sm text-slate-400">No categories yet — add one above.</p>
                    ) : (
                      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                        {categories.filter((c) => c.type === type).map((cat) => (
                          <div key={cat.id} className="flex items-center justify-between py-2.5">
                            {editingCatId === cat.id ? (
                              <Input
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEditCategory(); } }}
                                autoFocus
                                className="max-w-xs"
                              />
                            ) : (
                              <span className="text-sm text-slate-700 dark:text-slate-300">{cat.name}</span>
                            )}
                            <div className="flex items-center gap-1">
                              {editingCatId === cat.id ? (
                                <>
                                  <IconButton icon={Check} label="Save" onClick={saveEditCategory} />
                                  <IconButton icon={X} label="Cancel" onClick={() => setEditingCatId(null)} />
                                </>
                              ) : (
                                <>
                                  <IconButton icon={Pencil} label={t("common.edit")} onClick={() => startEditCategory(cat)} />
                                  <IconButton icon={Trash2} label={t("common.delete")} onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-500" />
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Security ── */}
            {activeSection === "security" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-6 py-5">
                <SectionTitle icon={Shield} title={t("settings.security")} subtitle="Account security" color="red" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                        <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{profile?.email ?? "—"}</span>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
                  </div>
                  <Button variant="outline" onClick={handlePasswordReset} disabled={pwLoading || !profile?.email} className="w-full">
                    {pwLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Send password reset email
                  </Button>
                  {pwMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-400">{pwMsg}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">{t("settings.securityHint")}</p>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
