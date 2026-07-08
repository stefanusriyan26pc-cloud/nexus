"use client";

import { Header } from "@/components/layout/header";
import { usePatchProfile, useProfile } from "@/components/layout/profile-provider";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  Camera, CheckCircle2, MapPin, NotebookPen, Trash2, User,
  CalendarDays, Shield, Mail,
} from "lucide-react";
import { useRef, useState } from "react";

export default function ProfilePage() {
  const profile = useProfile();
  const patchProfile = usePatchProfile();
  const { t } = useTranslation();
  const [fullName, setFullName]   = useState(profile?.full_name ?? "");
  const [bio, setBio]             = useState(profile?.bio ?? "");
  const [location, setLocation]   = useState(profile?.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      patchProfile({ avatar_url: url });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAvatarDelete = async () => {
    if (!profile || !avatarUrl) return;
    setUploading(true);
    const supabase = createClient();
    const { data: files } = await supabase.storage.from("avatars").list(profile.id);
    if (files?.length) {
      await supabase.storage.from("avatars").remove(files.map((f) => `${profile.id}/${f.name}`));
    }
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    patchProfile({ avatar_url: null });
    setAvatarUrl("");
    setUploading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ full_name: fullName, bio, location }).eq("id", profile.id);
    patchProfile({ full_name: fullName, bio, location });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = fullName
    ? fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? "?";

  const memberSince = profile?.created_at
    ? format(parseISO(profile.created_at), "MMMM yyyy")
    : null;

  return (
    <>
      <Header title={t("profile.title")} subtitle={t("profile.subtitle")} profile={profile} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* ── Hero banner ─────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 to-cyan-500 p-6 text-white">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-white/10 blur-xl" />
            <div className="relative flex items-center gap-5">
              <div className="relative shrink-0">
                <Avatar src={avatarUrl || null} name={fullName || profile?.email || ""} size="lg" className="ring-4 ring-white/30" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label={t("profile.changePhoto")}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-md hover:bg-blue-50 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{fullName || t("common.user")}</h2>
                <p className="text-sm text-blue-100">{profile?.email}</p>
                {bio && <p className="mt-1 line-clamp-2 text-xs text-blue-200">{bio}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-blue-200">
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{location}
                    </span>
                  )}
                  {memberSince && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />{t("profile.memberSince")} {memberSince}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {uploading && (
              <p className="mt-3 text-xs text-blue-200">{t("profile.uploading")}</p>
            )}
            {avatarUrl && !uploading && (
              <button
                type="button"
                onClick={handleAvatarDelete}
                className="mt-2 text-xs text-blue-200 hover:text-white underline"
              >
                {t("profile.removePhoto")}
              </button>
            )}
          </div>

          {/* ── Personal Information ─────────────────────────────────── */}
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-2 pb-1">
                <User className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t("profile.personalInfo")}
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("profile.fullNameLabel")}
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("profile.fullNameLabel")}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("profile.locationLabel")}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t("profile.locationPlaceholder")}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("profile.bioLabel")}
                </label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("profile.bioPlaceholder")}
                  rows={3}
                  className="resize-none"
                />
                <p className="mt-1 text-xs text-slate-400">{bio.length}/200</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("profile.emailLabel")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={profile?.email ?? ""}
                    disabled
                    className="bg-slate-50 pl-9 dark:bg-slate-800/50"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">{t("profile.emailHint")}</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("common.saved")}
                  </span>
                )}
                {!saved && <span />}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Account Info ─────────────────────────────────────────── */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t("profile.accountSection")}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-bold dark:bg-slate-700">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{fullName || t("common.user")}</p>
                      <p className="text-xs text-slate-500">{profile?.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Active
                  </span>
                </div>

                {memberSince && (
                  <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{t("profile.memberSince")}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{memberSince}</span>
                  </div>
                )}

                <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><NotebookPen className="h-3.5 w-3.5" />Language</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{profile?.language ?? "en"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </>
  );
}
