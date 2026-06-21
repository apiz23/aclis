"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { AlertCircle, Plus, Bot } from "lucide-react";

interface KampungOption { id: string; name: string }
interface IssueSummary {
  id: string; kampung_id: string | null; kampung_name: string | null;
  type: string | null; location: string | null; description: string | null;
  ai_category: string | null; status: string;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; cls: string; pillCls: string }> = {
  open:        { label: "Terbuka",      cls: "bg-primary/10 text-primary",                                  pillCls: "bg-primary/10 text-primary hover:bg-primary/20" },
  in_progress: { label: "Dalam Proses", cls: "bg-[var(--warning-bg)] text-[var(--warning)]",               pillCls: "bg-[var(--warning-bg)] text-[var(--warning)] hover:opacity-80" },
  resolved:    { label: "Selesai",      cls: "bg-[var(--success-bg)] text-[var(--success)]",               pillCls: "bg-[var(--success-bg)] text-[var(--success)] hover:opacity-80" },
  closed:      { label: "Ditutup",      cls: "bg-muted text-muted-foreground",                              pillCls: "bg-muted text-muted-foreground hover:bg-muted/70" },
};

const ISSUE_TYPES = ["Lampu Jalan", "Jalan Rosak", "Paip Air", "Longkang", "Sampah", "Lain-lain"];
const EMPTY_FORM = { kampung_id: "", type: "", location: "", description: "" };

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as IssueStatus] ?? STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

function AICategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground">
      <Bot className="h-3 w-3" />
      {category}
    </span>
  );
}

export default function IssuesPage() {
  const [issues, setIssues]             = useState<IssueSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [kampungs, setKampungs]         = useState<KampungOption[]>([]);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [submitting, setSubmitting]     = useState(false);
  const [err, setErr]                   = useState("");
  const router = useRouter();

  function load() {
    setLoading(true);
    apiGet("/issues")
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openDialog() {
    setForm(EMPTY_FORM); setErr(""); setDialogOpen(true);
    if (kampungs.length === 0) apiGet("/kampung").then((list: KampungOption[]) => setKampungs(list)).catch(() => {});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kampung_id) { setErr("Sila pilih kampung."); return; }
    setSubmitting(true); setErr("");
    try {
      await apiPost("/issues", { kampung_id: form.kampung_id, type: form.type || null, location: form.location || null, description: form.description || null });
      setDialogOpen(false); load();
    } catch { setErr("Gagal merekod isu. Cuba semula."); }
    finally { setSubmitting(false); }
  }

  const statusCounts = (Object.keys(STATUS_CONFIG) as IssueStatus[]).reduce((acc, s) => {
    acc[s] = issues.filter(i => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = statusFilter ? issues.filter(i => i.status === statusFilter) : issues;

  return (
    <AppLayout>
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Isu Komuniti</h1>
          <p className="text-sm text-muted-foreground">Aduan dan permohonan kemudahan awam</p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Laporkan Isu
        </Button>
      </div>

      {!loading && issues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Semua ({issues.length})
          </button>
          {(Object.entries(STATUS_CONFIG) as [IssueStatus, { label: string; cls: string }][]).map(([s, cfg]) => statusCounts[s] > 0 && (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? cfg.cls + " ring-2 ring-offset-1 ring-current" : cfg.cls + " opacity-70 hover:opacity-100"}`}
            >
              {cfg.label} ({statusCounts[s]})
            </button>
          ))}
        </div>
      )}

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center">
          <p className="text-sm font-semibold flex-1">Senarai Isu</p>
          {!loading && <span className="text-xs text-muted-foreground">{filtered.length} rekod</span>}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{issues.length === 0 ? "Tiada isu komuniti" : "Tiada isu untuk status ini"}</p>
          </div>
        ) : (
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
              {filtered.map((issue) => (
                <TableRow key={issue.id} className="cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/issues/${issue.id}`)}>
                  <TableCell className="font-medium">{issue.kampung_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.type ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.location ?? "—"}</TableCell>
                  <TableCell><AICategoryBadge category={issue.ai_category} /></TableCell>
                  <TableCell><StatusBadge status={issue.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Laporkan Isu</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="kampung">Kampung *</Label>
              <Select value={form.kampung_id} onValueChange={(v) => setForm((f) => ({ ...f, kampung_id: v }))}>
                <SelectTrigger id="kampung"><SelectValue placeholder="Pilih kampung..." /></SelectTrigger>
                <SelectContent>{kampungs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Jenis Isu</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger id="type"><SelectValue placeholder="Pilih jenis..." /></SelectTrigger>
                <SelectContent>{ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Lokasi</Label>
              <Input id="location" placeholder="cth: Jalan Kampung Baru" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Penerangan</Label>
              <Textarea id="description" placeholder="Huraikan masalah dengan jelas..." rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan…" : "Hantar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
