"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { MapPin, ArrowLeft, Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KampungDetail {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
  resident_count: number;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function KampungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]     = useState<KampungDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    apiGet(`/kampung/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/kampung")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {data?.name ?? "Kampung"}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Profil Kampung</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">Gagal memuatkan data kampung.</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Stats */}
        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bil. B40</p>
            {loading ? <Skeleton className="h-7 w-12 mt-1" /> : (
              <p className="font-heading text-2xl font-bold tabular-nums">{data?.b40_count ?? 0}</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Penduduk Berdaftar</p>
            {loading ? <Skeleton className="h-7 w-12 mt-1" /> : (
              <p className="font-heading text-2xl font-bold tabular-nums">{data?.resident_count ?? 0}</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Mukim</p>
            {loading ? <Skeleton className="h-5 w-24 mt-1" /> : (
              <p className="text-sm font-medium">{data?.mukim_name ?? "—"}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Maklumat Kampung</p>
        </div>
        <div className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <Field label="Nama Kampung" value={data?.name} />
              <Field label="Mukim" value={data?.mukim_name} />
              <Field label="Profil" value={data?.profile} />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
