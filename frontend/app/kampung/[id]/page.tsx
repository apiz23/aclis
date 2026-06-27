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
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { QUERY_KEYS, useCurrentUser } from "@/lib/queries";
import { ArrowLeft, MapPin, Pencil, Trash2, UserPlus } from "lucide-react";
import { useMapEvents } from "react-leaflet";

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

interface Resident {
  id: string;
  kampung_id: string | null;
  name: string | null;
  ic_no: string | null;
  phone: string | null;
  b40_status: boolean;
  address: string | null;
}

const residentSchema = z.object({
  name:       z.string().min(1, "Nama diperlukan."),
  ic_no:      z.string().optional(),
  phone:      z.string().optional(),
  b40_status: z.boolean(),
  address:    z.string().optional(),
});
type ResidentValues = z.infer<typeof residentSchema>;

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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
  const [picking, setPicking] = useState(false);

  const [residentDialogOpen, setResidentDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: residents = [], isLoading: residentsLoading } = useQuery<Resident[]>({
    queryKey: ["residents", id],
    queryFn: () => apiGet(`/kampung/${id}/residents`),
  });

  const residentForm = useForm<ResidentValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: { name: "", ic_no: "", phone: "", b40_status: false, address: "" },
  });

  function openAddResident() {
    setEditingResident(null);
    residentForm.reset({ name: "", ic_no: "", phone: "", b40_status: false, address: "" });
    setResidentDialogOpen(true);
  }

  function openEditResident(r: Resident) {
    setEditingResident(r);
    residentForm.reset({
      name:       r.name ?? "",
      ic_no:      r.ic_no ?? "",
      phone:      r.phone ?? "",
      b40_status: r.b40_status,
      address:    r.address ?? "",
    });
    setResidentDialogOpen(true);
  }

  async function onResidentSubmit(values: ResidentValues) {
    try {
      if (editingResident) {
        await apiPatch(`/residents/${editingResident.id}`, {
          name:       values.name,
          ic_no:      values.ic_no || null,
          phone:      values.phone || null,
          b40_status: values.b40_status,
          address:    values.address || null,
        });
        toast.success("Maklumat penduduk dikemaskini.");
      } else {
        await apiPost(`/kampung/${id}/residents`, {
          kampung_id: id,
          name:       values.name,
          ic_no:      values.ic_no || null,
          phone:      values.phone || null,
          b40_status: values.b40_status,
          address:    values.address || null,
        });
        toast.success("Penduduk berjaya ditambah.");
      }
      setResidentDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["residents", id] });
      qc.invalidateQueries({ queryKey: ["kampung", id] });
    } catch {
      toast.error("Gagal menyimpan. Cuba semula.");
    }
  }

  async function deleteResident(residentId: string) {
    if (!confirm("Padam rekod penduduk ini?")) return;
    setDeletingId(residentId);
    try {
      await apiDelete(`/residents/${residentId}`);
      toast.success("Rekod penduduk dipadam.");
      qc.invalidateQueries({ queryKey: ["residents", id] });
      qc.invalidateQueries({ queryKey: ["kampung", id] });
    } catch {
      toast.error("Gagal memadam. Cuba semula.");
    } finally {
      setDeletingId(null);
    }
  }

  const { control, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<EditValues>({
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
          {isAdmin && !isLoading && data && (
            <div className="px-5 py-3 border-t">
              {!picking && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPicking(true);
                    openEdit();
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Tetapkan Lokasi
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Residents section */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">
            Senarai Penduduk
            {!residentsLoading && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({residents.length} rekod
                {(() => {
                  const b40 = residents.filter(r => r.b40_status).length;
                  return b40 > 0 ? `, ${b40} B40` : "";
                })()})
              </span>
            )}
          </p>
          {isAdmin && !isLoading && data && (
            <Button size="sm" variant="outline" onClick={openAddResident}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Tambah Penduduk
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          {residentsLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : residents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
              Tiada rekod penduduk.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Nama</th>
                  <th className="px-4 py-2 text-left font-medium">No. IC</th>
                  <th className="px-4 py-2 text-left font-medium">Telefon</th>
                  <th className="px-4 py-2 text-left font-medium">Alamat</th>
                  <th className="px-4 py-2 text-center font-medium">B40</th>
                  {isAdmin && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{r.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{r.ic_no ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.phone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate">{r.address ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      {r.b40_status ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">B40</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditResident(r)} aria-label="Edit penduduk">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteResident(r.id)}
                            disabled={deletingId === r.id}
                            aria-label="Padam penduduk"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Resident add/edit dialog */}
      {isAdmin && (
        <Dialog open={residentDialogOpen} onOpenChange={setResidentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingResident ? "Kemaskini Penduduk" : "Tambah Penduduk"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={residentForm.handleSubmit(onResidentSubmit)} className="space-y-3 pt-1">

              <Controller name="name" control={residentForm.control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="ic_no" control={residentForm.control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>No. IC</FieldLabel>
                  <Input {...field} id={field.name} placeholder="900101-01-1234" />
                </Field>
              )} />

              <Controller name="phone" control={residentForm.control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Telefon</FieldLabel>
                  <Input {...field} id={field.name} placeholder="0123456789" />
                </Field>
              )} />

              <Controller name="address" control={residentForm.control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Alamat</FieldLabel>
                  <Input {...field} id={field.name} />
                </Field>
              )} />

              <Controller name="b40_status" control={residentForm.control} render={({ field }) => (
                <Field>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="b40_status"
                      checked={field.value}
                      onChange={e => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FieldLabel htmlFor="b40_status" className="!mb-0 cursor-pointer">Golongan B40</FieldLabel>
                  </div>
                </Field>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResidentDialogOpen(false)}>Batal</Button>
                <LoadingButton
                  type="submit"
                  loading={residentForm.formState.isSubmitting}
                  loadingText="Menyimpan…"
                >
                  Simpan
                </LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit dialog */}
      {isAdmin && (
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setPicking(false);
          }}
        >
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

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setValue("lat", pos.coords.latitude);
                      setValue("lng", pos.coords.longitude);
                    },
                    () => toast.error("Gagal mendapat lokasi. Pastikan kebenaran lokasi diberikan.")
                  );
                }}
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                Guna Lokasi Semasa
              </Button>

              {/* Map picker */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Atau klik pada peta untuk tetapkan koordinat</p>
                <MapMount className="h-48 w-full rounded-md overflow-hidden border">
                  <Map
                    center={
                      (watch("lat") && watch("lng"))
                        ? [Number(watch("lat")), Number(watch("lng"))]
                        : (hasCoords ? [data!.lat!, data!.lng!] : [1.4855, 103.3892])
                    }
                    zoom={hasCoords ? 14 : 11}
                    className="h-48 w-full"
                  >
                    <MapTileLayer />
                    <MapZoomControl />
                    <MapClickHandler onPick={(lat, lng) => {
                      setValue("lat", lat);
                      setValue("lng", lng);
                    }} />
                    {(watch("lat") && watch("lng")) && (
                      <MapMarker position={[Number(watch("lat")), Number(watch("lng"))]}>
                        <MapPopup>
                          <p className="text-sm font-semibold">{data?.name}</p>
                        </MapPopup>
                      </MapMarker>
                    )}
                  </Map>
                </MapMount>
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
