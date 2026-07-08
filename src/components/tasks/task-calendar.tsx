"use client";

import type { Task } from "@/types/database";
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
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TaskCalendar({
  tasks,
  onEdit,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const tasksForDay = (day: Date) =>
    tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day));

  const priorityDot = {
    low: "bg-slate-400",
    medium: "bg-amber-400",
    high: "bg-red-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDate(addDays(currentDate, -30))}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDate(addDays(currentDate, 30))}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayTasks = tasksForDay(day);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] border-b border-r border-slate-100 p-2 dark:border-slate-800",
                !inMonth && "bg-slate-50/50 dark:bg-slate-950/50"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-blue-600 font-semibold text-white",
                  !isToday(day) && inMonth && "text-slate-700 dark:text-slate-300",
                  !inMonth && "text-slate-300 dark:text-slate-600"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onEdit(task)}
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[task.priority])} />
                    <span className="truncate text-slate-700 dark:text-slate-300">{task.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="px-1 text-xs text-slate-400 dark:text-slate-500">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
