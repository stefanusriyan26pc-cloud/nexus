"use client";

import { usePatchProfile, useProfile } from "@/components/layout/profile-provider";
import { useCurrencyRates } from "@/components/providers/currency-provider";
import { createClient } from "@/lib/supabase/client";
import { useCallback } from "react";

export function useCurrencyPreference() {
  const profile = useProfile();
  const patchProfile = usePatchProfile();
  const { refreshRates } = useCurrencyRates();
  const currency = profile?.currency ?? "IDR";

  const changeCurrency = useCallback(
    async (next: string) => {
      if (next === currency || !profile) return;
      patchProfile({ currency: next });
      const supabase = createClient();
      await supabase.from("profiles").update({ currency: next }).eq("id", profile.id);
      // Always pull a fresh rate the moment the display currency changes.
      refreshRates();
    },
    [currency, profile, patchProfile, refreshRates]
  );

  return { currency, changeCurrency };
}
