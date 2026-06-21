"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch } from "@/lib/api";
import { ArrowLeft, Pencil, Send, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ReportDetail {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  period: string;
  status: string;
  submitted_at: string | null;
  content: string | null;
}

type ReportStatus = "submitted" | "draft" | "late";

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  submitted: { label: "Dihantar", cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  draft:     { label: "Draf",     cls: "bg-muted text-muted-foreground" },
  late:      { label: "Lewat",    cls: "bg-destructive/10 text-destructive" },
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]           = useState<ReportDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [content, setContent]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editErr, setEditErr]     = useState("");
  const [summary, setSummary]     = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  function load() {
    setLoading(true);
    apiGet(`/reports/${id}`)
      .then((d: ReportDetail) => { setData(d); setContent(d.content ?? ""); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  function loadSummary() {
    setSummaryLoading(true);
    apiGet(`/reports/${id}/summary`)
      .then((d: { summary: string | null }) => setSummary(d.summary))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: s }) => {
      const role = (s.session?.user?.app_metadata as Record<string,string> | undefined)?.role;
      setIsAdmin(role === "admin_daerah");
    });
  }, [id]);

  async function handleSaveContent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditErr("");
    try {
      const updated: ReportDetail = await apiPatch(`/reports/${id}`, { content });
      setData(updated);
      setEditOpen(false);
    } catch {
      setEditErr("Gagal menyimpan. Cuba semula.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!confirm("Hantar laporan ini? Status akan bertukar kepada Dihantar.")) return;
    setSubmitting(true);
    try {
      const updated: ReportDetail = await apiPatch(`/reports/${id}`, { status: "submitted" });
      setData(updated);
    } catch {
      alert("Gagal menghantar laporan.");
    } finally {
      setSubmitting(false);
    }
  }

  const statusConfig = STATUS_CONFIG[data?.status as ReportStatus] ?? STATUS_CONFIG.draft;
  const isDraft      = data?.status === "draft";

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {data?.kampung_name ?? "Laporan"} · {data?.period}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Laporan Bulanan</p>
        </div>
        {!loading && data && (
          <span className={`ml-auto inline-flex items-center rounded px-2.5 py-1 text-xs font-medium ${statusConfig.cls}`}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan laporan.</p>}

      {/* Actions — admin + draft only */}
      {isAdmin && !loading && isDraft && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditErr(""); setEditOpen(true); }}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Kandungan
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {submitting ? "Menghantar…" : "Hantar Laporan"}
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Maklumat Laporan</p>
        </div>
        <div className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <Field label="Kampung" value={data?.kampung_name} />
              <Field label="Tempoh" value={data?.period} />
              <Field label="Status" value={
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                  {statusConfig.label}
                </span>
              } />
              <Field label="Tarikh Dihantar" value={data?.submitted_at ? data.submitted_at.slice(0, 10) : null} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Kandungan Laporan</p>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Tiada kandungan laporan.</p>
          )}
        </div>
      </div>

      {/* AI Summary card */}
      {!loading && data?.content && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-semibold">Ringkasan AI</p>
            <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">
              JamAI
            </span>
          </div>
          <div className="p-5">
            {summary == null && !summaryLoading ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground flex-1">
                  Klik untuk menjana ringkasan AI daripada kandungan laporan ini.
                </p>
                <button
                  onClick={loadSummary}
                  className="shrink-0 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
                >
                  Jana Ringkasan
                </button>
              </div>
            ) : summaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            ) : summary ? (
              <p className="text-sm leading-relaxed">{summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Gagal menjana ringkasan. Pastikan AI_PROVIDER dikonfigurasikan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit Content Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Kandungan Laporan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveContent} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-content">Kandungan</Label>
              <Textarea
                id="edit-content"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan kandungan laporan..."
              />
            </div>
            {editErr && <p className="text-sm text-destructive">{editErr}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
