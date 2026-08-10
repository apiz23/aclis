"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLog, useCurrentUser } from "@/lib/queries";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  create:       "Cipta",
  update:       "Kemas Kini",
  delete:       "Padam",
  recategorize: "Kategori Semula",
};

const ACTION_BADGE: Record<string, "success" | "primary" | "destructive" | "warning"> = {
  create:       "success",
  update:       "primary",
  delete:       "destructive",
  recategorize: "warning",
};

const ENTITY_LABEL: Record<string, string> = {
  leader:     "Pemimpin",
  report:     "Laporan",
  issue:      "Isu",
  kampung:    "Kampung",
  evaluation: "Penilaian",
  resident:   "Penduduk",
};

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  penghulu:      "Penghulu",
  ketua_kampung: "Ketua Kampung",
};

const ENTITY_FILTERS = ["Semua", "leader", "report", "issue", "kampung", "evaluation", "resident"] as const;

function formatTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function detailText(details: Record<string, unknown> | null) {
  if (!details) return "—";
  return Object.entries(details)
    .map(([k, v]) => (Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`))
    .join(" · ");
}

export default function AuditPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";
  const { data, isLoading } = useAuditLog(isAdmin);
  const [entityFilter, setEntityFilter] = useState<(typeof ENTITY_FILTERS)[number]>("Semua");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => (data ?? []) as AuditEntry[], [data]);
  const q = query.toLowerCase();

  const filtered = useMemo(
    () =>
      entries
        .filter(e => entityFilter === "Semua" || e.entity === entityFilter)
        .filter(
          e =>
            !q ||
            `${e.actor_email ?? ""} ${e.action} ${e.entity} ${e.entity_id ?? ""}`
              .toLowerCase()
              .includes(q)
        ),
    [entries, entityFilter, q]
  );

  if (!meLoading && !isAdmin) {
    return (
      <AppLayout>
        <Card className="ring-0 shadow-none px-6 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">Akses Terhad</p>
          <p className="max-w-sm text-sm text-muted-foreground mx-auto">
            Log audit hanya boleh diakses oleh Admin Daerah.
          </p>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-page">Log Audit</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Jejak aktiviti cipta, kemas kini dan padam oleh semua pengguna
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border bg-card rounded-md overflow-hidden">
            {ENTITY_FILTERS.map((f, i) => (
              <Button
                key={f}
                variant={entityFilter === f ? "default" : "ghost"}
                size="sm"
                className={cn("rounded-none", i > 0 && "border-l")}
                onClick={() => setEntityFilter(f)}
              >
                {f === "Semua" ? "Semua" : ENTITY_LABEL[f]}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari e-mel / tindakan…"
              className="w-[200px] pl-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Log table */}
      <Card className="ring-0 shadow-none gap-0">
        <div className="flex items-center justify-between border-b px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold">
              Aktiviti Terkini ({isLoading || meLoading ? "…" : filtered.length})
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Disusun mengikut masa, terbaru dahulu · maksimum 200 rekod
            </p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Masa</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Peranan</TableHead>
              <TableHead>Tindakan</TableHead>
              <TableHead>Entiti</TableHead>
              <TableHead className="pr-4">Butiran</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || meLoading) &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="px-4">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && !meLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Tiada rekod audit sepadan.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap pl-4 text-xs text-text-mid tabular-nums">
                  {formatTime(e.created_at)}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-xs font-medium text-navy">
                  {e.actor_email ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-text-mid">
                  {e.actor_role ? ROLE_LABEL[e.actor_role] ?? e.actor_role : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_BADGE[e.action] ?? "secondary"}>
                    {ACTION_LABEL[e.action] ?? e.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ENTITY_LABEL[e.entity] ?? e.entity}</Badge>
                </TableCell>
                <TableCell className="max-w-[280px] truncate pr-4 text-[11px] text-muted-foreground">
                  {detailText(e.details)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
