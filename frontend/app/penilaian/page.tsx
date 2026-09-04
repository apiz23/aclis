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
import { ClipboardList, Star, Plus, Bot, FileText, AlertTriangle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useCurrentUser, useLeaders, useEvaluations, useLeaderPerformance, QUERY_KEYS } from "@/lib/queries";
import type { LeaderPerformanceData } from "@/lib/types";

interface EvaluationSummary {
  id: string; leader_id: string; leader_name: string | null;
  period: string | null; total: number | null; ulasan: string | null;
}

interface LeaderOption { id: string; name: string; type: string }

const MAX_SCORE = 56;

const SCORE_KEYS = [
  "akhlak_personaliti", "mutu_kerja", "minat_kerja", "kebolehpercayaan",
  "komunikasi", "inisiatif", "disiplin_diri", "kerjasama",
] as const;
const SCORE_LABELS: Record<typeof SCORE_KEYS[number], string> = {
  akhlak_personaliti: "Akhlak / Personaliti",
  mutu_kerja: "Mutu Kerja",
  minat_kerja: "Minat Terhadap Kerja",
  kebolehpercayaan: "Kebolehpercayaan",
  komunikasi: "Komunikasi",
  inisiatif: "Inisiatif",
  disiplin_diri: "Disiplin Diri dan Kerja",
  kerjasama: "Kerjasama",
};

const evalSchema = z.object({
  leader_id: z.string().min(1, "Sila pilih pemimpin."),
  period: z.string().min(1, "Sila masukkan tempoh.").regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
  ulasan: z.string().optional(),
  akhlak_personaliti: z.coerce.number().min(1).max(7),
  mutu_kerja:         z.coerce.number().min(1).max(7),
  minat_kerja:        z.coerce.number().min(1).max(7),
  kebolehpercayaan:   z.coerce.number().min(1).max(7),
  komunikasi:         z.coerce.number().min(1).max(7),
  inisiatif:          z.coerce.number().min(1).max(7),
  disiplin_diri:      z.coerce.number().min(1).max(7),
  kerjasama:          z.coerce.number().min(1).max(7),
  keupayaan_ulasan: z.string().optional(),
  potensi_ulasan:   z.string().optional(),
  penilai_nama:     z.string().optional(),
  penilai_no_kad:   z.string().optional(),
  penilai_jawatan:  z.string().optional(),
  penilai_lama_mengenali: z.string().optional(),
  penilai_tarikh:   z.string().optional(),
  penilai_semula_nama:    z.string().optional(),
  penilai_semula_no_kad:  z.string().optional(),
  penilai_semula_jawatan: z.string().optional(),
  penilai_semula_tarikh:  z.string().optional(),
});
type EvalFormValues = z.infer<typeof evalSchema>;

