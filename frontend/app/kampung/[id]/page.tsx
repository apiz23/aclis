"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarker, MapPopup, MapZoomControl } from "@/components/ui/map";
import { LoadingButton } from "@/components/ui/loading-button";
import { apiGet, apiPatch } from "@/lib/api";
import { QUERY_KEYS, useCurrentUser } from "@/lib/queries";
import { ArrowLeft, Pencil } from "lucide-react";

interface KampungDetail {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
  lat: number | null;
  lng: number | null;
  resident_count: number;
}

interface MukimOption { id: string; name: string }

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

const editSchema = z.object({
  name:      z.string().min(1, "Nama diperlukan."),
  mukim_id:  z.string().optional(),
  b40_count: z.coerce.number().min(0).optional().or(z.literal("")),
  profile:   z.string().optional(),
  lat:       z.literal("").or(z.coerce.number().min(-90).max(90)).optional(),
  lng:       z.literal("").or(z.coerce.number().min(-180).max(180)).optional(),
});
type EditValues = z.infer<typeof editSchema>;

export default function KampungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";

  const { data, isLoading, error } = useQuery<KampungDetail>({
    queryKey: ["kampung", id],
    queryFn: () => apiGet(`/kampung/${id}`),
  });

  const { data: mukims = [] } = useQuery<MukimOption[]>({
    queryKey: ["mukims"],
    queryFn: () => apiGet("/mukim"),
    enabled: isAdmin,
  });

  const [editOpen, setEditOpen] = useState(false);
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  });

  function openEdit() {
    if (!data) return;
    reset({
      name:      data.name,
      mukim_id:  data.mukim_id ?? "",
      b40_count: data.b40_count,
      profile:   data.profile ?? "",
      lat:       data.lat ?? "",
      lng:       data.lng ?? "",
    });
    setEditOpen(true);
  }

  async function onSubmit(values: EditValues) {
    const toNum = (v: unknown) => (v === "" || v === undefined) ? null : Number(v);
    try {
      await apiPatch(`/kampung/${id}`, {
        name:      values.name,
        mukim_id:  values.mukim_id || null,
        b40_count: toNum(values.b40_count),
        profile:   values.profile || null,
        lat:       toNum(values.lat),
        lng:       toNum(values.lng),
      });
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["kampung", id] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.kampung });
      toast.success("Maklumat kampung dikemaskini.");
    } catch {
      toast.error("Gagal kemaskini. Cuba semula.");
    }
  }

  const hasCoords = data?.lat != null && data?.lng != null;
  const center: [number, number] = hasCoords ? [data!.lat!, data!.lng!] : [1.4855, 103.3892];

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/kampung")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isLoading ? <Skeleton className="h-7 w-48" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">{data?.name ?? "Kampung"}</h1>
          )}
          <p className="text-sm text-muted-foreground">{data?.mukim_name ?? "—"}</p>
        </div>
        {!isLoading && data && isAdmin && (
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Kemaskini
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data kampung.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info card */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Maklumat Kampung</p>
          </div>
          <div className="px-5">
            {isLoading ? (
              <div className="py-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                <InfoField label="Nama Kampung" value={data?.name} />
                <InfoField label="Mukim" value={data?.mukim_name} />
                <InfoField label="Profil" value={data?.profile} />
                <InfoField label="Bilangan B40" value={data?.b40_count} />
                <InfoField label="Bilangan Penduduk" value={data?.resident_count} />
                <InfoField
                  label="Koordinat"
                  value={hasCoords
                    ? `${data!.lat!.toFixed(6)}, ${data!.lng!.toFixed(6)}`
                    : <span className="text-muted-foreground italic text-xs">Tiada koordinat — klik Kemaskini untuk tambah</span>
                  }
                />
              </>
            )}
          </div>
        </div>

        {/* Map card */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Lokasi</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-none" />
          ) : (
            <MapMount className="h-56 w-full">
              <Map center={center} zoom={hasCoords ? 14 : 11} className="h-56 w-full">
                <MapTileLayer />
                <MapZoomControl />
                {hasCoords && (
                  <MapMarker position={[data!.lat!, data!.lng!]}>
                    <MapPopup>
                      <div className="rounded-lg border bg-card p-3 min-w-[140px]">
                        <p className="font-semibold text-sm">{data?.name}</p>
                        {data?.mukim_name && <p className="text-xs text-muted-foreground">{data.mukim_name}</p>}
                      </div>
                    </MapPopup>
                  </MapMarker>
                )}
              </Map>
            </MapMount>
          )}
          {!isLoading && !hasCoords && (
            <p className="px-5 py-3 text-xs text-muted-foreground">
              Tiada koordinat — tambah lat/lng untuk paparkan pin pada peta.
            </p>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      {isAdmin && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Kemaskini Kampung</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">

              <Controller name="name" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="mukim_id" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Mukim</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name}><SelectValue placeholder="Pilih mukim..." /></SelectTrigger>
                    <SelectContent>
                      {(mukims as MukimOption[]).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )} />

              <Controller name="b40_count" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Bilangan B40</FieldLabel>
                  <Input {...field} value={field.value ?? ""} id={field.name} type="number" min={0} aria-invalid={fieldState.invalid} />
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

              <Controller name="profile" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Profil</FieldLabel>
                  <Textarea {...field} id={field.name} rows={3} />
                </Field>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">Simpan</LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
