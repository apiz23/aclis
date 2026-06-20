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
import { AlertCircle } from "lucide-react";

interface IssueSummary {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; cls: string }> = {
  open:        { label: "Terbuka",      cls: "bg-primary/10 text-primary" },
  in_progress: { label: "Dalam Proses", cls: "bg-[var(--warning-bg)] text-[var(--warning)]" },
  resolved:    { label: "Selesai",      cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  closed:      { label: "Ditutup",      cls: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as IssueStatus] ?? STATUS_CONFIG.open;
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
        <AlertCircle className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">Tiada isu komuniti</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Aduan dan permohonan akan dipaparkan selepas import data selesai.
      </p>
    </div>
  );
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet("/issues")
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Isu Komuniti</h1>
        <p className="text-sm text-muted-foreground">
          Aduan dan permohonan kemudahan awam
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Isu</p>
        </div>

        {loading ? <TableSkeleton /> : issues.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampung</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Kategori AI</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow
                  key={issue.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/issues/${issue.id}`)}
                >
                  <TableCell className="font-medium">{issue.kampung_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.type ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.location ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.ai_category ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={issue.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
