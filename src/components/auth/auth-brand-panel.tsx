"use client";

import { NexumLogo } from "@/components/brand/nexum-logo";
import { useTranslation } from "@/components/providers/i18n-provider";
import { CalendarDays, CheckSquare, Wallet } from "lucide-react";

export function AuthBrandPanel() {
  const { t } = useTranslation();

  const features = [
    { icon: CheckSquare, titleKey: "auth.featureTasks", descKey: "auth.featureTasksDesc" },
    { icon: CalendarDays, titleKey: "auth.featureSchedule", descKey: "auth.featureScheduleDesc" },
    { icon: Wallet, titleKey: "auth.featureFinance", descKey: "auth.featureFinanceDesc" },
  ] as const;

  return (
    <div className="relative hidden min-h-dvh overflow-hidden bg-slate-950 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[52%] lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-cyan-600/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/10 blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 p-10 xl:p-14">
        <NexumLogo size="lg" variant="light" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-10 xl:px-14">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-blue-300/80">
          {t("nav.tagline")}
        </p>
        <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
          {t("auth.brandHeadline")}{" "}
          <span className="bg-linear-to-r from-blue-300 via-sky-200 to-cyan-300 bg-clip-text text-transparent">
            {t("auth.brandHeadlineHighlight")}
          </span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
          {t("auth.brandSubtext")}
        </p>

        <div className="mt-10 space-y-3">
          {features.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                <Icon className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t(titleKey)}</p>
                <p className="text-xs text-slate-400">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 p-10 xl:p-14">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Nexum. {t("auth.brandCopyright")}
        </p>
      </div>
    </div>
  );
}

export function AuthMobileHeader() {
  return (
    <div className="mb-6 flex justify-center lg:hidden">
      <NexumLogo size="md" />
    </div>
  );
}
