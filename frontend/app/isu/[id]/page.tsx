"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { ArrowLeft, Bot, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface IssueDetail {
  id: string;
  kampung_id: string | null;
  kampung_name: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
  ai_category: string | null;
  status: string;
  coords: string | null;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; variant: "primary" | "warning" | "success" | "secondary" }> = {
  open:        { label: "Terbuka",      variant: "primary" },
  in_progress: { label: "Dalam Proses", variant: "warning" },
  resolved:    { label: "Selesai",      variant: "success" },
  closed:      { label: "Ditutup",      variant: "secondary" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  open:        [{ label: "Proses",  next: "in_progress" }],
  in_progress: [{ label: "Selesai", next: "resolved" }, { label: "Tutup", next: "closed" }],
  resolved:    [{ label: "Tutup",   next: "closed" }],
  closed:      [],
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function IssueDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]               = useState<IssueDetail | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [updating, setUpdating]       = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);

  function load() {
    setLoading(true);
    apiGet(`/issues/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: s }) => {
      const role = (s.session?.user?.app_metadata as Record<string,string> | undefined)?.role;
      setIsAdmin(role === "admin_daerah");
    });
  }, [id]);
  useEffect(() => {
    if (error) { toast.error("Rekod tidak ditemui atau akses ditolak."); router.replace("/isu"); }
  }, [error]);

  async function handleStatusChange(next: string) {
    setUpdating(true);
    const promise = apiPatch(`/issues/${id}`, { status: next });

    toast.promise(promise, {
      loading: "Mengemaskini status...",
      success: "Status berjaya dikemaskini.",
      error: "Gagal kemaskini status.",
    });

    try {
      const updated: IssueDetail = await promise;
      setData(updated);
    } catch {
      // handled by toast.promise
    } finally {
      setUpdating(false);
    }
  }

  async function handleRecategorize() {
    setRecategorizing(true);
    const promise = apiPost(`/issues/${id}/recategorize`, {});

    toast.promise(promise, {
      loading: "Menghantar ke AI...",
      success: "Permintaan kategori AI dihantar. Sila muat semula sebentar.",
      error: "Gagal menghantar permintaan kategori AI.",
    });

    try {
      await promise;
    } catch {
      // handled by toast.promise
    } finally {
      setRecategorizing(false);
    }
  }

  const statusConfig = STATUS_CONFIG[data?.status as IssueStatus] ?? STATUS_CONFIG.open;
  const transitions  = STATUS_TRANSITIONS[data?.status ?? "open"] ?? [];

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/isu")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="heading-page">
              {data?.type ?? "Isu"} — {data?.kampung_name ?? "—"}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Isu Komuniti</p>
        </div>
        {!loading && data && (
          <Badge variant={statusConfig.variant} className="ml-auto">{statusConfig.label}</Badge>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data isu.</p>}

      {/* Status actions — admin only */}
      {isAdmin && !loading && data && transitions.length > 0 && (
        <div className="flex gap-2">
          {transitions.map(({ label, next }) => (
            <LoadingButton
              key={next}
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(next)}
              loading={updating}
              loadingText="..."
            >
              {label}
            </LoadingButton>
          ))}
        </div>
      )}

      <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Maklumat Isu</p>
        </div>
        <CardContent className="px-5">
          {loading ? (
            <div className="py-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <Field label="Kampung" value={data?.kampung_name} />
              <Field label="Jenis Isu" value={data?.type} />
              <Field label="Lokasi" value={data?.location} />
              <Field label="Koordinat" value={data?.coords} />
              <Field label="Status" value={<Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>} />
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Penerangan</p>
        </div>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Tiada penerangan.</p>
          )}
        </CardContent>
      </Card>

      {/* ── AI Category card ── */}
      <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Kategori AI</p>
          <Badge variant="outline" className="ml-auto text-[10px] leading-none">AI</Badge>
          {isAdmin && !loading && data?.description && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleRecategorize}
              disabled={recategorizing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${recategorizing ? "animate-spin" : ""}`} />
              {recategorizing ? "Memproses…" : "Kemas Semula"}
            </Button>
          )}
        </div>
        <CardContent className="p-5">
          {loading ? (
            <Skeleton className="h-6 w-32" />
          ) : data?.ai_category ? (
            <Badge variant="accent" className="gap-1.5 text-sm px-2.5 py-1">
              <Bot className="h-3.5 w-3.5" />
              {data.ai_category}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Kategori belum dijana. {data?.description ? "AI akan memproses dalam masa terdekat." : "Tiada penerangan untuk dikategori."}
            </p>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
