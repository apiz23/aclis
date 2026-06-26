"use client";

import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, FileText, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser, useStats, useInsights, useEvaluations } from "@/lib/queries";

interface StatusCount { status: string; count: number }
interface EvalSummary { id: string; leader_id: string; leader_name: string | null; period: string | null; total: number | null; ulasan: string | null }

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Terbuka", in_progress: "Dalam Proses", resolved: "Selesai", closed: "Ditutup",
  submitted: "Dihantar", draft: "Draf", late: "Lewat",
};

const issueChartConfig: ChartConfig = {
  count: { label: "Bilangan", color: "var(--chart-1)" },
};
const reportChartConfig: ChartConfig = {
  count: { label: "Bilangan", color: "var(--chart-2)" },
};

function StatCard({ label, icon: Icon, value, sub, loading }: {
  label: string; icon: React.ElementType; value: number; sub: string; loading: boolean;
}) {
  return (
    <div className="border bg-card p-5 rounded-lg flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
        </div>
      </div>
      {loading ? <Skeleton className="h-10 w-20" /> : (
        <p className="font-heading text-[42px] leading-none font-bold tabular-nums tracking-tight">{value}</p>
      )}
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading: boolean }) {
  return (
    <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="p-4">
        {loading ? <Skeleton className="h-[180px] w-full" /> : children}
      </div>
    </div>
  );
}

const MAX_EVAL = 60;

export default function DashboardPage() {
  const { data: me, isLoading: meLoading }           = useCurrentUser();
  const { data: stats, isLoading: statsLoading }     = useStats();
  const { data: evData, isLoading: evLoading }       = useEvaluations();
  const { data: insightsData, isLoading: insightsLoading } = useInsights();

  const loading = meLoading || statsLoading || evLoading;

  const evals = evData
    ? [...(evData as EvalSummary[])].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).slice(0, 5)
    : [];

  const insights = insightsData?.insights ?? [];

  const issueData = ((stats as { issues_by_status?: StatusCount[] } | null)?.issues_by_status ?? []).map(s => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));
  const reportData = ((stats as { reports_by_status?: StatusCount[] } | null)?.reports_by_status ?? []).map(s => ({
    status: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));

  const s = stats as { kampung_count?: number; leader_count?: number; pending_reports?: number; open_issues?: number } | null;

  const STAT_CARDS = [
    { label: "Jumlah Kampung",   icon: MapPin,      value: s?.kampung_count ?? 0,    sub: "Dalam daerah Pontian" },
    { label: "Jumlah Pemimpin",  icon: Users,       value: s?.leader_count ?? 0,     sub: "Ketua Kampung & Penghulu" },
    { label: "Laporan Tertunda", icon: FileText,    value: s?.pending_reports ?? 0,  sub: "Menunggu penghantaran" },
    { label: "Isu Terbuka",      icon: AlertCircle, value: s?.open_issues ?? 0,      sub: "Memerlukan perhatian" },
  ];

  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Papan Pemuka</h1>
        {loading ? <Skeleton className="h-4 w-52" /> : (
          <p className="text-sm text-muted-foreground">
            Log masuk sebagai{" "}
            <span className="font-medium text-foreground">{me?.email ?? "—"}</span>
            {" · "}
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              {ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—"}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Status Isu Komuniti" loading={statsLoading}>
          {issueData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Tiada data isu.</p>
          ) : (
            <ChartContainer config={issueChartConfig} className="h-[180px] w-full">
              <BarChart data={issueData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Status Laporan Bulanan" loading={statsLoading}>
          {reportData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Tiada data laporan.</p>
          ) : (
            <ChartContainer config={reportChartConfig} className="h-[180px] w-full">
              <BarChart data={reportData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Prestasi Pemimpin Terbaik</p>
          </div>
          <div className="p-4 space-y-3">
            {evLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : evals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tiada data penilaian.</p>
            ) : evals.map((ev, i) => (
              <div key={ev.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ev.leader_name ?? "—"}</p>
                  <Progress value={ev.total != null ? (ev.total / MAX_EVAL) * 100 : 0} className="h-1.5 mt-1" />
                </div>
                <span className="text-sm font-bold tabular-nums text-primary shrink-0">
                  {ev.total ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Analisis AI</p>
            <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">JamAI</span>
          </div>
          <div className="p-4">
            {insightsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : insights.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Konfigurasikan JAMAI_TOKEN dan JAMAI_PROJECT_ID untuk mendapatkan analisis AI.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {insights.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    <span className="text-foreground/80">{line.replace(/^\d+\.\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
