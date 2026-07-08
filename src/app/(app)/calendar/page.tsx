"use client";

import { Header } from "@/components/layout/header";
import { useProfile } from "@/components/layout/profile-provider";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ViewToggle } from "@/components/ui/view-toggle";
import { FilterBar } from "@/components/ui/filter-bar";
import { useTranslation } from "@/components/providers/i18n-provider";
import {
  defaultCalendarFilters,
  filterEvents,
  type CalendarPeriodFilter,
} from "@/lib/filters/calendar-filters";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/database";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus, Search, Trash2, LayoutList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "calendar" | "week" | "list";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function CalendarPage() {
  const profile = useProfile();
  const { t } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_at: "",
    end_at: "",
    all_day: false,
    color: COLORS[0],
  });
  const [saving, setSaving] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<CalendarPeriodFilter>(
    defaultCalendarFilters.period
  );
  const [search, setSearch] = useState("");

  const filteredEvents = useMemo(
    () => filterEvents(events, { period: periodFilter, search }),
    [events, periodFilter, search]
  );

  const loadEvents = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .order("start_at", { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openCreate = (date?: Date) => {
    setEditing(null);
    const d = date ?? new Date();
    const dateStr = format(d, "yyyy-MM-dd");
    setForm({
      title: "",
      description: "",
      start_at: `${dateStr}T09:00`,
      end_at: `${dateStr}T10:00`,
      all_day: false,
      color: COLORS[0],
    });
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      start_at: event.start_at.slice(0, 16),
      end_at: event.end_at?.slice(0, 16) ?? "",
      all_day: event.all_day,
      color: event.color,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.start_at) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      title: form.title,
      description: form.description || null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      all_day: form.all_day,
      color: form.color,
    };

    if (editing) {
      const { data } = await supabase
        .from("calendar_events")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (data) setEvents(events.map((e) => (e.id === data.id ? data : e)));
    } else {
      const { data } = await supabase
        .from("calendar_events")
        .insert({ ...payload, user_id: user!.id })
        .select()
        .single();
      if (data) setEvents([...events, data]);
    }
    setSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!editing) return;
    const supabase = createClient();
    await supabase.from("calendar_events").delete().eq("id", editing.id);
    setEvents(events.filter((e) => e.id !== editing.id));
    setModalOpen(false);
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.start_at), day));

  const upcomingEvents = filteredEvents
    .filter((e) => parseISO(e.start_at) >= new Date())
    .slice(0, 20);

  return (
    <>
      <Header title={t("calendar.title")} subtitle={t("calendar.subtitle")} profile={profile}>
        <Button onClick={() => openCreate()} size="sm">
          <Plus className="h-4 w-4" />
          {t("calendar.newEvent")}
        </Button>
      </Header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <ViewToggle
              views={[
                { id: "calendar" as View, label: t("calendar.calendarView"), icon: CalendarDays },
                { id: "week" as View,     label: t("calendar.weekView"),     icon: LayoutList },
                { id: "list" as View,     label: t("calendar.listView"),     icon: List },
              ]}
              active={view}
              onChange={setView}
            />
            {view === "list" && (
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t("filters.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
          {view === "list" && (
            <FilterBar
              filters={[
                {
                  id: "period",
                  label: t("filters.period"),
                  value: periodFilter,
                  onChange: (v) => setPeriodFilter(v as CalendarPeriodFilter),
                  options: [
                    { value: "all", label: t("filters.all") },
                    { value: "upcoming", label: t("filters.upcomingEvents") },
                    { value: "past", label: t("filters.pastEvents") },
                    { value: "this_month", label: t("filters.thisMonth") },
                  ],
                },
              ]}
            />
          )}
        </div>

        {loading ? (
          <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ) : events.length === 0 && view === "list" ? (
          <EmptyState
            icon={CalendarDays}
            title={t("calendar.emptyTitle")}
            description={t("calendar.emptyDesc")}
            action={
              <Button onClick={() => openCreate()}>
                <Plus className="h-4 w-4" />
                {t("calendar.createEvent")}
              </Button>
            }
          />
        ) : view === "calendar" ? (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, -30))} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 30))} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayEvents = eventsForDay(day);
                const inMonth = isSameMonth(day, currentDate);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-27.5 border-b border-r border-slate-100 p-2 dark:border-slate-800",
                      !inMonth && "bg-slate-50/50 dark:bg-slate-950/50"
                    )}
                  >
                    <button
                      onClick={() => openCreate(day)}
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40",
                        isToday(day) && "bg-blue-600 font-semibold text-white hover:bg-blue-700",
                        !isToday(day) && inMonth && "text-slate-700 dark:text-slate-300",
                        !inMonth && "text-slate-300 dark:text-slate-600"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                    <div className="mt-1 space-y-1">
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => openEdit(event)}
                          className="block w-full truncate rounded px-1.5 py-0.5 text-left text-xs text-white"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "week" ? (
          /* ── Week view ─────────────────────────────────────────── */
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>{t("calendar.today")}</Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
              {weekDays.map((day) => {
                const dayEvents = eventsForDay(day);
                const todayDay = isToday(day);
                return (
                  <div key={day.toISOString()} className="flex min-h-45 flex-col">
                    <div className={cn(
                      "flex flex-col items-center gap-0.5 border-b border-slate-100 py-3 text-center text-xs font-medium dark:border-slate-800",
                      todayDay && "bg-blue-50 dark:bg-blue-950/30"
                    )}>
                      <span className="uppercase tracking-wide text-slate-500 dark:text-slate-400">{format(day, "EEE")}</span>
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                        todayDay ? "bg-blue-600 font-bold text-white" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1 p-1.5">
                      {dayEvents.map((event) => (
                        <button key={event.id} onClick={() => openEdit(event)}
                          className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-white shadow-sm hover:opacity-90"
                          style={{ backgroundColor: event.color }}
                        >
                          <p className="truncate font-medium">{event.title}</p>
                          <p className="truncate opacity-80">{format(parseISO(event.start_at), "h:mm a")}</p>
                        </button>
                      ))}
                      <button onClick={() => openCreate(day)}
                        className="block w-full rounded px-1 py-0.5 text-center text-xs text-slate-300 hover:bg-slate-50 hover:text-blue-500 dark:text-slate-700 dark:hover:bg-slate-800"
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {upcomingEvents.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                {events.length === 0 ? t("calendar.noUpcoming") : t("common.noData")}
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => openEdit(event)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="h-10 w-1 rounded-full" style={{ backgroundColor: event.color }} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{event.title}</p>
                    {event.description && (
                      <p className="line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{event.description}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                    <p>{format(parseISO(event.start_at), "EEE, MMM d")}</p>
                    <p>{format(parseISO(event.start_at), "h:mm a")}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t("calendar.editEvent") : t("calendar.newEvent")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Start</label>
              <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">End</label>
              <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn("h-7 w-7 rounded-full", form.color === c && "ring-2 ring-offset-2 ring-blue-500")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            {editing ? (
              <IconButton
                icon={Trash2}
                label={t("common.delete")}
                variant="danger"
                onClick={handleDelete}
              />
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
