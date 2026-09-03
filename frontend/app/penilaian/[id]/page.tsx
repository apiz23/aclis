"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { toast } from "sonner";
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
  keupayaan_ulasan: string | null;
  potensi_ulasan: string | null;
  penilai_nama: string | null;
  penilai_no_kad: string | null;
  penilai_jawatan: string | null;
  penilai_lama_mengenali: string | null;
  penilai_tarikh: string | null;
  penilai_semula_nama: string | null;
  penilai_semula_no_kad: string | null;
  penilai_semula_jawatan: string | null;
  penilai_semula_tarikh: string | null;
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
  useEffect(() => {
    if (error) { toast.error("Rekod tidak ditemui atau akses ditolak."); router.replace("/penilaian"); }
  }, [error]);

  const pct = data?.total != null ? (data.total / MAX_SCORE) * 100 : 0;

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/penilaian")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-56" /> : (
            <h1 className="heading-page">
              {data?.leader_name ?? "Penilaian"}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            {loading ? "—" : `Tempoh: ${data?.period ?? "—"}`}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data penilaian.</p>}

      <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 ring-0 shadow-none rounded-lg">
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
              <Badge variant={pct >= 80 ? "success" : pct >= 60 ? "warning" : "destructive"}>
                {pct >= 80 ? "Cemerlang" : pct >= 60 ? "Memuaskan" : "Perlu Baik"}
              </Badge>
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
      </Card>

      <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
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
      </Card>

      {!loading && data?.ulasan && (
        <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Ulasan</p>
          </div>
          <CardContent className="p-5">
            <p className="text-sm leading-relaxed">{data.ulasan}</p>
          </CardContent>
        </Card>
      )}

      {!loading && (data?.keupayaan_ulasan || data?.potensi_ulasan) && (
        <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Penilaian Rasmi</p>
          </div>
          <CardContent className="px-5 space-y-4">
            {data?.keupayaan_ulasan && (
              <div className="py-3 border-b last:border-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">(a) Keupayaan menyandang terus jawatan ini</p>
                <p className="text-sm leading-relaxed">{data.keupayaan_ulasan}</p>
              </div>
            )}
            {data?.potensi_ulasan && (
              <div className="py-3 border-b last:border-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">(b) Potensi dalam kemajuan kerja</p>
                <p className="text-sm leading-relaxed">{data.potensi_ulasan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && data?.penilai_nama && (
        <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Pegawai Penilai</p>
          </div>
          <CardContent className="px-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="py-3 border-b">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Nama</p>
                <p className="text-sm">{data.penilai_nama}</p>
              </div>
              <div className="py-3 border-b">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">No. Kad Pengenalan</p>
                <p className="text-sm font-mono text-[13px]">{data.penilai_no_kad}</p>
              </div>
              <div className="py-3 border-b">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Jawatan</p>
                <p className="text-sm">{data.penilai_jawatan}</p>
              </div>
              <div className="py-3 border-b">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Lama Mengenali</p>
                <p className="text-sm">{data.penilai_lama_mengenali}</p>
              </div>
              <div className="py-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Tarikh</p>
                <p className="text-sm">{data.penilai_tarikh}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && data?.penilai_semula_nama && (
        <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Pegawai Penilai Semula</p>
          </div>
          <CardContent className="px-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="py-3 border-b">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Nama</p>
                <p className="text-sm">{data.penilai_semula_nama}</p>
              </div>
              <div className="py-3 border-b">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">No. Kad Pengenalan</p>
                <p className="text-sm font-mono text-[13px]">{data.penilai_semula_no_kad}</p>
              </div>
              <div className="py-3 border-b">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Jawatan</p>
                <p className="text-sm">{data.penilai_semula_jawatan}</p>
              </div>
              <div className="py-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Tarikh</p>
                <p className="text-sm">{data.penilai_semula_tarikh}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
