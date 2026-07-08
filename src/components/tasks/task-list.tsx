"use client";

import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import type { Task, TaskStatus } from "@/types/database";
import { format, parseISO } from "date-fns";
import { Calendar, CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/components/providers/i18n-provider";

const priorityColors = {
  low: "default" as const,
  medium: "warning" as const,
  high: "danger" as const,
};

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function TaskList({
  tasks,
  onUpdate,
  onEdit,
}: {
  tasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  onEdit: (task: Task) => void;
}) {
  const { t } = useTranslation();

  const toggleDone = async (task: Task) => {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, status: newStatus } : t
    );
    onUpdate(updated);
    const supabase = createClient();
    await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
  };

  const deleteTask = async (id: string) => {
    onUpdate(tasks.filter((t) => t.id !== id));
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", id);
  };

  if (tasks.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No tasks yet.</p>
    );
  }

  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
          <button onClick={() => toggleDone(task)} className="shrink-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
            {task.status === "done" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${task.status === "done" ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
              {task.title}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
              <span className="text-xs text-slate-400 dark:text-slate-500">{statusLabels[task.status]}</span>
              {task.due_date && (
                <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(task.due_date), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IconButton icon={Pencil} label={t("common.edit")} onClick={() => onEdit(task)} />
            <IconButton
              icon={Trash2}
              label={t("common.delete")}
              onClick={() => deleteTask(task.id)}
              className="text-red-400 hover:text-red-500 dark:hover:text-red-300"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
