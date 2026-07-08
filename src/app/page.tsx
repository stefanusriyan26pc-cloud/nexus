"use client";

import { NexumLogo } from "@/components/brand/nexum-logo";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useLocalePreference } from "@/hooks/use-locale-preference";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, CheckSquare, Moon, Shield, Sparkles,
  StickyNote, Sun, Wallet, Zap, BarChart3, Target, CheckCircle2,
  TrendingUp, TrendingDown, Clock, Star, Globe,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ── Scroll-animation hook ─────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
    >
      {children}
    </div>
  );
}

const FEATURE_COLORS = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-500/10",    icon: "text-blue-600 dark:text-blue-400",    ring: "ring-blue-200 dark:ring-blue-500/30"    },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-500/10",    icon: "text-cyan-600 dark:text-cyan-400",    ring: "ring-cyan-200 dark:ring-cyan-500/30"    },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-500/30" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-500/10",  icon: "text-amber-600 dark:text-amber-400",  ring: "ring-amber-200 dark:ring-amber-500/30"  },
} as const;
type FeatureColor = keyof typeof FEATURE_COLORS;

/* ── Dashboard mock ────────────────────────────────────────────── */
function DashboardMock() {
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/40">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3 dark:border-white/5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 h-2 w-28 rounded-full bg-slate-100 dark:bg-white/5" />
      </div>
      <div className="flex h-56 sm:h-64">
        <div className="flex w-12 flex-col gap-2.5 border-r border-slate-100 p-2.5 dark:border-white/5">
          {[0,1,2,3,4].map((i) => (
            <span key={i} className={cn("h-6 w-6 rounded-lg", i === 0 ? "bg-blue-500/25" : "bg-slate-100 dark:bg-white/5")} />
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="mb-3.5 grid grid-cols-3 gap-2.5">
            {[
              { color: "bg-blue-500/10 dark:bg-blue-500/15", bar: "bg-blue-400" },
              { color: "bg-emerald-500/10 dark:bg-emerald-500/15", bar: "bg-emerald-400" },
              { color: "bg-amber-500/10 dark:bg-amber-500/15", bar: "bg-amber-400" },
            ].map((s, i) => (
              <div key={i} className={cn("rounded-xl p-2.5", s.color)}>
                <div className="mb-1.5 h-1.5 w-8 rounded-full bg-current opacity-20" />
                <div className="h-4 w-12 rounded-full bg-current opacity-35" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[75, 55, 90, 40].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full border-2", i === 2 ? "border-blue-500 bg-blue-500" : "border-slate-200 dark:border-white/10")} />
                <span className="h-2 rounded-full bg-slate-100 dark:bg-white/8" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-white dark:from-slate-900" />
    </div>
  );
}

/* ── Task mock — realistic Kanban board ───────────────────────── */
function TaskMock() {
  const cols = [
    {
      label: "To Do", count: 3,
      dot: "bg-slate-400",
      bg: "bg-slate-50 dark:bg-white/3",
      cards: [
        { w1: 70, w2: 45, tag: "Design",   tagColor: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300", dot: "bg-amber-400" },
        { w1: 55, w2: 35, tag: "Backend",  tagColor: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",     dot: "bg-red-400" },
        { w1: 80, w2: 50, tag: "Research", tagColor: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300",     dot: "bg-slate-300" },
      ],
    },
    {
      label: "In Progress", count: 2,
      dot: "bg-blue-500",
      bg: "bg-blue-50/60 dark:bg-blue-500/5",
      cards: [
        { w1: 65, w2: 40, tag: "Frontend", tagColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300", dot: "bg-amber-400" },
        { w1: 75, w2: 30, tag: "API",      tagColor: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",          dot: "bg-red-400" },
      ],
    },
    {
      label: "Done", count: 3,
      dot: "bg-emerald-500",
      bg: "bg-emerald-50/60 dark:bg-emerald-500/5",
      cards: [
        { w1: 60, w2: 42, tag: "Auth",     tagColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300", dot: "bg-slate-300" },
        { w1: 85, w2: 55, tag: "UI Kit",   tagColor: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",    dot: "bg-slate-300" },
        { w1: 50, w2: 38, tag: "Deploy",   tagColor: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300",           dot: "bg-slate-300" },
      ],
    },
  ];
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
      {/* title bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <div className="h-2 w-20 rounded-full bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-lg bg-blue-500/20" />
          <div className="h-6 w-20 rounded-lg bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
      {/* kanban columns */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {cols.map((col) => (
          <div key={col.label} className={cn("rounded-xl p-2", col.bg)}>
            {/* column header */}
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
              </div>
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-white/30" />
              </div>
            </div>
            {/* cards */}
            <div className="space-y-1.5">
              {col.cards.map((card, i) => (
                <div key={i} className="rounded-lg bg-white px-2 py-2 shadow-sm dark:bg-slate-800/80">
                  <div className="mb-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10" style={{ width: `${card.w1}%` }} />
                  <div className="mb-2 h-1 rounded-full bg-slate-100 dark:bg-white/5" style={{ width: `${card.w2}%` }} />
                  <div className="flex items-center justify-between">
                    <div className={cn("rounded px-1.5 py-0.5 text-[8px] font-semibold leading-none", card.tagColor)}>
                      {card.tag}
                    </div>
                    <span className={cn("h-2 w-2 rounded-full", card.dot)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Finance mock — balance + chart + goals ──────────────────── */
function FinanceMock() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const income  = [45, 60, 52, 70, 58, 80, 65];
  const expense = [30, 40, 38, 50, 42, 55, 48];
  const goals = [
    { pct: 62, color: "bg-blue-500"    },
    { pct: 40, color: "bg-emerald-500" },
  ];
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
      {/* balance header */}
      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/5">
        <div className="mb-1.5 h-1.5 w-20 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="h-5 w-28 rounded-lg bg-slate-800 dark:bg-white/80" />
        <div className="mt-2.5 flex gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 dark:bg-emerald-500/15">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <div className="h-1.5 w-10 rounded-full bg-emerald-300 dark:bg-emerald-500/40" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 dark:bg-red-500/15">
            <TrendingDown className="h-3 w-3 text-red-400" />
            <div className="h-1.5 w-10 rounded-full bg-red-300 dark:bg-red-400/40" />
          </div>
        </div>
      </div>
      {/* bar chart */}
      <div className="px-4 pt-3">
        <div className="mb-1.5 h-1.5 w-16 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="mt-2 flex h-16 items-end gap-1">
          {months.map((m, i) => (
            <div key={m} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="flex w-full items-end gap-0.5">
                <div className="flex-1 rounded-t bg-emerald-400/70 dark:bg-emerald-500/50" style={{ height: `${income[i] * 0.5}px` }} />
                <div className="flex-1 rounded-t bg-red-400/60 dark:bg-red-400/40"    style={{ height: `${expense[i] * 0.5}px` }} />
              </div>
              <div className="h-1 w-3 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      {/* savings goals */}
      <div className="space-y-2.5 px-4 pb-4 pt-3">
        <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-white/10" />
        {goals.map((g, i) => (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between">
              <div className="h-1.5 w-20 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="h-1.5 w-5 rounded-full bg-slate-300 dark:bg-white/15" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className={cn("h-full rounded-full", g.color)} style={{ width: `${g.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { locale, changeLocale } = useLocalePreference();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const features: { icon: React.ElementType; titleKey: string; descKey: string; color: FeatureColor }[] = [
    { icon: CheckSquare,  titleKey: "landing.featureTasks",    descKey: "landing.featureTasksDesc",    color: "blue"    },
    { icon: CalendarDays, titleKey: "landing.featureSchedule", descKey: "landing.featureScheduleDesc", color: "cyan"    },
    { icon: Wallet,       titleKey: "landing.featureFinance",  descKey: "landing.featureFinanceDesc",  color: "emerald" },
    { icon: StickyNote,   titleKey: "landing.featureNotes",    descKey: "landing.featureNotesDesc",    color: "amber"   },
  ];

  const steps = [
    { icon: Star,         num: "01", labelKey: "landing.step1Label", descKey: "landing.step1Desc",  color: "text-blue-500"    },
    { icon: Target,       num: "02", labelKey: "landing.step2Label", descKey: "landing.step2Desc",  color: "text-cyan-500"    },
    { icon: CheckCircle2, num: "03", labelKey: "landing.step3Label", descKey: "landing.step3Desc",  color: "text-emerald-500" },
  ];

  const stats = [
    { value: "4",  labelKey: "landing.statModules" },
    { value: "∞",  labelKey: "landing.statFree"    },
    { value: "2",  labelKey: "landing.statLang"    },
    { value: "🌙", labelKey: "landing.statDark"    },
  ];

  return (
    <div className="min-h-dvh bg-white text-slate-900 dark:bg-[#0a0a14] dark:text-white flex flex-col">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md dark:border-white/5 dark:bg-[#0a0a14]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10">
          <NexumLogo size="sm" />
          <nav className="flex items-center gap-1">
            {mounted && (
              <>
                <div className="mr-1 flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  {(["en", "id"] as const).map((code) => (
                    <button key={code} onClick={() => changeLocale(code)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors",
                        locale === code
                          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      )}
                    >{code}</button>
                  ))}
                </div>
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </>
            )}
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              {t("auth.signIn")}
            </Link>
            <Link href="/register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
              {t("landing.ctaStart")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-6 pb-0 pt-20 text-center sm:px-10 sm:pt-28">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-175 w-175 -translate-x-1/2 rounded-full bg-blue-500/[0.07] blur-3xl dark:bg-blue-500/10" />
          <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-cyan-400/6 blur-3xl dark:bg-cyan-400/8" />

          <div className="relative mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              {t("nav.tagline")}
            </div>

            <h1 className="text-[2.75rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
              {t("landing.heroTitle")}
              <br />
              <span className="bg-linear-to-r from-blue-500 via-sky-400 to-cyan-400 bg-clip-text text-transparent">
                {t("landing.heroHighlight")}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
              {t("landing.heroDesc")}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-px">
                {t("landing.ctaStart")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/8">
                {t("auth.signIn")}
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-500" />{t("landing.trustSecure")}</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-blue-500" />{t("landing.trustFast")}</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-amber-500" />{t("landing.trustFree")}</span>
            </div>

            {/* Mock UI */}
            <div className="pointer-events-none relative mx-auto mt-16 max-w-3xl select-none overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200 dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
              <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3 dark:border-white/5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 h-2 w-32 rounded-full bg-slate-100 dark:bg-white/5" />
              </div>
              <div className="flex h-52 sm:h-64">
                <div className="flex w-14 flex-col gap-3 border-r border-slate-100 p-3 dark:border-white/5">
                  {[0,1,2,3,4].map((i) => (
                    <span key={i} className={cn("h-6 w-6 rounded-lg", i === 0 ? "bg-blue-500/20" : "bg-slate-100 dark:bg-white/5")} />
                  ))}
                </div>
                <div className="flex-1 p-4">
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    {[
                      "bg-blue-500/10 dark:bg-blue-500/15",
                      "bg-cyan-500/10 dark:bg-cyan-500/15",
                      "bg-emerald-500/10 dark:bg-emerald-500/15",
                    ].map((color, i) => (
                      <div key={i} className={cn("rounded-lg p-2.5", color)}>
                        <span className="mb-1.5 block h-1.5 w-10 rounded-full bg-current opacity-30" />
                        <span className="block h-3 w-14 rounded-full bg-current opacity-40" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[80, 60, 90, 50].map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full border-2", i === 2 ? "border-blue-500 bg-blue-500" : "border-slate-200 dark:border-white/10")} />
                        <span className="h-2 rounded-full bg-slate-100 dark:bg-white/8" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-white dark:from-[#0a0a14]" />
            </div>
          </div>
        </section>

        {/* ── Stats strip ── */}
        <section className="border-y border-slate-100 bg-white px-6 py-10 dark:border-white/5 dark:bg-white/2">
          <div className="mx-auto max-w-4xl grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map(({ value, labelKey }, i) => (
              <FadeUp key={labelKey} delay={i * 80}>
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">{value}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(labelKey)}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="bg-slate-50 px-6 py-20 dark:bg-white/2 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <FadeUp>
              <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{t("landing.featuresTitle")}</h2>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400">{t("landing.featuresDesc")}</p>
              </div>
            </FadeUp>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, titleKey, descKey, color }, i) => {
                const c = FEATURE_COLORS[color];
                return (
                  <FadeUp key={titleKey} delay={i * 80}>
                    <div className="group flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-white/8 dark:bg-white/4 dark:hover:border-white/12">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl ring-1", c.bg, c.ring)}>
                        <Icon className={cn("h-6 w-6", c.icon)} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{t(titleKey)}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(descKey)}</p>
                      </div>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="px-6 py-20 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <FadeUp>
              <div className="mb-14 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{t("landing.howItWorksTitle")}</h2>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400">{t("landing.howItWorksDesc")}</p>
              </div>
            </FadeUp>
            <div className="relative grid gap-8 sm:grid-cols-3">
              {/* connector line */}
              <div className="absolute left-0 right-0 top-10 hidden h-px bg-linear-to-r from-transparent via-slate-200 to-transparent dark:via-white/10 sm:block" />
              {steps.map(({ icon: Icon, num, labelKey, descKey, color }, i) => (
                <FadeUp key={num} delay={i * 120}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                      <Icon className={cn("h-8 w-8", color)} />
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">
                        {num}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t(labelKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(descKey)}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ── Spotlight: Tasks ── */}
        <section className="bg-slate-50 px-6 py-20 dark:bg-white/2 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <FadeUp>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 mb-4">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Tasks
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{t("landing.spotlightTasksTitle")}</h2>
                <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-slate-400">{t("landing.spotlightTasksDesc")}</p>
                <ul className="mt-6 space-y-2.5">
                  {["Kanban board & list view", "Priority levels & due dates", "Filter & search", "Calendar integration"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeUp>
              <FadeUp delay={150}>
                <TaskMock />
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ── Spotlight: Finance ── */}
        <section className="px-6 py-20 sm:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <FadeUp delay={150} className="order-last lg:order-first">
                <FinanceMock />
              </FadeUp>
              <FadeUp>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 mb-4">
                  <Wallet className="h-3.5 w-3.5" />
                  Finance
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{t("landing.spotlightFinanceTitle")}</h2>
                <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-slate-400">{t("landing.spotlightFinanceDesc")}</p>
                <ul className="mt-6 space-y-2.5">
                  {["Income & expense tracking", "Savings goals", "Multi-wallet support", "Live exchange rates"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="px-6 py-20 sm:px-10">
          <FadeUp>
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 via-blue-600 to-cyan-500 px-8 py-14 text-center shadow-xl shadow-blue-500/20">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("landing.ctaBannerTitle")}</h2>
              <p className="mt-3 text-blue-100">{t("landing.ctaBannerDesc")}</p>
              <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-blue-600 shadow-lg transition hover:bg-blue-50 hover:-translate-y-px">
                {t("landing.ctaStart")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeUp>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 px-6 py-8 dark:border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-400 sm:flex-row">
          <NexumLogo size="sm" />
          <p>&copy; {new Date().getFullYear()} Nexus — {t("landing.footerTagline")}</p>
          <div className="flex gap-5">
            <Link href="/login"    className="hover:text-slate-600 dark:hover:text-slate-200 transition">{t("auth.signIn")}</Link>
            <Link href="/register" className="hover:text-slate-600 dark:hover:text-slate-200 transition">{t("auth.createAccountLink")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

