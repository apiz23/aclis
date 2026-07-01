"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
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

const editSchema = z.object({
  content: z.string().min(1, "Kandungan tidak boleh kosong."),
});
type EditValues = z.infer<typeof editSchema>;

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
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
  const [data, setData]             = useState<ReportDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiSummary, setAiSummary]   = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const { control, handleSubmit, reset: resetEdit, formState: { isSubmitting: isSaving } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { content: "" },
  });

  function load() {
    setLoading(true);
    apiGet(`/reports/${id}`)
      .then((d: ReportDetail) => {
        setData(d);
        resetEdit({ content: d.content ?? "" });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: s }) => {
      const role = (s.session?.user?.app_metadata as Record<string,string> | undefined)?.role;
      setIsAdmin(role === "admin_daerah");
    });
    setSummaryLoading(true);
    apiGet(`/reports/${id}/summary`)
      .then((d: { summary: string | null }) => setAiSummary(d.summary))
      .catch(() => setAiSummary(null))
      .finally(() => setSummaryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (error) { toast.error("Rekod tidak ditemui atau akses ditolak."); router.replace("/reports"); }
  }, [error]);

  async function onEditSubmit(values: EditValues) {
    const promise = apiPatch(`/reports/${id}`, { content: values.content });

    toast.promise(promise, {
      loading: "Menyimpan kandungan...",
      success: "Kandungan berjaya disimpan.",
      error: "Gagal menyimpan. Cuba semula.",
    });

    try {
      const updated: ReportDetail = await promise;
      setData(updated);
      setEditOpen(false);
    } catch {
      // handled by toast.promise
    }
  }

  async function handleSubmitReport() {
    if (!confirm("Hantar laporan ini? Status akan bertukar kepada Dihantar.")) return;
    setSubmitting(true);
    const promise = apiPatch(`/reports/${id}`, { status: "submitted" });

    toast.promise(promise, {
      loading: "Menghantar laporan...",
      success: "Laporan berjaya dihantar.",
      error: "Gagal menghantar laporan.",
    });

    try {
      const updated: ReportDetail = await promise;
      setData(updated);
    } catch {
      // handled by toast.promise
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

      {isAdmin && !loading && isDraft && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Kandungan
          </Button>
          <Button size="sm" onClick={handleSubmitReport} disabled={submitting}>
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
              <FieldRow label="Kampung" value={data?.kampung_name} />
              <FieldRow label="Tempoh" value={data?.period} />
              <FieldRow label="Status" value={
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusConfig.cls}`}>
                  {statusConfig.label}
                </span>
              } />
              <FieldRow label="Tarikh Dihantar" value={data?.submitted_at ? data.submitted_at.slice(0, 10) : null} />
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

      {(summaryLoading || aiSummary) && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Ringkasan AI</p>
            <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">JamAI</span>
          </div>
          <div className="p-5">
            {summaryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-foreground/80">{aiSummary}</p>
            )}
          </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Kandungan Laporan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 pt-1">
            <Controller
              name="content"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kandungan</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    rows={8}
                    placeholder="Tuliskan kandungan laporan..."
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
