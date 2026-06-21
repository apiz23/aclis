"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { apiGet } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar, BarChart, XAxis, YAxis, Cell,
} from "recharts";
import {
  Users, MapPin, FileText, AlertCircle, Sparkles, TrendingUp,
} from "lucide-react";

interface MeResponse { id: string; email: string | null; role: string }
interface StatusCount { status: string; count: number }
interface StatsExtended {
  kampung_count: number;
  leader_count: number;
  pending_reports: number;
  open_issues: number;
  issues_by_status: StatusCount[];
  reports_by_status: StatusCount[];
}
interface LeaderSummary {
  id: string; name: string; type: string;
  kampung_name: string | null; photo_url: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

const ISSUE_STATUS_LABEL: Record<string, string> = {
  open: "Terbuka", in_progress: "Dalam Proses", resolved: "Selesai", closed: "Ditutup",
};
const REPORT_STATUS_LABEL: Record<string, string> = {
  draft: "Draf", submitted: "Dihantar", late: "Lewat",
};
const LEADER_TYPE_LABEL: Record<string, string> = {
  ketua_kampung: "Ketua Kampung", penghulu: "Penghulu",
};
const LEADER_AVATAR_BG: Record<string, string> = {
  ketua_kampung: "bg-primary/15 text-primary",
  penghulu:      "bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]",
};

const issueChartConfig: ChartConfig = {
  count: { label: "Jumlah" },
};
const reportChartConfig: ChartConfig = {
  count: { label: "Jumlah" },
};

const ISSUE_COLORS: Record<string, string> = {
  open:        "var(--chart-1)",
  in_progress: "var(--chart-3)",
  resolved:    "var(--chart-2)",
  closed:      "var(--chart-4)",
};
const REPORT_COLORS: Record<string, string> = {
  submitted: "var(--chart-2)",
  draft:     "var(--chart-4)",
  late:      "var(--chart-5)",
};

function StatCard({ label, icon: Icon, value, sub, loading }: {
  label: string; icon: React.ElementType; value: number; sub: string; loading: boolean;
}) {
  return (
    <div className="border bg-card p-5 rounded-lg flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-10 w-20 mt-1" />
      ) : (
        <p className="font-heading text-[42px] leading-none font-bold tabular-nums tracking-tight">
          {value}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function StatusBarChart({
  data, labelMap, colorMap, config, loading,
}: {
  data: StatusCount[];
  labelMap: Record<string, string>;
  colorMap: Record<string, string>;
  config: ChartConfig;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-36 w-full" />;
  if (!data.length) return (
    <p className="text-sm text-muted-foreground py-8 text-center">Tiada data</p>
  );
  const chartData = data.map((d) => ({
    status: labelMap[d.status] ?? d.status,
    count: d.count,
    key: d.status,
  }));
  return (
    <ChartContainer config={config} className="h-36 w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="status"
          tick={{ fontSize: 11 }}
          width={82}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" radius={4}>
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={colorMap[entry.key] ?? "var(--chart-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export default function DashboardPage() {
  const [me, setMe]           = useState<MeResponse | null>(null);
  const [stats, setStats]     = useState<StatsExtended | null>(null);
  const [leaders, setLeaders] = useState<LeaderSummary[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet("/me").catch(() => null),
      apiGet("/stats").catch(() => null),
      apiGet("/leaders").catch(() => []),
    ]).then(([meData, statsData, leadersData]) => {
      setMe(meData);
      setStats(statsData);
      setLeaders((leadersData as LeaderSummary[] ?? []).slice(0, 5));
      setLoading(false);
    });

    apiGet("/stats/insights")
      .then((d: { insights: string[] }) => setInsights(d.insights ?? []))
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, []);

  const STAT_CARDS = [
    { label: "Jumlah Kampung",   icon: MapPin,      value: stats?.kampung_count ?? 0,   sub: "Dalam daerah Pontian" },
    { label: "Jumlah Pemimpin",  icon: Users,       value: stats?.leader_count ?? 0,    sub: "Ketua Kampung & Penghulu" },
    { label: "Laporan Tertunda", icon: FileText,    value: stats?.pending_reports ?? 0, sub: "Menunggu penghantaran" },
    { label: "Isu Terbuka",      icon: AlertCircle, value: stats?.open_issues ?? 0,     sub: "Memerlukan perhatian" },
  ];

  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Papan Pemuka</h1>
        {loading ? (
          <Skeleton className="h-4 w-52" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Log masuk sebagai{" "}
            <span className="font-medium text-foreground">{me?.email ?? "—"}</span>
            {" · "}
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              {ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—"}
            </span>
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border bg-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm font-semibold">Isu Mengikut Status</p>
          </div>
          <div className="p-4">
            <StatusBarChart
              data={stats?.issues_by_status ?? []}
              labelMap={ISSUE_STATUS_LABEL}
              colorMap={ISSUE_COLORS}
              config={issueChartConfig}
              loading={loading}
            />
          </div>
        </div>

        <div className="border bg-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm font-semibold">Laporan Mengikut Status</p>
          </div>
          <div className="p-4">
            <StatusBarChart
              data={stats?.reports_by_status ?? []}
              labelMap={REPORT_STATUS_LABEL}
              colorMap={REPORT_COLORS}
              config={reportChartConfig}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Leaders + AI Insights row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top leaders */}
        <div className="border bg-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm font-semibold">Pemimpin Terbaru</p>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leaders.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Belum ada data pemimpin.</p>
            ) : (
              leaders.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar className="h-8 w-8">
                    {l.photo_url && <AvatarImage src={l.photo_url} alt={l.name} />}
                    <AvatarFallback className={`text-xs font-semibold ${LEADER_AVATAR_BG[l.type] ?? "bg-muted text-muted-foreground"}`}>
                      {l.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {LEADER_TYPE_LABEL[l.type] ?? l.type}
                      {l.kampung_name ? ` · ${l.kampung_name}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="border bg-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-semibold">Analisis AI</p>
            <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">
              JamAI
            </span>
          </div>
          <div className="p-5">
            {insightsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <div className="flex flex-col items-start gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Tiada analisis AI. Pastikan <code className="text-xs font-mono bg-muted px-1 rounded">AI_PROVIDER=jamai</code> dikonfigurasikan dalam <code className="text-xs font-mono bg-muted px-1 rounded">.env</code>.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {insights.map((insight, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-foreground leading-relaxed">{insight}</span>
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
