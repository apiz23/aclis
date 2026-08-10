"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { apiPost } from "@/lib/api";
import { ClipboardList, Star, Plus } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useCurrentUser, useLeaders, useEvaluations, QUERY_KEYS } from "@/lib/queries";

interface EvaluationSummary {
  id: string; leader_id: string; leader_name: string | null;
  period: string | null; total: number | null; ulasan: string | null;
}

interface LeaderOption { id: string; name: string; type: string }

const MAX_SCORE = 60;

const SCORE_KEYS = ["kehadiran", "khidmat_komuniti", "pengurusan", "komunikasi", "inisiatif", "kerjasama"] as const;
const SCORE_LABELS: Record<typeof SCORE_KEYS[number], string> = {
  kehadiran: "Kehadiran Mesyuarat",
  khidmat_komuniti: "Khidmat Komuniti",
  pengurusan: "Pengurusan Kampung",
  komunikasi: "Komunikasi",
  inisiatif: "Inisiatif",
  kerjasama: "Kerjasama Agensi",
};

const evalSchema = z.object({
  leader_id: z.string().min(1, "Sila pilih pemimpin."),
  period: z.string().min(1, "Sila masukkan tempoh.").regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
  ulasan: z.string().optional(),
  kehadiran:        z.coerce.number().min(0).max(10),
  khidmat_komuniti: z.coerce.number().min(0).max(10),
  pengurusan:       z.coerce.number().min(0).max(10),
  komunikasi:       z.coerce.number().min(0).max(10),
  inisiatif:        z.coerce.number().min(0).max(10),
  kerjasama:        z.coerce.number().min(0).max(10),
});
type EvalFormValues = z.infer<typeof evalSchema>;

const DEFAULT_VALS: EvalFormValues = {
  leader_id: "", period: "", ulasan: "",
  kehadiran: 0, khidmat_komuniti: 0, pengurusan: 0,
  komunikasi: 0, inisiatif: 0, kerjasama: 0,
};

