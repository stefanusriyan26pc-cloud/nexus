"use client";

import { Header } from "@/components/layout/header";
import { useProfile } from "@/components/layout/profile-provider";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrencyDisplay } from "@/hooks/use-currency-display";
import { totalWalletBalance } from "@/lib/finance/wallets";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CalendarEvent, FinanceTransaction, Note, SavingsGoal, Task, Wallet as WalletRecord } from "@/types/database";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import {
  ArrowRight, CalendarDays, CheckSquare, Landmark,
  NotebookPen, PiggyBank, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function getGreeting(name?: string) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${greeting}, ${name.split(" ")[0]}` : greeting;
}

function StatCard({ icon: Icon, label, value, sub, color, bg, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string;
  color: string; bg: string; href?: string;
}) {
  const content = (
    <CardContent className="flex items-center gap-4 p-5">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", bg)}>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className={cn("truncate text-xl font-bold", color)}>{value}</p>
        {sub && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
      {href && <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />}
    </CardContent>
  );
  if (href) return <Card className="transition hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50"><Link href={href} className="block">{content}</Link></Card>;
  return <Card>{content}</Card>;
}

export default function DashboardPage() {
  const profile = useProfile();
  const { t } = useTranslation();
  const { formatDisplay } = useCurrencyDisplay();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const now = new Date();
      const monthStart = format(now, "yyyy-MM-01");
      const [tasksRes, eventsRes, txRes, walletRes, goalsRes, notesRes] = await Promise.all([
        supabase.from("tasks").select("*").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(5),
        supabase.from("calendar_events").select("*").gte("start_at", now.toISOString()).order("start_at", { ascending: true }).limit(5),
        supabase.from("finance_transactions").select("*").gte("transaction_date", monthStart).order("transaction_date", { ascending: false }),
        supabase.from("wallets").select("*"),
        supabase.from("savings_goals").select("*").order("created_at"),
        supabase.from("notes").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(3) as unknown as Promise<{ data: Note[] | null }>,
      ]);
      setTasks(tasksRes.data ?? []);
      setEvents(eventsRes.data ?? []);
      setTransactions(txRes.data ?? []);
      setWallets(walletRes.data ?? []);
      setGoals(goalsRes.data ?? []);
      setNotes(notesRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const totalBalance = totalWalletBalance(wallets);
  const netBalance = income - expense;

  const formatDue = (date: string | null) => {
    if (!date) return null;
    const d = parseISO(date);
    if (isToday(d)) return t("common.today");
    if (isTomorrow(d)) return t("common.tomorrow");
    return format(d, "MMM d");
  };

  const priorityVariant = { low: "default" as const, medium: "warning" as const, high: "danger" as const };

  const topGoal = goals.reduce<SavingsGoal | null>((best, g) => {
    if (!best) return g;
    const pct = Number(g.current_amount) / Number(g.target_amount);
    const bPct = Number(best.current_amount) / Number(best.target_amount);
    return pct > bPct ? g : best;
  }, null);

  const recentTxs = transactions.slice(0, 5);

  return (
    <>
      <Header
        title={t("dashboard.title")}
        subtitle={getGreeting(profile?.full_name ?? undefined)}
        profile={profile}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={TrendingUp} label={t("dashboard.incomeMonth")} value={formatDisplay(income)} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/40" href="/finance/income" />
              <StatCard icon={TrendingDown} label={t("dashboard.expensesMonth")} value={formatDisplay(expense)} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-950/40" href="/finance/income" />
              <StatCard icon={Landmark}    label={t("dashboard.totalBalance")}    value={formatDisplay(totalBalance)} color="text-blue-600 dark:text-blue-400"    bg="bg-blue-50 dark:bg-blue-950/40"    href="/finance/wallets" />
              <StatCard icon={Wallet}      label={t("dashboard.netBalance") + " (bulan ini)"} value={formatDisplay(netBalance)} sub={netBalance >= 0 ? "Surplus" : "Defisit"} color={netBalance >= 0 ? "text-slate-700 dark:text-slate-100" : "text-red-500"} bg="bg-slate-100 dark:bg-slate-800" />
              <StatCard icon={CheckSquare} label={t("dashboard.openTasks")}       value={String(tasks.length)} sub={`${tasks.filter(t => t.priority === "high").length} high priority`} color="text-cyan-600 dark:text-cyan-400" bg="bg-cyan-50 dark:bg-cyan-950/40" href="/tasks" />
              <StatCard icon={NotebookPen} label={t("nav.notes")}                 value={String(notes.length)} sub="recent notes" color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/40" href="/notes" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Tasks & Events column */}
              <div className="space-y-6 lg:col-span-2">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Card>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-cyan-500" />
                          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("dashboard.upcomingTasks")}</h2>
                        </div>
                        <Link href="/tasks" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                          {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      {tasks.length === 0 ? (
                        <p className="px-5 py-6 text-center text-xs text-slate-400">{t("dashboard.noTasks")}</p>
                      ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {tasks.map((task) => (
                            <li key={task.id} className="flex items-center justify-between px-5 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                                {task.due_date && <p className="text-xs text-slate-400">{t("tasks.due")} {formatDue(task.due_date)}</p>}
                              </div>
                              <Badge variant={priorityVariant[task.priority]}>{t(`priority.${task.priority}`)}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-blue-500" />
                          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("dashboard.upcomingEvents")}</h2>
                        </div>
                        <Link href="/calendar" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                          {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      {events.length === 0 ? (
                        <p className="px-5 py-6 text-center text-xs text-slate-400">{t("dashboard.noEvents")}</p>
                      ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {events.map((event) => (
                            <li key={event.id} className="flex items-center gap-3 px-5 py-2.5">
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: event.color }} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{event.title}</p>
                                <p className="text-xs text-slate-400">{format(parseISO(event.start_at), "MMM d, h:mm a")}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent transactions */}
                <Card>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Transactions</h2>
                      </div>
                      <Link href="/finance/income" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    {recentTxs.length === 0 ? (
                      <p className="px-5 py-6 text-center text-xs text-slate-400">{t("finance.noTransactions")}</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentTxs.map((tx) => (
                          <li key={tx.id} className="flex items-center justify-between px-5 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg",
                                tx.type === "income" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-red-50 dark:bg-red-950/40"
                              )}>
                                {tx.type === "income"
                                  ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  : <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                }
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {tx.description || tx.category || tx.type}
                                </p>
                                <p className="text-xs text-slate-400">{format(parseISO(tx.transaction_date), "MMM d")}</p>
                              </div>
                            </div>
                            <span className={cn("text-sm font-semibold",
                              tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {tx.type === "income" ? "+" : "-"}{formatDisplay(Number(tx.amount))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column: savings goals + open tasks count */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-amber-500" />
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("finance.savingsOverview")}</h2>
                      </div>
                      <Link href="/finance/savings" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    {goals.length === 0 ? (
                      <p className="px-5 py-6 text-center text-xs text-slate-400">{t("finance.savingsEmptyTitle")}</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {goals.slice(0, 4).map((goal) => {
                          const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);
                          return (
                            <div key={goal.id} className="px-5 py-3">
                              <div className="mb-1.5 flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{goal.name}</p>
                                <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                              </div>
                              <p className="mt-1 text-xs text-slate-400">{formatDisplay(Number(goal.current_amount))} / {formatDisplay(Number(goal.target_amount))}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick links */}
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quick Actions</p>
                    <div className="space-y-1">
                      {[
                        { href: "/finance/income", label: t("dashboard.quickTransaction"), sub: t("dashboard.quickTransactionDesc"), icon: TrendingUp },
                        { href: "/tasks", label: t("dashboard.quickAddTask"), sub: t("dashboard.quickAddTaskDesc"), icon: CheckSquare },
                        { href: "/calendar", label: t("dashboard.quickSchedule"), sub: t("dashboard.quickScheduleDesc"), icon: CalendarDays },
                      ].map(({ href, label, sub, icon: Icon }) => (
                        <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <Icon className="h-4 w-4 shrink-0 text-blue-500" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
                            <p className="truncate text-xs text-slate-400">{sub}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
