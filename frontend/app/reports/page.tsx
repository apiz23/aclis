"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { FileText } from "lucide-react";

interface ReportSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  period: string;
  status: string;
  submitted_at: string | null;
}

type ReportStatus = "submitted" | "draft" | "late";

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  submitted: { label: "Dihantar", cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  draft:     { label: "Draf",     cls: "bg-muted text-muted-foreground" },
  late:      { label: "Lewat",    cls: "bg-destructive/10 text-destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as ReportStatus] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
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
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">Tiada rekod laporan</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Laporan bulanan akan dipaparkan selepas import data selesai.
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet("/reports")
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
        <p className="text-sm text-muted-foreground">
          Hantar dan semak laporan aktiviti kampung bulanan
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Rekod Laporan</p>
        </div>

        {loading ? <TableSkeleton /> : reports.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampung</TableHead>
                <TableHead>Tempoh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tarikh Hantar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/reports/${r.id}`)}
                >
                  <TableCell className="font-medium">{r.kampung_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{r.period}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {r.submitted_at ? r.submitted_at.slice(0, 10) : "—"}
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
