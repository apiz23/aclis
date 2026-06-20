"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { FileText, Plus } from "lucide-react";

interface KampungOption { id: string; name: string }

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
        Klik "Hantar Laporan" untuk mencipta laporan baru.
      </p>
    </div>
  );
}

function buildPeriodOptions(): string[] {
  const now    = new Date();
  const result = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

const EMPTY_FORM = { kampung_id: "", period: "", content: "" };

export default function ReportsPage() {
  const [reports, setReports]       = useState<ReportSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kampungs, setKampungs]     = useState<KampungOption[]>([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState("");
  const router = useRouter();

  function load() {
    setLoading(true);
    apiGet("/reports")
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openDialog() {
    setForm(EMPTY_FORM);
    setErr("");
    setDialogOpen(true);
    if (kampungs.length === 0) {
      apiGet("/kampung").then((list: KampungOption[]) => setKampungs(list)).catch(() => {});
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kampung_id) { setErr("Sila pilih kampung."); return; }
    if (!form.period)     { setErr("Sila pilih tempoh laporan."); return; }
    setSubmitting(true);
    setErr("");
    try {
      await apiPost("/reports", {
        kampung_id: form.kampung_id,
        period:     form.period,
        content:    form.content || null,
      });
      setDialogOpen(false);
      load();
    } catch {
      setErr("Gagal mencipta laporan. Cuba semula.");
    } finally {
      setSubmitting(false);
    }
  }

  const periodOptions = buildPeriodOptions();

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">Hantar dan semak laporan aktiviti kampung bulanan</p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Hantar Laporan
        </Button>
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

      {/* Create Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hantar Laporan Bulanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="rpt-kampung">Kampung *</Label>
              <Select
                value={form.kampung_id}
                onValueChange={(v) => setForm((f) => ({ ...f, kampung_id: v }))}
              >
                <SelectTrigger id="rpt-kampung">
                  <SelectValue placeholder="Pilih kampung..." />
                </SelectTrigger>
                <SelectContent>
                  {kampungs.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rpt-period">Tempoh *</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm((f) => ({ ...f, period: v }))}
              >
                <SelectTrigger id="rpt-period">
                  <SelectValue placeholder="Pilih bulan..." />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rpt-content">Kandungan Laporan</Label>
              <Textarea
                id="rpt-content"
                placeholder="Tuliskan ringkasan aktiviti bulan ini..."
                rows={5}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>

            {err && <p className="text-sm text-destructive">{err}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan…" : "Simpan Draf"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
