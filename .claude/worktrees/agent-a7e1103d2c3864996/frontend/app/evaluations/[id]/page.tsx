"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";

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

const scoreChartConfig: ChartConfig = {
  score: { label: "Markah" },
};

function scoreBarColor(value: number): string {
  const pct = (value / MAX_PER_CRITERION) * 100;
  if (pct >= 80) return "var(--chart-2)";
  if (pct >= 60) return "var(--chart-3)";
  return "var(--chart-5)";
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
            <div className="flex items-end gap-2">
              <p className={`font-heading text-5xl font-bold tabular-nums ${
                pct >= 80 ? "text-[var(--success)]" : pct >= 60 ? "text-[var(--warning)]" : "text-destructive"
              }`}>
                {data?.total ?? 0}
                <span className="text-xl text-muted-foreground font-normal"> / {MAX_SCORE}</span>
              </p>
              <span className={`mb-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
                pct >= 80
                  ? "bg-[var(--success-bg)] text-[var(--success)]"
                  : pct >= 60
                  ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {pct >= 80 ? "Cemerlang" : pct >= 60 ? "Memuaskan" : "Perlu Baik"}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 w-full">
          <Progress
            value={loading ? 0 : pct}
            className={`h-2.5 ${
              !loading && (pct >= 80
                ? "[&>div]:bg-[var(--success)]"
                : pct >= 60
                ? "[&>div]:bg-[var(--warning)]"
                : "[&>div]:bg-destructive")
            }`}
          />
          <p className="text-xs text-muted-foreground mt-1.5 text-right tabular-nums">
            {loading ? "—" : `${pct.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Score breakdown chart */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Pecahan Markah</p>
        </div>
        <div className="p-4">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : data?.scores && Object.keys(data.scores).length > 0 ? (() => {
            const chartData = Object.entries(data.scores).map(([key, val]) => ({
              criterion: SCORE_LABELS[key] ?? key,
              score: typeof val === "number" ? val : 0,
              key,
            }));
            return (
              <ChartContainer config={scoreChartConfig} className="h-48 w-full">
                <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
                  <XAxis
                    dataKey="criterion"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis domain={[0, MAX_PER_CRITERION]} hide />
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel />}
                    formatter={(value) => [`${value} / ${MAX_PER_CRITERION}`, "Markah"]}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={scoreBarColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            );
          })() : (
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
