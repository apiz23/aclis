"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvaluationDetail {
  id: string;
  leader_id: string;
  leader_name: string | null;
  period: string | null;
  total: number | null;
  ulasan: string | null;
  scores: Record<string, number>;
}

const SCORE_LABELS: Record<string, string> = {
  Akhlak:             "Akhlak",
  "Mutu Kerja":       "Mutu Kerja",
  Minat:              "Minat",
  Kebolehpercayaan:   "Kebolehpercayaan",
  Komunikasi:         "Komunikasi",
  Inisiatif:          "Inisiatif",
};

const MAX_PER_CRITERION = 10;
const MAX_SCORE = 60;

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 py-2.5 border-b last:border-0">
      <p className="text-sm w-40 shrink-0">{label}</p>
      <Progress value={(value / MAX_PER_CRITERION) * 100} className="flex-1 h-1.5" />
      <p className="text-sm font-medium tabular-nums w-12 text-right">
        {value} / {MAX_PER_CRITERION}
      </p>
    </div>
  );
}

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet(`/evaluations/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const pct = data?.total != null ? (data.total / MAX_SCORE) * 100 : 0;

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/evaluations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-56" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {data?.leader_name ?? "Penilaian"}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            {loading ? "—" : `Tempoh: ${data?.period ?? "—"}`}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data penilaian.</p>}

      {/* Total score card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jumlah Markah</p>
          {loading ? <Skeleton className="h-12 w-24" /> : (
            <p className="font-heading text-5xl font-bold tabular-nums">
              {data?.total ?? 0}
              <span className="text-xl text-muted-foreground font-normal"> / {MAX_SCORE}</span>
            </p>
          )}
        </div>
        <div className="flex-1 w-full">
          <Progress value={loading ? 0 : pct} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-1.5 text-right tabular-nums">
            {loading ? "—" : `${pct.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Pecahan Markah</p>
        </div>
        <div className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : data?.scores && Object.keys(data.scores).length > 0 ? (
            Object.entries(data.scores).map(([key, val]) => (
              <ScoreRow
                key={key}
                label={SCORE_LABELS[key] ?? key}
                value={typeof val === "number" ? val : 0}
              />
            ))
          ) : (
            <p className="py-4 text-sm text-muted-foreground italic">Tiada pecahan markah.</p>
          )}
        </div>
      </div>

      {/* Ulasan */}
      {!loading && data?.ulasan && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Ulasan</p>
          </div>
          <div className="p-5">
            <p className="text-sm leading-relaxed">{data.ulasan}</p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
