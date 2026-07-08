"use client";

import { FinancePageShell } from "@/components/layout/finance-page-shell";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ViewToggle } from "@/components/ui/view-toggle";
import { useTranslation } from "@/components/providers/i18n-provider";
import { formatRupiah, formatCurrency, parseRupiahInput, parseDecimalInput, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SavingsGoal, Wallet } from "@/types/database";
import { format, parseISO } from "date-fns";
import { GripVertical, LayoutGrid, PiggyBank, Plus, Pencil, Trash2, Wallet as WalletIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLORS = [
  "#10b981","#6366f1","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#84cc16","#f97316","#0ea5e9",
];

const NO_WALLET = "__no_wallet__";

type LayoutView = "all" | "grouped";

const emptyForm = {
  name: "", target_amount: "", deadline: "", color: COLORS[0],
  currency: "IDR", exchange_rate: "1", default_wallet_id: "",
};

function displayAmount(goal: SavingsGoal, amount: number) {
  if (goal.currency === "IDR") return formatRupiah(amount);
  const foreign = amount / (Number(goal.exchange_rate) || 1);
  return `${formatCurrency(foreign, goal.currency)} (${formatRupiah(amount)})`;
}

function GoalCardBody({
  goal, onEdit, onDelete, t,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  const progress = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);
  const isValas = goal.currency !== "IDR";
  return (
    <Card>
      <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: goal.color }} />
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{goal.name}</h3>
              {isValas && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  {goal.currency}
                </span>
              )}
            </div>
            {goal.deadline && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("finance.deadlinePrefix")} {format(parseISO(goal.deadline), "MMM d, yyyy")}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <IconButton icon={Pencil} label={t("common.edit")} onClick={onEdit} />
            <IconButton icon={Trash2} label={t("common.delete")} onClick={onDelete} className="text-red-400 hover:text-red-500" />
          </div>
        </div>
        <div className="mb-2 flex items-end justify-between">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{displayAmount(goal, Number(goal.current_amount))}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t("finance.ofLabel")} {displayAmount(goal, Number(goal.target_amount))}</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{progress.toFixed(0)}% {t("finance.complete")}</span>
        {isValas && (
          <p className="mt-2 text-xs text-slate-400">1 {goal.currency} = {formatRupiah(Number(goal.exchange_rate))}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SortableGoalCard(props: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.goal.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
    >
      <div className="relative">
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-1 -top-1 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-white text-slate-300 shadow-sm hover:text-slate-500 active:cursor-grabbing dark:bg-slate-800 dark:text-slate-600"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <GoalCardBody {...props} />
      </div>
    </div>
  );
}

export default function SavingsPage() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SavingsGoal | null>(null);
  const [layoutView, setLayoutView] = useState<LayoutView>("all");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [goalsRes, walletsRes] = await Promise.all([
        supabase.from("savings_goals").select("*").order("position"),
        supabase.from("wallets").select("*").order("position"),
      ]);
      setGoals(goalsRes.data ?? []);
      setWallets(walletsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const groupedGoals = useMemo(() => {
    const groups = new Map<string, SavingsGoal[]>();
    for (const g of goals) {
      const key = g.default_wallet_id || NO_WALLET;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    }
    return Array.from(groups.entries());
  }, [goals]);

  const walletName = (id: string) => wallets.find((w) => w.id === id)?.name ?? t("finance.noWalletSet");

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditTarget(goal);
    setForm({
      name: goal.name,
      target_amount: String(goal.target_amount),
      deadline: goal.deadline ?? "",
      color: goal.color,
      currency: goal.currency,
      exchange_rate: String(goal.exchange_rate),
      default_wallet_id: goal.default_wallet_id ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const target = parseRupiahInput(form.target_amount);
    if (!form.name.trim() || !target) return;
    setSaving(true);
    const supabase = createClient();

    if (editTarget) {
      const { data } = await supabase.from("savings_goals").update({
        name: form.name,
        target_amount: target,
        deadline: form.deadline || null,
        color: form.color,
        currency: form.currency,
        exchange_rate: parseDecimalInput(form.exchange_rate) || 1,
        default_wallet_id: form.default_wallet_id || null,
      }).eq("id", editTarget.id).select().single();
      if (data) setGoals(goals.map((g) => (g.id === data.id ? data : g)));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("savings_goals").insert({
        user_id: user!.id,
        name: form.name,
        target_amount: target,
        deadline: form.deadline || null,
        color: form.color,
        currency: form.currency,
        exchange_rate: parseDecimalInput(form.exchange_rate) || 1,
        default_wallet_id: form.default_wallet_id || null,
        position: goals.length,
      }).select().single();
      if (data) setGoals([...goals, data]);
    }

    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
  };

  const deleteGoal = async (id: string) => {
    const supabase = createClient();
    await supabase.from("savings_goals").delete().eq("id", id);
    setGoals(goals.filter((g) => g.id !== id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = goals.findIndex((g) => g.id === active.id);
    const newIndex = goals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(goals, oldIndex, newIndex);
    setGoals(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((g, i) =>
        g.position === i ? null : supabase.from("savings_goals").update({ position: i }).eq("id", g.id)
      )
    );
  };

  return (
    <FinancePageShell action={
      <Button onClick={openCreate} size="sm">
        <Plus className="h-4 w-4" />
        {t("finance.newGoal")}
      </Button>
    }>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {!loading && goals.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">{t("finance.contributeViaTransactionsHint")}</p>
            <ViewToggle
              views={[
                { id: "all" as LayoutView, label: t("finance.allGoals"), icon: LayoutGrid },
                { id: "grouped" as LayoutView, label: t("finance.groupByWallet"), icon: WalletIcon },
              ]}
              active={layoutView}
              onChange={setLayoutView}
            />
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <EmptyState icon={PiggyBank} title={t("finance.savingsEmptyTitle")} description={t("finance.savingsEmptyDesc")} action={
            <Button onClick={openCreate}><Plus className="h-4 w-4" />{t("finance.createGoal")}</Button>
          } />
        ) : layoutView === "grouped" ? (
          <div className="space-y-6">
            {groupedGoals.map(([walletKey, group]) => (
              <div key={walletKey}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {walletKey === NO_WALLET ? t("finance.noWalletSet") : walletName(walletKey)}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.map((goal) => (
                    <GoalCardBody
                      key={goal.id}
                      goal={goal}
                      onEdit={() => openEdit(goal)}
                      onDelete={() => deleteGoal(goal.id)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={goals.map((g) => g.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-4 sm:grid-cols-2">
                {goals.map((goal) => (
                  <SortableGoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => openEdit(goal)}
                    onDelete={() => deleteGoal(goal.id)}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? t("finance.editGoal") : t("finance.newGoalTitle")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("finance.goalNameLabel")}</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("finance.goalNamePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("finance.currencyFieldLabel")}</label>
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value, exchange_rate: e.target.value === "IDR" ? "1" : form.exchange_rate })}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} – {c.symbol}</option>)}
              </Select>
            </div>
            {form.currency !== "IDR" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("finance.rateToIdrLabel")}</label>
                <Input value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} placeholder="e.g. 16000" />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("finance.targetAmountLabelPrefix")} ({form.currency})
            </label>
            <Input value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder={t("finance.targetAmountPlaceholder")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("finance.deadlineLabel")}</label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("finance.defaultWalletLabel")}</label>
            <Select value={form.default_wallet_id} onChange={(e) => setForm({ ...form, default_wallet_id: e.target.value })}>
              <option value="">{t("finance.noDefaultWallet")}</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-400">{t("finance.defaultWalletHint")}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("finance.colorLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={cn("h-7 w-7 rounded-full transition-transform hover:scale-110", form.color === c ? "ring-2 ring-offset-2 ring-blue-500" : "")} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? t("common.saving") : editTarget ? t("common.save") : t("common.create")}</Button>
          </div>
        </div>
      </Modal>
    </FinancePageShell>
  );
}