function scoreTier(total: number | null) {
  if (total == null) return { label: "—", cls: "bg-muted text-muted-foreground" };
  const pct = (total / MAX_SCORE) * 100;
  if (pct >= 80) return { label: "Cemerlang", cls: "bg-[var(--success-bg)] text-[var(--success)]" };
  if (pct >= 60) return { label: "Baik",      cls: "bg-[var(--warning-bg)] text-[var(--warning)]" };
  return { label: "Perlu Baik", cls: "bg-destructive/10 text-destructive" };
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

function ScoreLiveTotal({ control }: { control: Control<EvalFormValues> }) {
  const vals = useWatch({ control, name: SCORE_KEYS });
  const total = (vals as number[]).reduce((s, v) => s + (Number(v) || 0), 0);
  const pct = (total / MAX_SCORE) * 100;
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2.5 space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-muted-foreground">Jumlah Sementara</span>
        <span className={pct >= 80 ? "text-[var(--success)]" : pct >= 60 ? "text-[var(--warning)]" : "text-destructive"}>
          {total} / {MAX_SCORE}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

export default function EvaluationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: evaluations = [], isLoading: loading } = useEvaluations();
  const { data: leaderList = [] } = useLeaders();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isAdmin = me?.role === "admin_daerah";

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<EvalFormValues>({
    resolver: zodResolver(evalSchema),
    defaultValues: DEFAULT_VALS,
  });

  function openDialog() {
    reset(DEFAULT_VALS);
    setDialogOpen(true);
  }

  async function onSubmit(values: EvalFormValues) {
    const scores = Object.fromEntries(SCORE_KEYS.map((k) => [k, Number(values[k])]));
    const promise = apiPost("/evaluations", {
      leader_id: values.leader_id,
      period: values.period,
      scores,
      ulasan: values.ulasan || null,
    });

    toast.promise(promise, {
      loading: "Menyimpan penilaian...",
      success: "Penilaian berjaya disimpan.",
      error: "Gagal menyimpan penilaian. Cuba semula.",
    });

    try {
      await promise;
      setDialogOpen(false);
      reset(DEFAULT_VALS);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.evaluations });
    } catch {
      // handled by toast.promise
    }
  }

  const evalList = evaluations as EvaluationSummary[];
  const topId = evalList.length > 0
    ? evalList.reduce((a, b) => (b.total ?? 0) > (a.total ?? 0) ? b : a).id
    : null;

  const columns = useMemo((): ColumnDef<EvaluationSummary>[] => [
    {
      accessorKey: "leader_name",
      header: ({ column }) => <SortableHeader column={column} title="Pemimpin" />,
      cell: ({ row }) => {
        const isTop = row.original.id === topId;
        return (
          <div className="flex items-center gap-2">
            {isTop && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="currentColor" />}
            <span className="font-medium">{row.original.leader_name ?? "—"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "period",
      header: ({ column }) => <SortableHeader column={column} title="Tempoh" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">{row.original.period ?? "—"}</span>
      ),
    },
    {
      id: "progress",
      header: "Pencapaian",
      enableSorting: false,
      cell: ({ row }) => {
        const pct = row.original.total != null ? (row.original.total / MAX_SCORE) * 100 : 0;
        return <Progress value={pct} className="h-2 w-28" />;
      },
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <div className="text-right">
          <SortableHeader column={column} title="Markah" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-semibold">
          {row.original.total ?? "—"}
          <span className="text-muted-foreground font-normal text-xs">/{MAX_SCORE}</span>
        </div>
      ),
    },
    {
      id: "tier",
      header: "Prestasi",
      enableSorting: false,
      cell: ({ row }) => {
        const tier = scoreTier(row.original.total);
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tier.cls}`}>
            {tier.label}
          </span>
        );
      },
    },
    {
      accessorKey: "ulasan",
      header: "Ulasan",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs truncate max-w-[140px] block">
          {row.original.ulasan ?? "—"}
        </span>
      ),
    },
  ], [topId]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="heading-page">Penilaian Prestasi</h1>
          <p className="text-sm text-muted-foreground">Rekod penilaian prestasi Ketua Kampung &amp; Penghulu</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Penilaian
          </Button>
        )}
      </div>

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Rekod Penilaian</p>
        </div>

        {loading ? <TableSkeleton /> : evalList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Tiada rekod penilaian</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={evalList}
            searchPlaceholder="Cari pemimpin atau tempoh..."
            onRowClick={(ev) => router.push(`/penilaian/${ev.id}`)}
            getRowClassName={(ev) => ev.id === topId ? "bg-[var(--success-bg)]/30" : ""}
          />
        )}
      </div>

      {isAdmin && (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent className="sm:max-w-lg flex flex-col gap-0">
            <SheetHeader className="shrink-0"><SheetTitle>Tambah Penilaian</SheetTitle></SheetHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">

              <Controller
                name="leader_id"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Pemimpin *</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                      <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Pilih pemimpin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(leaderList as LeaderOption[]).map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
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
                    <FieldLabel htmlFor={field.name}>Tempoh * <span className="text-muted-foreground font-normal">(YYYY-MM)</span></FieldLabel>
                    <Input {...field} id={field.name} placeholder="cth: 2026-06" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Markah Penilaian (0–10 setiap kriteria)</p>
                <div className="grid grid-cols-2 gap-3">
                  {SCORE_KEYS.map((key) => (
                    <Controller
                      key={key}
                      name={key}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={key} className="text-xs">{SCORE_LABELS[key]}</FieldLabel>
                          <Input
                            {...field}
                            id={key}
                            type="number"
                            min={0}
                            max={10}
                            step={1}
                            aria-invalid={fieldState.invalid}
                            className="h-8 text-sm"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  ))}
                </div>
                <ScoreLiveTotal control={control} />
              </div>

              <Controller
                name="ulasan"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Ulasan</FieldLabel>
                    <Textarea
                      {...field}
                      id={field.name}
                      placeholder="Tulis ulasan prestasi..."
                      rows={3}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

            </div>
              <SheetFooter className="shrink-0 border-t px-4 py-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">
                  Simpan
                </LoadingButton>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      )}
    </AppLayout>
  );
}
