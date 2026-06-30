"use client";

import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { apiGet, apiPost } from "@/lib/api";
import { FileText, Plus, AlertTriangle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useReports, QUERY_KEYS } from "@/lib/queries";

interface KampungOption { id: string; name: string }
interface ReportSummary {
  id: string; kampung_id: string | null; kampung_name: string | null;
  period: string; status: string; submitted_at: string | null;
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
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${config.cls}`}>
      {status === "late" && <AlertTriangle className="h-3 w-3" />}
      {config.label}
    </span>
  );
}

function buildPeriodOptions(): string[] {
  const now = new Date(); const result = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

const reportSchema = z.object({
  kampung_id: z.string().min(1, "Sila pilih kampung."),
  period: z.string().min(1, "Sila pilih tempoh laporan."),
  content: z.string().optional(),
});
type ReportFormValues = z.infer<typeof reportSchema>;

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
  const qc = useQueryClient();
  const { data: reports = [], isLoading: loading } = useReports();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: kampungs = [] } = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
  });

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { kampung_id: "", period: "", content: "" },
  });

  function openDialog() {
    reset();
    setDialogOpen(true);
  }

  async function onSubmit(values: ReportFormValues) {
    const promise = apiPost("/reports", {
      kampung_id: values.kampung_id,
      period: values.period,
      content: values.content || null,
    });

    toast.promise(promise, {
      loading: "Menyimpan laporan...",
      success: "Laporan berjaya disimpan sebagai draf.",
      error: "Gagal mencipta laporan. Cuba semula.",
    });

    try {
      await promise;
      setDialogOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reports });
    } catch {
      // handled by toast.promise
    }
  }

  const reportList = reports as ReportSummary[];
  const submittedCount = reportList.filter(r => r.status === "submitted").length;
  const submissionRate = reportList.length > 0 ? (submittedCount / reportList.length) * 100 : 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">Hantar dan semak laporan aktiviti kampung bulanan</p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Hantar Laporan
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
            onRowClick={(r) => router.push(`/reports/${r.id}`)}
            getRowClassName={(r) => r.status === "late" ? "bg-destructive/5" : ""}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Hantar Laporan Bulanan</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

            <Controller
              name="kampung_id"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kampung *</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih kampung..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {(kampungs as KampungOption[]).map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="period"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Tempoh *</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih bulan..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {buildPeriodOptions().map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="content"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kandungan Laporan</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="Tuliskan ringkasan aktiviti bulan ini..."
                    rows={5}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">
                Simpan Draf
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
