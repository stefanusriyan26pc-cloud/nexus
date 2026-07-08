"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useEffect, useState } from "react";

const themes = [
  { id: "light", icon: Sun },
  { id: "dark", icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {themes.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition-colors",
            theme === id
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          )}
        >
          <Icon className="h-4 w-4" />
          {t(`theme.${id}`)}
        </button>
      ))}
    </div>
  );
}
