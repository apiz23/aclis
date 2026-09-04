"use client";

import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, FileText, AlertCircle, Sparkles, AlertTriangle } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useCurrentUser, useStats, useInsights, useEvaluations } from "@/lib/queries";
import { KampungMap } from "@/components/kampung-map";

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
    <div className="stat-card flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {loading ? <Skeleton className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {loading ? <Skeleton className="h-3 w-28" /> : (
          <p className="label-xs">{label}</p>
        )}
      </div>
      {loading ? <Skeleton className="h-10 w-16" /> : (
        <p className="stat-number">{value}</p>
      )}
      {loading ? <Skeleton className="h-3 w-36" /> : (
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, loading }: { title: string; icon: React.ElementType; children: React.ReactNode; loading: boolean }) {
  return (
    <Card className="rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        <p className="heading-section">{title}</p>
      </div>
      <CardContent className="p-4">
        {loading ? <Skeleton className="h-[180px] w-full" /> : children}
      </CardContent>
    </Card>
  );
}

const MAX_EVAL = 56;

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

  const lateCount = ((stats as { reports_by_status?: StatusCount[] } | null)?.reports_by_status ?? [])
    .find(s => s.status === "late")?.count ?? 0;

  const STAT_CARDS = [
    { label: "Jumlah Kampung",   icon: MapPin,      value: s?.kampung_count ?? 0,    sub: "Dalam daerah Pontian" },
    { label: "Jumlah Pemimpin",  icon: Users,       value: s?.leader_count ?? 0,     sub: "Ketua Kampung & Penghulu" },
    { label: "Laporan Tertunda", icon: FileText,    value: s?.pending_reports ?? 0,  sub: "Menunggu penghantaran" },
    { label: "Isu Terbuka",      icon: AlertCircle, value: s?.open_issues ?? 0,      sub: "Memerlukan perhatian" },
  ];

  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="heading-page">Papan Pemuka</h1>
        {loading ? <Skeleton className="h-4 w-52" /> : (
          <p className="text-sm text-muted-foreground">
            Log masuk sebagai{" "}
            <span className="font-medium text-foreground">{me?.email ?? "—"}</span>
            {" · "}
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—"}
            </Badge>
          </p>
        )}
      </div>

      {!statsLoading && lateCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <AlertTitle>
            <span className="font-semibold">{lateCount} laporan lewat</span>
            <span className="text-muted-foreground font-normal"> belum dihantar. </span>
            <Link href="/laporan" className="underline underline-offset-2 font-medium hover:opacity-80">
              Semak laporan
            </Link>
          </AlertTitle>
        </Alert>
      )}

      <div className="stats-grid max-sm:grid-cols-1 sm:max-xl:grid-cols-2">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      <Card className="rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <p className="heading-section">Peta Kampung</p>
        </div>
        <CardContent className="p-0">
          <KampungMap height={340} showFilterHint />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        <ChartCard title="Status Isu Komuniti" icon={AlertCircle} loading={statsLoading}>
          {issueData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Tiada data isu.</p>
          ) : (
            <ChartContainer config={issueChartConfig} className="h-[180px] w-full">
              <BarChart data={issueData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={0} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Status Laporan Bulanan" icon={FileText} loading={statsLoading}>
          {reportData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Tiada data laporan.</p>
          ) : (
            <ChartContainer config={reportChartConfig} className="h-[180px] w-full">
              <BarChart data={reportData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={0} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        <Card className="rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="heading-section">Prestasi Pemimpin Terbaik</p>
          </div>
          <CardContent className="p-4 space-y-3">
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
          </CardContent>
        </Card>

        <Card className="rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--gold)]" />
            <p className="heading-section">Analisis AI</p>
            <Badge variant="secondary" className="ml-auto text-[10px] uppercase tracking-wide font-semibold">AI</Badge>
          </div>
          <CardContent className="p-4">
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