const DEFAULT_VALS: EvalFormValues = {
  leader_id: "", period: "", ulasan: "",
  akhlak_personaliti: 1, mutu_kerja: 1, minat_kerja: 1, kebolehpercayaan: 1,
  komunikasi: 1, inisiatif: 1, disiplin_diri: 1, kerjasama: 1,
  keupayaan_ulasan: "", potensi_ulasan: "",
  penilai_nama: "", penilai_no_kad: "", penilai_jawatan: "",
  penilai_lama_mengenali: "", penilai_tarikh: "",
  penilai_semula_nama: "", penilai_semula_no_kad: "",
  penilai_semula_jawatan: "", penilai_semula_tarikh: "",
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
    <div className="rounded-md bg-muted/60 px-3 py-2.5 space-y-1.5" role="status" aria-live="polite">
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

function PerformanceDataCard({ data, isLoading }: { data: LeaderPerformanceData | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <FileText className="h-3.5 w-3.5" />
        Data Prestasi — {data.kampung_name ?? "—"}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-card border p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Laporan Bulanan</span>
            <span className={`text-xs font-semibold tabular-nums ${data.reports.on_time_rate >= 80 ? "text-[var(--success)]" : data.reports.on_time_rate >= 50 ? "text-[var(--warning)]" : "text-destructive"}`}>
              {data.reports.on_time_rate}%
            </span>
          </div>
          <p className="text-2xl font-heading font-bold tabular-nums">
            {data.reports.submitted}<span className="text-sm text-muted-foreground font-normal">/{data.reports.total}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">dihantar on-time</p>
          <div className="flex gap-2 text-[11px]">
            {data.reports.late > 0 && (
              <span className="text-[var(--warning)]">{data.reports.late} lewat</span>
            )}
            {data.reports.draft > 0 && (
              <span className="text-muted-foreground">{data.reports.draft} draf</span>
            )}
          </div>
        </div>

        <div className="rounded-md bg-card border p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase">Isu Komuniti</span>
            <span className={`text-xs font-semibold tabular-nums ${data.issues.resolution_rate >= 60 ? "text-[var(--success)]" : data.issues.resolution_rate >= 30 ? "text-[var(--warning)]" : "text-destructive"}`}>
              {data.issues.resolution_rate}%
            </span>
          </div>
          <p className="text-2xl font-heading font-bold tabular-nums">
            {data.issues.resolved + data.issues.closed}<span className="text-sm text-muted-foreground font-normal">/{data.issues.total}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">selesai ditutup</p>
          <div className="flex gap-2 text-[11px]">
            {data.issues.open > 0 && (
              <span className="text-destructive">{data.issues.open} terbuka</span>
            )}
            {data.issues.in_progress > 0 && (
              <span className="text-[var(--warning)]">{data.issues.in_progress} proses</span>
            )}
          </div>
        </div>
      </div>

      {data.ai_summary && (
        <div className="rounded-md bg-muted/30 border px-3 py-2.5 flex gap-2.5">
          <Bot className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-muted-foreground">{data.ai_summary}</p>
        </div>
      )}
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

  const { control, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<EvalFormValues>({
    resolver: zodResolver(evalSchema),
    defaultValues: DEFAULT_VALS,
  });

  const selectedLeaderId = watch("leader_id");
  const { data: perfData, isLoading: perfLoading } = useLeaderPerformance(selectedLeaderId || null);

  function openDialog() {
    reset(DEFAULT_VALS);
    setDialogOpen(true);
  }

  async function onSubmit(values: EvalFormValues) {
    const scores = Object.fromEntries(SCORE_KEYS.map((k) => [k, Number(values[k])]));
    const payload: Record<string, unknown> = {
      leader_id: values.leader_id,
      period: values.period,
      scores,
      ulasan: values.ulasan || null,
      keupayaan_ulasan: values.keupayaan_ulasan || null,
      potensi_ulasan: values.potensi_ulasan || null,
      penilai_nama: values.penilai_nama || null,
      penilai_no_kad: values.penilai_no_kad || null,
      penilai_jawatan: values.penilai_jawatan || null,
      penilai_lama_mengenali: values.penilai_lama_mengenali || null,
      penilai_tarikh: values.penilai_tarikh || null,
      penilai_semula_nama: values.penilai_semula_nama || null,
      penilai_semula_no_kad: values.penilai_semula_no_kad || null,
      penilai_semula_jawatan: values.penilai_semula_jawatan || null,
      penilai_semula_tarikh: values.penilai_semula_tarikh || null,
    };
    const promise = apiPost("/evaluations", payload);

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

              {selectedLeaderId && <PerformanceDataCard data={perfData} isLoading={perfLoading} />}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Markah Penilaian (1–7 setiap kriteria)</p>
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
                            min={1}
                            max={7}
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

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Penilaian Rasmi</p>
                <Controller
                  name="keupayaan_ulasan"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>(a) Keupayaan menyandang terus jawatan ini</FieldLabel>
                      <Textarea
                        {...field}
                        id={field.name}
                        placeholder="Ulasan keupayaan..."
                        rows={2}
                      />
                    </Field>
                  )}
                />
                <Controller
                  name="potensi_ulasan"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>(b) Potensi dalam kemajuan kerja</FieldLabel>
                      <Textarea
                        {...field}
                        id={field.name}
                        placeholder="Ulasan potensi..."
                        rows={2}
                      />
                    </Field>
                  )}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maklumat Pegawai Penilai</p>
                <div className="grid grid-cols-2 gap-3">
                  <Controller name="penilai_nama" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Nama Penilai</FieldLabel>
                      <Input {...field} id={field.name} placeholder="Nama penuh" />
                    </Field>
                  )} />
                  <Controller name="penilai_no_kad" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>No. Kad Pengenalan</FieldLabel>
                      <Input {...field} id={field.name} placeholder="No. KP" />
                    </Field>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller name="penilai_jawatan" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Jawatan</FieldLabel>
                      <Input {...field} id={field.name} placeholder="Jawatan penilai" />
                    </Field>
                  )} />
                  <Controller name="penilai_lama_mengenali" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Lama Mengenali</FieldLabel>
                      <Input {...field} id={field.name} placeholder="cth: 5 tahun" />
                    </Field>
                  )} />
                </div>
                <Controller name="penilai_tarikh" control={control} render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Tarikh Penilaian</FieldLabel>
                    <Input {...field} id={field.name} type="date" />
                  </Field>
                )} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pegawai Penilai Semula (jika ada)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Controller name="penilai_semula_nama" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Nama Penilai Semula</FieldLabel>
                      <Input {...field} id={field.name} placeholder="Nama penuh" />
                    </Field>
                  )} />
                  <Controller name="penilai_semula_no_kad" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>No. Kad Pengenalan</FieldLabel>
                      <Input {...field} id={field.name} placeholder="No. KP" />
                    </Field>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Controller name="penilai_semula_jawatan" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Jawatan</FieldLabel>
                      <Input {...field} id={field.name} placeholder="Jawatan penilai semula" />
                    </Field>
                  )} />
                  <Controller name="penilai_semula_tarikh" control={control} render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Tarikh</FieldLabel>
                      <Input {...field} id={field.name} type="date" />
                    </Field>
                  )} />
                </div>
              </div>

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
