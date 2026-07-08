import { AuthBrandPanel, AuthMobileHeader } from "@/components/auth/auth-brand-panel";
import { AuthTopBar } from "@/components/auth/auth-top-bar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <AuthTopBar />
      <AuthBrandPanel />

      <div className="flex min-h-dvh flex-col lg:ml-[52%]">
        <div className="flex flex-1 flex-col justify-center overflow-y-auto bg-linear-to-br from-slate-50 via-white to-blue-50/30 px-6 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:px-10 lg:px-16 xl:px-24">
          <AuthMobileHeader />

          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>

            {children}

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
