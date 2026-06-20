"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { apiGet } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, FileText, AlertCircle } from "lucide-react";

interface MeResponse {
  id: string;
  email: string | null;
  role: string;
}

interface Stats {
  kampung_count: number;
  leader_count: number;
  pending_reports: number;
  open_issues: number;
}

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

function StatCard({ label, icon: Icon, value, sub, loading }: {
  label: string;
  icon: React.ElementType;
  value: number;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="border bg-card p-5 flex flex-col gap-2.5">
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

export default function DashboardPage() {
  const [me, setMe]         = useState<MeResponse | null>(null);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet("/me").catch(() => null),
      apiGet("/stats").catch(() => null),
    ]).then(([meData, statsData]) => {
      setMe(meData);
      setStats(statsData);
      setLoading(false);
    });
  }, []);

  const STAT_CARDS = [
    { label: "Jumlah Kampung",   icon: MapPin,      value: stats?.kampung_count ?? 0,    sub: "Dalam daerah Pontian" },
    { label: "Jumlah Pemimpin",  icon: Users,       value: stats?.leader_count ?? 0,     sub: "Ketua Kampung & Penghulu" },
    { label: "Laporan Tertunda", icon: FileText,    value: stats?.pending_reports ?? 0,  sub: "Menunggu penghantaran" },
    { label: "Isu Terbuka",      icon: AlertCircle, value: stats?.open_issues ?? 0,      sub: "Memerlukan perhatian" },
  ];

  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Papan Pemuka
        </h1>
        {loading ? (
          <Skeleton className="h-4 w-52" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Log masuk sebagai{" "}
            <span className="font-medium text-foreground">{me?.email ?? "—"}</span>
            {" · "}
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
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

      <div className="border border-dashed bg-card p-10 flex flex-col items-start gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Analisis AI
        </p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Carta prestasi dan laporan AI akan tersedia selepas import data Excel selesai.
        </p>
      </div>
    </AppLayout>
  );
}
