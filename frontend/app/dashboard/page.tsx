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
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="font-heading text-3xl font-bold tabular-nums tracking-tight">
            {value}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
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

      <div className="rounded-lg border border-dashed bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Carta dan analisis AI akan tersedia selepas import data selesai
        </p>
      </div>
    </AppLayout>
  );
}
