"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/types/database";
import { format, parseISO } from "date-fns";
import { Calendar, GripVertical } from "lucide-react";
import { useState } from "react";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "border-slate-300" },
  { id: "in_progress", label: "In Progress", color: "border-amber-400" },
  { id: "done", label: "Done", color: "border-emerald-400" },
];

const priorityColors = {
  low: "default" as const,
  medium: "warning" as const,
  high: "danger" as const,
};

function SortableTask({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { task } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 touch-none cursor-grab p-1 -m-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0" onClick={onClick}>
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={priorityColors[task.priority]}>{task.priority}</Badge>
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Calendar className="h-3 w-3" />
                {format(parseISO(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="rotate-1 rounded-lg border border-blue-300 bg-white p-3 shadow-lg dark:border-blue-600 dark:bg-slate-800">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
    </div>
  );
}

export function TaskKanban({
  tasks,
  onUpdate,
  onEdit,
}: {
  tasks: Task[];
  onUpdate: (tasks: Task[]) => void;
  onEdit: (task: Task) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newStatus: TaskStatus = task.status;
    const overData = over.data.current;

    if (overData?.type === "column") {
      newStatus = overData.status as TaskStatus;
    } else if (overData?.task) {
      newStatus = (overData.task as Task).status;
    } else {
      const overId = over.id as string;
      if (["todo", "in_progress", "done"].includes(overId)) {
        newStatus = overId as TaskStatus;
      }
    }

    if (newStatus === task.status) return;

    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    onUpdate(updated);

    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map(({ id, label, color }) => {
          const columnTasks = tasks
            .filter((t) => t.status === id)
            .sort((a, b) => a.position - b.position);

          return (
            <KanbanColumn
              key={id}
              status={id}
              label={label}
              color={color}
              tasks={columnTasks}
              onEdit={onEdit}
            />
          );
        })}
      </div>
      <DragOverlay>{activeTask && <TaskCardOverlay task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  label,
  color,
  tasks,
  onEdit,
}: {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] flex-col rounded-xl border-t-4 ${color} bg-slate-100/80 dark:bg-slate-900/60`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-3 pb-3 flex-1">
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} onClick={() => onEdit(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
