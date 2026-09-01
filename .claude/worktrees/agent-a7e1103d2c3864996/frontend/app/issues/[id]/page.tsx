"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface IssueDetail {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
  coords: string | null;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; cls: string }> = {
  open:        { label: "Terbuka",      cls: "bg-primary/10 text-primary" },
  in_progress: { label: "Dalam Proses", cls: "bg-[var(--warning-bg)] text-[var(--warning)]" },
  resolved:    { label: "Selesai",      cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  closed:      { label: "Ditutup",      cls: "bg-muted text-muted-foreground" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  open:        [{ label: "Proses",  next: "in_progress" }],
  in_progress: [{ label: "Selesai", next: "resolved" }, { label: "Tutup", next: "closed" }],
  resolved:    [{ label: "Tutup",   next: "closed" }],
  closed:      [],
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function IssueDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]         = useState<IssueDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [updating, setUpdating] = useState(false);

  function load() {
    setLoading(true);
    apiGet(`/issues/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: s }) => {
      const role = (s.session?.user?.app_metadata as Record<string,string> | undefined)?.role;
      setIsAdmin(role === "admin_daerah");
    });
  }, [id]);

  async function handleStatusChange(next: string) {
    setUpdating(true);
    try {
      const updated: IssueDetail = await apiPatch(`/issues/${id}`, { status: next });
      setData(updated);
    } catch {
      alert("Gagal kemaskini status.");
    } finally {
      setUpdating(false);
    }
  }

  const statusConfig = STATUS_CONFIG[data?.status as IssueStatus] ?? STATUS_CONFIG.open;
  const transitions  = STATUS_TRANSITIONS[data?.status ?? "open"] ?? [];

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/issues")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {data?.type ?? "Isu"} — {data?.kampung_name ?? "—"}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Isu Komuniti</p>
        </div>
        {!loading && data && (
          <span className={`ml-auto inline-flex items-center rounded px-2.5 py-1 text-xs font-medium ${statusConfig.cls}`}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data isu.</p>}

      {/* Status actions — admin only */}
      {isAdmin && !loading && data && transitions.length > 0 && (
        <div className="flex gap-2">
          {transitions.map(({ label, next }) => (
            <Button
              key={next}
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(next)}
              disabled={updating}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Maklumat Isu</p>
        </div>
        <div className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <Field label="Kampung" value={data?.kampung_name} />
              <Field label="Jenis Isu" value={data?.type} />
              <Field label="Lokasi" value={data?.location} />
              <Field label="Koordinat" value={data?.coords} />
              <Field label="Kategori AI" value={data?.ai_category} />
              <Field label="Status" value={
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                  {statusConfig.label}
                </span>
              } />
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Penerangan</p>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Tiada penerangan.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
