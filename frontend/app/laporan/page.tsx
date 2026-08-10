"use client";

import { useReports } from "@/lib/queries";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { FileText, Plus, AlertTriangle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

interface ReportSummary {
  id: string; kampung_id: string | null; kampung_name: string | null;
  period: string; status: string; submitted_at: string | null;
}

type ReportStatus = "submitted" | "draft" | "late";

const STATUS_CONFIG: Record<ReportStatus, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  submitted: { label: "Dihantar", variant: "success" },
  draft:     { label: "Draf",     variant: "secondary" },
  late:      { label: "Lewat",    variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as ReportStatus] ?? STATUS_CONFIG.draft;
  return (
    <Badge variant={config.variant} className="gap-1">
      {status === "late" && <AlertTriangle className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

const columns: ColumnDef<ReportSummary>[] = [
  {
    accessorKey: "kampung_name",
    header: ({ column }) => <SortableHeader column={column} title="Kampung" />,
    cell: ({ row }) => <span className="font-medium">{row.original.kampung_name ?? "—"}</span>,
  },
  {
    accessorKey: "period",
    header: ({ column }) => <SortableHeader column={column} title="Tempoh" />,
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.period}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "submitted_at",
    header: ({ column }) => <SortableHeader column={column} title="Tarikh Hantar" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.submitted_at ? row.original.submitted_at.slice(0, 10) : "—"}
      </span>
    ),
  },
];

export default function ReportsPage() {
  const router = useRouter();
  const { data: reports = [], isLoading: loading } = useReports();

  const reportList = reports as ReportSummary[];
  const submittedCount = reportList.filter(r => r.status === "submitted").length;
  const submissionRate = reportList.length > 0 ? (submittedCount / reportList.length) * 100 : 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="heading-page">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">Semak laporan aktiviti kampung bulanan</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/borang">
            <Plus className="h-4 w-4 mr-1.5" />
            Hantar Laporan
          </Link>
        </Button>
      </div>

      {!loading && reportList.length > 0 && (
        <div className="border bg-card rounded-lg shadow-sm p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-muted-foreground">Kadar Penghantaran</span>
              <span className="font-semibold text-foreground">{submittedCount}/{reportList.length} laporan</span>
            </div>
            <Progress value={submissionRate} className="h-2" />
          </div>
          <span className="text-2xl font-bold tabular-nums text-primary">{submissionRate.toFixed(0)}%</span>
        </div>
      )}

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Rekod Laporan</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : reportList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Tiada rekod laporan</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={reportList}
            searchPlaceholder="Cari kampung atau tempoh..."
            onRowClick={(r) => router.push(`/laporan/${r.id}`)}
            getRowClassName={(r) => r.status === "late" ? "bg-destructive/5" : ""}
          />
        )}
      </div>
    </AppLayout>
  );
}
