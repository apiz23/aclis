"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { ClipboardList, Star } from "lucide-react";

interface EvaluationSummary {
  id: string; leader_id: string; leader_name: string | null;
  period: string | null; total: number | null; ulasan: string | null;
}

const MAX_SCORE = 60;

function scoreTier(total: number | null) {
  if (total == null) return { label: "—", cls: "bg-muted text-muted-foreground" };
  const pct = (total / MAX_SCORE) * 100;
  if (pct >= 80) return { label: "Cemerlang", cls: "bg-[var(--success-bg)] text-[var(--success)]" };
  if (pct >= 60) return { label: "Baik",      cls: "bg-[var(--warning-bg)] text-[var(--warning)]" };
  return { label: "Perlu Baik", cls: "bg-destructive/10 text-destructive" };
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet("/evaluations")
      .then(setEvaluations)
      .catch(() => setEvaluations([]))
      .finally(() => setLoading(false));
  }, []);

  const topId = evaluations.length > 0
    ? evaluations.reduce((a, b) => (b.total ?? 0) > (a.total ?? 0) ? b : a).id
    : null;

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Penilaian Prestasi</h1>
        <p className="text-sm text-muted-foreground">Rekod penilaian prestasi Ketua Kampung &amp; Penghulu</p>
      </div>

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <p className="text-sm font-semibold flex-1">Rekod Penilaian</p>
          {!loading && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{evaluations.length} rekod</span>}
        </div>

        {loading ? <TableSkeleton /> : evaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Tiada rekod penilaian</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pemimpin</TableHead>
                <TableHead>Tempoh</TableHead>
                <TableHead className="w-36">Pencapaian</TableHead>
                <TableHead className="text-right">Markah</TableHead>
                <TableHead>Prestasi</TableHead>
                <TableHead>Ulasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((ev) => {
                const tier = scoreTier(ev.total);
                const pct  = ev.total != null ? (ev.total / MAX_SCORE) * 100 : 0;
                const isTop = ev.id === topId;
                return (
                  <TableRow
                    key={ev.id}
                    className={`cursor-pointer hover:bg-muted/40 ${isTop ? "bg-[var(--success-bg)]/30" : ""}`}
                    onClick={() => router.push(`/evaluations/${ev.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isTop && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="currentColor" />}
                        <span className="font-medium">{ev.leader_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{ev.period ?? "—"}</TableCell>
                    <TableCell>
                      <Progress value={pct} className="h-2" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {ev.total ?? "—"}<span className="text-muted-foreground font-normal text-xs">/{MAX_SCORE}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tier.cls}`}>
                        {tier.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs truncate max-w-[140px]">{ev.ulasan ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
