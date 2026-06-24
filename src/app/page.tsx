import Link from "next/link";
import {
  CheckSquare,
  CalendarDays,
  Wallet,
  StickyNote,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#0a0a14] text-white flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-wide">NEXUS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
          </span>
          All-in-one life management
        </div>

        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          One place for{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            everything
          </span>{" "}
          that matters
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-slate-400 sm:text-lg">
          Nexus connects your tasks, notes, calendar, and finances — so you can focus on living, not organizing.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl w-full">
          {[
            {
              icon: CheckSquare,
              color: "text-indigo-400",
              bg: "bg-indigo-500/10 border-indigo-500/20",
              title: "Tasks",
              desc: "Track to-dos with priorities and due dates",
            },
            {
              icon: StickyNote,
              color: "text-violet-400",
              bg: "bg-violet-500/10 border-violet-500/20",
              title: "Notes",
              desc: "Capture ideas and pin what's important",
            },
            {
              icon: CalendarDays,
              color: "text-cyan-400",
              bg: "bg-cyan-500/10 border-cyan-500/20",
              title: "Calendar",
              desc: "Plan events with a clean month view",
            },
            {
              icon: Wallet,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
              title: "Finance",
              desc: "Log income, expenses, and track wallets",
            },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div
              key={title}
              className={`rounded-2xl border ${bg} p-5 text-left`}
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Nexus. Built with Next.js &amp; Supabase.
      </footer>
    </div>
  );
}
