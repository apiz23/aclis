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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarkerClusterGroup, MapMarker, MapPopup, MapZoomControl, MapFullscreenControl } from "@/components/ui/map";
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

const PONTIAN: [number, number] = [1.4855, 103.3892];

const columns: ColumnDef<KampungSummary>[] = [
  {
    id: "no",
    header: () => <div className="text-center">No.</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-center tabular-nums text-xs text-muted-foreground">{row.index + 1}</div>
    ),
  },
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
    try {
      await apiPost("/kampung", {
        name: values.name,
        mukim_id: values.mukim_id || null,
        b40_count: values.b40_count ?? null,
        profile: values.profile || null,
        lat: values.lat === "" || values.lat === undefined ? null : Number(values.lat),
        lng: values.lng === "" || values.lng === undefined ? null : Number(values.lng),
      });
      setDialogOpen(false);
      reset(EMPTY);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.kampung });
      toast.success("Kampung berjaya ditambah.");
    } catch {
      toast.error("Gagal menambah kampung. Cuba semula.");
    }
  }

  const mappable = (kampungs as KampungSummary[]).filter(k => k.lat != null && k.lng != null);
  const missing = (kampungs as KampungSummary[]).length - mappable.length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Profil Kampung</h1>
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
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "map" ? "default" : "ghost"}
              className="rounded-none px-3"
              onClick={() => setView("map")}
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
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-semibold">Peta Kampung</p>
            {missing > 0 && (
              <p className="text-xs text-muted-foreground">{missing} kampung tiada koordinat</p>
            )}
          </div>
          <MapMount className="h-[480px] w-full">
            <Map center={PONTIAN} zoom={11} className="h-[480px] w-full">
              <MapTileLayer />
              <MapZoomControl />
              <MapFullscreenControl />
              <MapMarkerClusterGroup>
                {mappable.map((k) => (
                  <MapMarker key={k.id} position={[k.lat!, k.lng!]}>
                    <MapPopup>
                      <div className="rounded-lg border bg-card shadow-sm p-3 min-w-[180px]">
                        <p className="font-semibold text-sm mb-0.5">{k.name}</p>
                        {k.mukim_name && <p className="text-xs text-muted-foreground mb-2">{k.mukim_name}</p>}
                        <p className="text-xs text-muted-foreground mb-2">B40: {k.b40_count}</p>
                        <button
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => router.push(`/kampung/${k.id}`)}
                        >
                          Lihat Butiran →
                        </button>
                      </div>
                    </MapPopup>
                  </MapMarker>
                ))}
              </MapMarkerClusterGroup>
            </Map>
          </MapMount>
        </div>
      )}

      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tambah Kampung</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

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
                      {(mukims as MukimOption[]).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">Simpan</LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
