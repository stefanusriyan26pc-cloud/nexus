"use client";

import { NexumLogo, NexumMark } from "@/components/brand/nexum-logo";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { useTranslation } from "@/components/providers/i18n-provider";
import { IconButton } from "@/components/ui/icon-button";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/tasks", key: "nav.tasks", icon: CheckSquare },
  { href: "/notes", key: "nav.notes", icon: NotebookPen },
  { href: "/calendar", key: "nav.calendar", icon: CalendarDays },
  { href: "/finance", key: "nav.finance", icon: Wallet },
  { href: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isMobile, isOpen, isCollapsed, close, toggleCollapse } = useSidebar();

  useEffect(() => {
    if (isMobile) {
      close();
    }
  }, [pathname, isMobile, close]);

  const showLabels = isMobile || !isCollapsed;
  const sidebarWidth = showLabels ? "w-64" : "w-[4.5rem]";

  return (
    <>
      {isMobile && isOpen && (
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          "flex h-full flex-col border-r border-slate-800/80 bg-slate-950 transition-[width,transform] duration-300 ease-in-out",
          isMobile
            ? cn(
                "fixed inset-y-0 left-0 z-50 w-64 shadow-2xl",
                isOpen ? "translate-x-0" : "-translate-x-full"
              )
            : cn("relative shrink-0", sidebarWidth)
        )}
      >
        <div
          className={cn(
            "relative flex h-14 shrink-0 items-center border-b border-slate-800/80 sm:h-16",
            showLabels ? "justify-between px-4" : "justify-center px-2"
          )}
        >
          {showLabels ? (
            <NexumLogo size="sm" variant="light" />
          ) : (
            <NexumMark size={28} />
          )}

          {isMobile ? (
            <IconButton
              icon={X}
              label={t("nav.closeMenu")}
              onClick={close}
              className="text-slate-400 hover:text-white"
            />
          ) : (
            <IconButton
              icon={isCollapsed ? ChevronRight : ChevronLeft}
              label={
                isCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")
              }
              onClick={toggleCollapse}
              className={cn(
                "text-slate-400 hover:text-white",
                isCollapsed && "absolute -right-3 top-5 z-10 rounded-full border border-slate-700 bg-slate-900 shadow-md"
              )}
            />
          )}
        </div>

        <nav
          className={cn(
            "flex-1 space-y-1 overflow-y-auto p-3",
            !showLabels && "px-2"
          )}
        >
          {navItems.map(({ href, key, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);
            const label = t(key);

            return (
              <Link
                key={href}
                href={href}
                title={!showLabels ? label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  showLabels ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {showLabels && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "shrink-0 border-t border-slate-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            !showLabels && "text-center"
          )}
        >
          {showLabels ? (
            <p className="text-xs text-slate-500">
              {t("nav.version")} {APP_VERSION}
            </p>
          ) : (
            <p className="text-[10px] leading-tight text-slate-500">v{APP_VERSION}</p>
          )}
        </div>
      </aside>
    </>
  );
}
