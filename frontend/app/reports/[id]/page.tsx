"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportDetail {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  period: string;
  status: string;
  submitted_at: string | null;
  content: string | null;
}

type ReportStatus = "submitted" | "draft" | "late";

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  submitted: { label: "Dihantar", cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  draft:     { label: "Draf",     cls: "bg-muted text-muted-foreground" },
  late:      { label: "Lewat",    cls: "bg-destructive/10 text-destructive" },
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet(`/reports/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const statusConfig = STATUS_CONFIG[data?.status as ReportStatus] ?? STATUS_CONFIG.draft;

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {data?.kampung_name ?? "Laporan"} · {data?.period}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Laporan Bulanan</p>
        </div>
        {!loading && data && (
          <span className={`ml-auto inline-flex items-center rounded px-2.5 py-1 text-xs font-medium ${statusConfig.cls}`}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan laporan.</p>}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Maklumat Laporan</p>
        </div>
        <div className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <Field label="Kampung" value={data?.kampung_name} />
              <Field label="Tempoh" value={data?.period} />
              <Field label="Status" value={
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                  {statusConfig.label}
                </span>
              } />
              <Field label="Tarikh Dihantar" value={data?.submitted_at ? data.submitted_at.slice(0, 10) : null} />
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Kandungan Laporan</p>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Tiada kandungan laporan.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
