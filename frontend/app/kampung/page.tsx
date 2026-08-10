"use client";

import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { KampungMap } from "@/components/kampung-map";
import { apiGet, apiPost } from "@/lib/api";
import { MapPin, Plus, TableIcon, MapIcon } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useCurrentUser, useKampung, QUERY_KEYS } from "@/lib/queries";

interface KampungSummary {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
  lat: number | null;
  lng: number | null;
}

interface MukimOption { id: string; name: string }

const kampungSchema = z.object({
  name: z.string().min(1, "Nama kampung diperlukan."),
  mukim_id: z.string().optional(),
  b40_count: z.coerce.number().min(0, "Tidak boleh negatif.").optional(),
  profile: z.string().optional(),
  lat: z.literal("").or(z.coerce.number().min(-90).max(90)).optional(),
  lng: z.literal("").or(z.coerce.number().min(-180).max(180)).optional(),
});
type KampungFormValues = z.infer<typeof kampungSchema>;

const EMPTY: KampungFormValues = { name: "", mukim_id: "", b40_count: undefined, profile: "", lat: "", lng: "" };

const columns: ColumnDef<KampungSummary>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Nama Kampung" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "mukim_name",
    header: ({ column }) => <SortableHeader column={column} title="Mukim" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.mukim_name ?? "—"}</span>,
  },
  {
    accessorKey: "b40_count",
    header: ({ column }) => (
      <div className="text-right"><SortableHeader column={column} title="Bil. B40" /></div>
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.b40_count}</div>,
  },
  {
    id: "coords",
    header: "Koordinat",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {row.original.lat != null && row.original.lng != null
          ? `${row.original.lat.toFixed(4)}, ${row.original.lng.toFixed(4)}`
          : "—"}
      </span>
    ),
  },
];

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );
}

export default function KampungPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: kampungs = [], isLoading } = useKampung();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"table" | "map">("table");
  const isAdmin = me?.role === "admin_daerah";

  const { data: mukims = [] } = useQuery<MukimOption[]>({
    queryKey: ["mukims"],
    queryFn: () => apiGet("/mukim"),
  });

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<KampungFormValues>({
    resolver: zodResolver(kampungSchema),
    defaultValues: EMPTY,
  });

  function openDialog() {
    reset(EMPTY);
    setDialogOpen(true);
  }

  async function onSubmit(values: KampungFormValues) {
    const promise = apiPost("/kampung", {
      name: values.name,
      mukim_id: values.mukim_id || null,
      b40_count: values.b40_count ?? null,
      profile: values.profile || null,
      lat: values.lat === "" || values.lat === undefined ? null : Number(values.lat),
      lng: values.lng === "" || values.lng === undefined ? null : Number(values.lng),
    });

    toast.promise(promise, {
      loading: "Menyimpan kampung...",
      success: "Kampung berjaya ditambah.",
      error: "Gagal menambah kampung. Cuba semula.",
    });

    try {
      await promise;
      setDialogOpen(false);
      reset(EMPTY);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.kampung });
    } catch {
      // handled by toast.promise
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="heading-page">Profil Kampung</h1>
          <p className="text-sm text-muted-foreground">
            Senarai kampung di bawah Pejabat Daerah Pontian
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              className="rounded-none px-3"
              onClick={() => setView("table")}
              aria-label="Paparan jadual"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "map" ? "default" : "ghost"}
              className="rounded-none px-3"
              onClick={() => setView("map")}
              aria-label="Paparan peta"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={openDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Kampung
            </Button>
          )}
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Senarai Kampung</p>
          </div>
          {isLoading ? <TableSkeleton /> : (kampungs as KampungSummary[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold mb-1">Belum ada data kampung</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Klik &ldquo;Tambah Kampung&rdquo; untuk mula menambah rekod kampung.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={kampungs as KampungSummary[]}
              searchPlaceholder="Cari nama atau mukim..."
              onRowClick={(k) => router.push(`/kampung/${k.id}`)}
            />
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Peta Kampung</p>
          </div>
          <KampungMap height={480} showFilterHint />
        </div>
      )}

      {isAdmin && (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent className="sm:max-w-md flex flex-col gap-0">
            <SheetHeader className="shrink-0"><SheetTitle>Tambah Kampung</SheetTitle></SheetHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">

              <Controller name="name" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama Kampung *</FieldLabel>
                  <Input {...field} id={field.name} placeholder="cth: Kg. Parit Sulong" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="mukim_id" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Mukim</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih mukim..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {(mukims as MukimOption[]).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="b40_count" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Bilangan Isi Rumah B40</FieldLabel>
                  <Input {...field} value={field.value ?? ""} id={field.name} type="number" min={0} placeholder="0" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <Controller name="lat" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Latitud</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id={field.name} type="number" step="any" placeholder="1.4855" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="lng" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Longitud</FieldLabel>
                    <Input {...field} value={field.value ?? ""} id={field.name} type="number" step="any" placeholder="103.3892" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              <Controller name="profile" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Profil Kampung</FieldLabel>
                  <Textarea {...field} id={field.name} placeholder="Huraikan latar belakang kampung..." rows={3} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

            </div>
              <SheetFooter className="shrink-0 border-t px-4 py-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">Simpan</LoadingButton>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      )}
    </AppLayout>
  );
}
