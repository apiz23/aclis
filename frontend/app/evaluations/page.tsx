"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { ClipboardList } from "lucide-react";

interface EvaluationSummary {
  id: string;
  leader_id: string;
  leader_name: string | null;
  period: string | null;
  total: number | null;
  ulasan: string | null;
}

const MAX_SCORE = 60;

function scoreTierCls(total: number | null): string {
  if (total == null) return "text-muted-foreground";
  const pct = (total / MAX_SCORE) * 100;
  if (pct >= 80) return "text-[var(--success)] font-semibold";
  if (pct >= 60) return "text-[var(--warning)] font-semibold";
  return "text-destructive font-semibold";
}

function scoreTierLabel(total: number | null): string {
  if (total == null) return "";
  const pct = (total / MAX_SCORE) * 100;
  if (pct >= 80) return "Cemerlang";
  if (pct >= 60) return "Memuaskan";
  return "Perlu Baik";
}

function progressTierCls(total: number | null): string {
  if (total == null) return "";
  const pct = (total / MAX_SCORE) * 100;
  if (pct >= 80) return "[&>div]:bg-[var(--success)]";
  if (pct >= 60) return "[&>div]:bg-[var(--warning)]";
  return "[&>div]:bg-destructive";
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
        <ClipboardList className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">Tiada rekod penilaian</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Rekod penilaian prestasi akan dipaparkan selepas import data selesai.
      </p>
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

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Penilaian Prestasi</h1>
        <p className="text-sm text-muted-foreground">
          Rekod penilaian prestasi Ketua Kampung &amp; Penghulu
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Rekod Penilaian</p>
        </div>

        {loading ? <TableSkeleton /> : evaluations.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pemimpin</TableHead>
                <TableHead>Tempoh</TableHead>
                <TableHead className="text-right">Jumlah Markah</TableHead>
                <TableHead className="w-44">Pencapaian</TableHead>
                <TableHead>Ulasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((ev) => (
                <TableRow
                  key={ev.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/evaluations/${ev.id}`)}
                >
                  <TableCell className="font-medium">{ev.leader_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{ev.period ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={scoreTierCls(ev.total)}>
                      {ev.total != null ? ev.total : "—"}
                    </span>
                    {ev.total != null && (
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                        {scoreTierLabel(ev.total)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Progress
                      value={ev.total != null ? (ev.total / MAX_SCORE) * 100 : 0}
                      className={`h-1.5 ${progressTierCls(ev.total)}`}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs truncate max-w-[160px]">
                    {ev.ulasan ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
