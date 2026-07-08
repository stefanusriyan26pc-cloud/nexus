"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";

const financeTabs = [
  { href: "/finance/analytics", key: "financeNav.analytics" },
  { href: "/finance/income", key: "financeNav.income" },
  { href: "/finance/savings", key: "financeNav.savings" },
  { href: "/finance/wallets", key: "financeNav.wallets" },
] as const;

export function FinanceTopbar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex gap-1 overflow-x-auto px-4 sm:px-6">
        {financeTabs.map(({ href, key }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              {t(key)}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
