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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { apiGet, apiPost } from "@/lib/api";
import { AlertCircle, Plus, Bot } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useIssues, QUERY_KEYS } from "@/lib/queries";

interface KampungOption { id: string; name: string }
interface IssueSummary {
  id: string; kampung_id: string | null; kampung_name: string | null;
  type: string | null; location: string | null; description: string | null;
  ai_category: string | null; status: string;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; cls: string }> = {
  open:        { label: "Terbuka",      cls: "bg-primary/10 text-primary" },
  in_progress: { label: "Dalam Proses", cls: "bg-[var(--warning-bg)] text-[var(--warning)]" },
  resolved:    { label: "Selesai",      cls: "bg-[var(--success-bg)] text-[var(--success)]" },
  closed:      { label: "Ditutup",      cls: "bg-muted text-muted-foreground" },
};

const ISSUE_TYPES = ["Lampu Jalan", "Jalan Rosak", "Paip Air", "Longkang", "Sampah", "Lain-lain"];

const issueSchema = z.object({
  kampung_id: z.string().min(1, "Sila pilih kampung."),
  type: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});
type IssueFormValues = z.infer<typeof issueSchema>;

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

const columns: ColumnDef<IssueSummary>[] = [
  {
    id: "no",
    header: () => <div className="text-center">No.</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-center tabular-nums text-xs text-muted-foreground">{row.index + 1}</div>
    ),
  },
  {
    accessorKey: "kampung_name",
    header: ({ column }) => <SortableHeader column={column} title="Kampung" />,
    cell: ({ row }) => <span className="font-medium">{row.original.kampung_name ?? "—"}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column} title="Jenis" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.type ?? "—"}</span>,
  },
  {
    accessorKey: "location",
    header: "Lokasi",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.location ?? "—"}</span>,
  },
  {
    accessorKey: "ai_category",
    header: "Kategori AI",
    cell: ({ row }) => <AICategoryBadge category={row.original.ai_category} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export default function IssuesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: issues = [], isLoading: loading } = useIssues();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: kampungs = [] } = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
  });

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { kampung_id: "", type: "", location: "", description: "" },
  });

  function openDialog() {
    reset();
    setDialogOpen(true);
  }

  async function onSubmit(values: IssueFormValues) {
    try {
      await apiPost("/issues", {
        kampung_id: values.kampung_id,
        type: values.type || null,
        location: values.location || null,
        description: values.description || null,
      });
      setDialogOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: QUERY_KEYS.issues });
      toast.success("Isu berjaya dilaporkan.");
    } catch {
      toast.error("Gagal merekod isu. Cuba semula.");
    }
  }

  const issueList = issues as IssueSummary[];
  const statusCounts = (Object.keys(STATUS_CONFIG) as IssueStatus[]).reduce((acc, s) => {
    acc[s] = issueList.filter(i => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = statusFilter ? issueList.filter(i => i.status === statusFilter) : issueList;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Isu Komuniti</h1>
          <p className="text-sm text-muted-foreground">Aduan dan permohonan kemudahan awam</p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Laporkan Isu
        </Button>
      </div>

      {!loading && issueList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Semua ({issueList.length})
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
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Isu</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : issueList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Tiada isu komuniti</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            searchPlaceholder="Cari kampung atau jenis..."
            onRowClick={(issue) => router.push(`/issues/${issue.id}`)}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Laporkan Isu</DialogTitle></DialogHeader>
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
                      {(kampungs as KampungOption[]).map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="type"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Isu</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih jenis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="location"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Lokasi</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="cth: Jalan Kampung Baru"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Penerangan</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="Huraikan masalah dengan jelas..."
                    rows={3}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">
                Hantar
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
