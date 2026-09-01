"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { UserCircle } from "lucide-react";

interface MeResponse {
  id: string;
  email: string | null;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [me, setMe]           = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const initials = me?.email
    ? me.email.slice(0, 2).toUpperCase()
    : "?";

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Profil Saya</h1>
        <p className="text-sm text-muted-foreground">Maklumat akaun anda</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar block */}
        <div className="flex flex-col items-center gap-3 sm:w-40 shrink-0">
          <Avatar className="h-24 w-24 rounded-xl">
            <AvatarFallback className="rounded-xl text-2xl font-bold bg-primary/10 text-primary">
              {loading ? <UserCircle className="h-10 w-10 opacity-40" /> : initials}
            </AvatarFallback>
          </Avatar>
          {loading ? (
            <Skeleton className="h-5 w-28" />
          ) : (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              {ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—"}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Maklumat Akaun</p>
          </div>
          <div className="px-5">
            {loading ? (
              <div className="py-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                <Field label="E-mel" value={me?.email} />
                <Field label="Peranan" value={ROLE_LABEL[me?.role ?? ""] ?? me?.role} />
                <Field label="ID Pengguna" value={
                  <span className="font-mono text-xs text-muted-foreground">{me?.id}</span>
                } />
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
