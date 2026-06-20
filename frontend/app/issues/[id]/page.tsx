"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet(`/issues/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const statusConfig = STATUS_CONFIG[data?.status as IssueStatus] ?? STATUS_CONFIG.open;

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

      {/* Description */}
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
