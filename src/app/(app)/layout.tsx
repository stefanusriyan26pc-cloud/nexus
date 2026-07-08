import { AppShell } from "@/components/layout/app-shell";
import { ProfileProvider } from "@/components/layout/profile-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { LocaleSync } from "@/components/providers/locale-sync";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <ProfileProvider profile={profile}>
      <CurrencyProvider>
        <LocaleSync language={profile?.language} />
        <AppShell>{children}</AppShell>
      </CurrencyProvider>
    </ProfileProvider>
  );
}
