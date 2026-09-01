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
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

interface EvaluationDetail {
  id: string;
  leader_id: string;
  leader_name: string | null;
  period: string | null;
  total: number | null;
  ulasan: string | null;
  scores: Record<string, number>;
}

const MAX_SCORE = 60;

const scoreChartConfig: ChartConfig = {
  nilai: { label: "Markah", color: "var(--chart-1)" },
};

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

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Pecahan Markah</p>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : data?.scores && Object.keys(data.scores).length > 0 ? (
          <div className="p-4">
            <ChartContainer config={scoreChartConfig} className="h-[220px] w-full">
              <BarChart
                data={Object.entries(data.scores).map(([key, val]) => ({
                  kriteria: key,
                  nilai: typeof val === "number" ? val : 0,
                }))}
                margin={{ left: 0, right: 8, top: 16 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="kriteria" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="nilai" fill="var(--chart-1)" radius={4} label={{ position: "top", fontSize: 10 }} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground italic">Tiada pecahan markah.</p>
        )}
      </div>

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
