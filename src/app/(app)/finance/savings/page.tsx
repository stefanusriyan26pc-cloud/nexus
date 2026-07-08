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
import { contributeToGoal } from "@/lib/finance/goals";
import { applyWalletDeltaLocally } from "@/lib/finance/wallets";
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
  goal, onEdit, onDelete, onDeposit, t,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onDeposit: () => void;
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Target: {format(parseISO(goal.deadline), "MMM d, yyyy")}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <IconButton icon={Pencil} label={t("common.edit")} onClick={onEdit} />
            <IconButton icon={Trash2} label={t("common.delete")} onClick={onDelete} className="text-red-400 hover:text-red-500" />
          </div>
        </div>
        <div className="mb-2 flex items-end justify-between">
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{displayAmount(goal, Number(goal.current_amount))}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">of {displayAmount(goal, Number(goal.target_amount))}</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">{progress.toFixed(0)}% {t("finance.complete")}</span>
          <Button size="sm" variant="outline" onClick={onDeposit}>
            <Plus className="h-3.5 w-3.5" />
            {t("finance.addFunds")}
          </Button>
        </div>
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
  onDeposit: () => void;
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
  const [depositModal, setDepositModal] = useState<SavingsGoal | null>(null);
  const [depositWalletId, setDepositWalletId] = useState("");
  const [layoutView, setLayoutView] = useState<LayoutView>("all");
  const [form, setForm] = useState(emptyForm);
  const [depositAmount, setDepositAmount] = useState("");
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

  const walletName = (id: string) => wallets.find((w) => w.id === id)?.name ?? "No wallet set";

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

  const openDeposit = (goal: SavingsGoal) => {
    setDepositModal(goal);
    setDepositWalletId(goal.default_wallet_id ?? "");
    setDepositAmount("");
  };

  const handleDeposit = async () => {
    if (!depositModal || !depositWalletId) return;
    const amount = parseRupiahInput(depositAmount);
    if (!amount) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const result = await contributeToGoal(supabase, {
      userId: user!.id,
      goal: depositModal,
      walletId: depositWalletId,
      amount,
      date: format(new Date(), "yyyy-MM-dd"),
    });

    if (result) {
      setGoals(goals.map((g) => (g.id === result.goal.id ? result.goal : g)));
      setWallets(applyWalletDeltaLocally(wallets, depositWalletId, -amount));
    }

    setSaving(false);
    setDepositModal(null);
    setDepositAmount("");
    setDepositWalletId("");
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
          <div className="mb-4 flex justify-end">
            <ViewToggle
              views={[
                { id: "all" as LayoutView, label: "All goals", icon: LayoutGrid },
                { id: "grouped" as LayoutView, label: "Group by wallet", icon: WalletIcon },
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
          <EmptyState icon={PiggyBank} title="No savings goals" description="Create a savings goal to track progress toward financial targets." action={
            <Button onClick={openCreate}><Plus className="h-4 w-4" />Create Goal</Button>
          } />
        ) : layoutView === "grouped" ? (
          <div className="space-y-6">
            {groupedGoals.map(([walletKey, group]) => (
              <div key={walletKey}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {walletKey === NO_WALLET ? "No wallet set" : walletName(walletKey)}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.map((goal) => (
                    <GoalCardBody
                      key={goal.id}
                      goal={goal}
                      onEdit={() => openEdit(goal)}
                      onDelete={() => deleteGoal(goal.id)}
                      onDeposit={() => openDeposit(goal)}
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
                    onDeposit={() => openDeposit(goal)}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Savings Goal" : "New Savings Goal"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Goal Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Emergency Fund" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value, exchange_rate: e.target.value === "IDR" ? "1" : form.exchange_rate })}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} – {c.symbol}</option>)}
              </Select>
            </div>
            {form.currency !== "IDR" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Rate (to IDR)</label>
                <Input value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} placeholder="e.g. 16000" />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Target Amount ({form.currency})
            </label>
            <Input value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="e.g. 10000000" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Deadline</label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Default Wallet</label>
            <Select value={form.default_wallet_id} onChange={(e) => setForm({ ...form, default_wallet_id: e.target.value })}>
              <option value="">No default wallet</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-400">Used to pre-fill &quot;Add Funds&quot; and to group goals by wallet.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={cn("h-7 w-7 rounded-full transition-transform hover:scale-110", form.color === c ? "ring-2 ring-offset-2 ring-blue-500" : "")} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : editTarget ? "Save" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!depositModal} onClose={() => setDepositModal(null)} title={t("finance.addFundsTitle")}>
        {depositModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("finance.addingTo")} <strong className="text-slate-900 dark:text-slate-100">{depositModal.name}</strong>
              {depositModal.currency !== "IDR" && <span className="ml-1 text-amber-600">({depositModal.currency})</span>}
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">From Wallet</label>
              <Select value={depositWalletId} onChange={(e) => setDepositWalletId(e.target.value)}>
                <option value="">Select wallet</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Amount (IDR)</label>
              <Input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Amount in IDR" autoFocus />
              {depositModal.currency !== "IDR" && depositAmount && (
                <p className="mt-1 text-xs text-slate-500">
                  = {formatCurrency(parseRupiahInput(depositAmount) / (Number(depositModal.exchange_rate) || 1), depositModal.currency)} {depositModal.currency}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDepositModal(null)}>Cancel</Button>
              <Button onClick={handleDeposit} disabled={saving || !depositWalletId || !depositAmount}>{saving ? "Saving..." : "Add"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </FinancePageShell>
  );
}
