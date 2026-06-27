"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { apiGet, apiPatch, uploadLeaderPhoto } from "@/lib/api";
import { useCurrentUser } from "@/lib/queries";
import { ArrowLeft, ClipboardList, Pencil, ZoomIn } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarker, MapPopup, MapZoomControl } from "@/components/ui/map";

interface LeaderDetail {
  id: string;
  name: string;
  ic_no: string | null;
  type: string;
  kampung_id: string | null;
  kampung_name: string | null;
  mukim_name: string | null;
  tarikh_lantikan: string | null;
  photo_url: string | null;
  parti_lantikan: string | null;
  parti_terkini: string | null;
  evaluation_count: number;
  phone: string | null;
  address: string | null;
  kampung_rangkaian: string | null;
}

interface KampungOption { id: string; name: string }

interface KampungCoords { lat: number | null; lng: number | null; name: string }

const TYPE_LABEL: Record<string, string> = {
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

const editSchema = z.object({
  name:              z.string().min(1, "Nama diperlukan."),
  type:              z.string().min(1, "Sila pilih jawatan."),
  kampung_id:        z.string().optional(),
  ic_no:             z.string().optional(),
  tarikh_lantikan:   z.string().optional(),
  parti_lantikan:    z.string().optional(),
  parti_terkini:     z.string().optional(),
  phone:             z.string().optional(),
  address:           z.string().optional(),
  kampung_rangkaian: z.string().optional(),
  photo_url:         z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

export default function LeaderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";

  const [data, setData]           = useState<LeaderDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [kampungs, setKampungs]   = useState<KampungOption[]>([]);

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  });

  const { data: kampungCoords } = useQuery<KampungCoords>({
    queryKey: ["kampung", data?.kampung_id],
    queryFn: () => apiGet(`/kampung/${data!.kampung_id}`),
    enabled: !!data?.kampung_id,
    staleTime: 5 * 60_000,
  });

  function load() {
    setLoading(true);
    apiGet(`/leaders/${id}`)
      .then((d: LeaderDetail) => { setData(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  function openEdit() {
    if (!data) return;
    reset({
      name:              data.name,
      type:              data.type,
      kampung_id:        data.kampung_id ?? "",
      ic_no:             data.ic_no ?? "",
      tarikh_lantikan:   data.tarikh_lantikan ?? "",
      parti_lantikan:    data.parti_lantikan ?? "",
      parti_terkini:     data.parti_terkini ?? "",
      phone:             data.phone ?? "",
      address:           data.address ?? "",
      kampung_rangkaian: data.kampung_rangkaian ?? "",
      photo_url:         data.photo_url ?? "",
    });
    setEditOpen(true);
    if (kampungs.length === 0) {
      apiGet("/kampung").then((list: KampungOption[]) => setKampungs(list)).catch(() => {});
    }
  }

  async function onSubmit(values: EditValues) {
    const payload: Record<string, string | null> = {};
    const fields: (keyof EditValues)[] = [
      "name","type","kampung_id","ic_no","tarikh_lantikan",
      "parti_lantikan","parti_terkini","phone","address","kampung_rangkaian","photo_url",
    ];
    for (const f of fields) {
      const v = values[f];
      payload[f] = (v === "" || v === undefined) ? null : v;
    }
    // type is required, never null
    payload["name"] = values.name;
    payload["type"] = values.type;

    try {
      await apiPatch(`/leaders/${id}`, payload);
      setEditOpen(false);
      load();
      toast.success("Maklumat pemimpin dikemaskini.");
    } catch {
      toast.error("Gagal kemaskini. Cuba semula.");
    }
  }

  const initials = data?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?";

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leaders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {loading ? <Skeleton className="h-7 w-56" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">{data?.name ?? "Pemimpin"}</h1>
          )}
          <p className="text-sm text-muted-foreground">
            {loading ? "—" : (TYPE_LABEL[data?.type ?? ""] ?? data?.type ?? "—")}
          </p>
        </div>
        {!loading && data && isAdmin && (
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Kemaskini
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data pemimpin.</p>}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Photo + eval count */}
        <div className="flex flex-col items-center gap-4 md:w-48 shrink-0">
          <button
            type="button"
            className={`relative group ${data?.photo_url ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => data?.photo_url && setPhotoOpen(true)}
            disabled={!data?.photo_url}
          >
            <Avatar className="h-28 w-28 rounded-xl">
              {data?.photo_url && <AvatarImage src={data.photo_url} alt={data.name} className="object-cover" />}
              <AvatarFallback className="rounded-xl text-2xl font-bold">
                {loading ? "?" : initials}
              </AvatarFallback>
            </Avatar>
            {data?.photo_url && (
              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </button>
          <div className="rounded-lg border bg-card p-4 text-center w-full">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Penilaian</p>
            </div>
            {loading ? <Skeleton className="h-8 w-12 mx-auto" /> : (
              <p className="font-heading text-2xl font-bold tabular-nums">{data?.evaluation_count ?? 0}</p>
            )}
          </div>
        </div>

        {/* Detail fields */}
        <div className="flex-1 rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Maklumat Pemimpin</p>
          </div>
          <div className="px-5">
            {loading ? (
              <div className="py-4 space-y-3">
                {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                <InfoField label="Nama Penuh"        value={data?.name} />
                <InfoField label="No. IC"            value={data?.ic_no} />
                <InfoField label="Jawatan"           value={TYPE_LABEL[data?.type ?? ""] ?? data?.type} />
                <InfoField label="Kampung"           value={data?.kampung_name} />
                <InfoField label="Mukim"             value={data?.mukim_name} />
                <InfoField label="Tarikh Dilantik"   value={data?.tarikh_lantikan} />
                <InfoField label="Parti Lantikan"    value={data?.parti_lantikan} />
                <InfoField label="Parti Semasa"      value={data?.parti_terkini} />
                <InfoField label="No. Telefon"       value={data?.phone} />
                <InfoField label="Alamat"            value={data?.address} />
                <InfoField label="Kampung Rangkaian" value={data?.kampung_rangkaian} />
              </>
            )}
          </div>
        </div>

        {/* Map card */}
        {!loading && kampungCoords?.lat != null && kampungCoords?.lng != null && (
          <div className="rounded-lg border bg-card overflow-hidden md:w-72 shrink-0">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Lokasi Kampung</p>
            </div>
            <MapMount className="h-56 w-full">
              <Map center={[kampungCoords.lat, kampungCoords.lng]} zoom={14} className="h-56 w-full">
                <MapTileLayer />
                <MapZoomControl />
                <MapMarker position={[kampungCoords.lat, kampungCoords.lng]}>
                  <MapPopup>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="font-semibold text-sm">{kampungCoords.name}</p>
                    </div>
                  </MapPopup>
                </MapMarker>
              </Map>
            </MapMount>
          </div>
        )}
      </div>

      {/* Photo dialog */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-xs p-4" showCloseButton>
          <DialogHeader>
            <DialogTitle>{data?.name}</DialogTitle>
          </DialogHeader>
          {data?.photo_url && (
            <img src={data.photo_url} alt={data?.name ?? ""} className="w-full rounded-lg object-cover" />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Kemaskini Pemimpin</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">

            <Controller name="name" control={control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="type" control={control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Jawatan *</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Pilih jawatan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ketua_kampung">Ketua Kampung</SelectItem>
                    <SelectItem value="penghulu">Penghulu</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <Controller name="kampung_id" control={control} render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Kampung</FieldLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Pilih kampung..." />
                  </SelectTrigger>
                  <SelectContent>
                    {kampungs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <Controller name="ic_no" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>No. IC</FieldLabel>
                  <Input {...field} id={field.name} placeholder="650310036782" />
                </Field>
              )} />
              <Controller name="tarikh_lantikan" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Tarikh Lantikan</FieldLabel>
                  <Input {...field} id={field.name} type="date" />
                </Field>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Controller name="parti_lantikan" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Parti Lantikan</FieldLabel>
                  <Input {...field} id={field.name} placeholder="cth: UMNO" />
                </Field>
              )} />
              <Controller name="parti_terkini" control={control} render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Parti Semasa</FieldLabel>
                  <Input {...field} id={field.name} placeholder="cth: UMNO" />
                </Field>
              )} />
            </div>

            <Controller name="phone" control={control} render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>No. Telefon</FieldLabel>
                <Input {...field} id={field.name} placeholder="011-XXXXXXXX" />
              </Field>
            )} />

            <Controller name="address" control={control} render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Alamat</FieldLabel>
                <Input {...field} id={field.name} placeholder="No. X, Jalan..." />
              </Field>
            )} />

            <Controller name="kampung_rangkaian" control={control} render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Kampung Rangkaian</FieldLabel>
                <Input {...field} id={field.name} placeholder="Nama kampung rangkaian" />
              </Field>
            )} />

            <Controller name="photo_url" control={control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Foto</FieldLabel>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                      {photoUploading ? "Memuat naik…" : "Pilih fail foto"}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={photoUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPhotoUploading(true);
                        try {
                          const url = await uploadLeaderPhoto(file);
                          field.onChange(url);
                          toast.success("Foto berjaya dimuat naik.");
                        } catch {
                          toast.error("Gagal memuat naik foto.");
                        } finally {
                          setPhotoUploading(false);
                        }
                      }}
                    />
                  </label>
                  {field.value && (
                    <div className="flex items-center gap-2">
                      <img src={field.value} alt="preview" className="h-10 w-10 rounded-full object-cover border" />
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">{field.value}</span>
                      <button
                        type="button"
                        onClick={() => field.onChange("")}
                        className="text-xs text-destructive hover:underline shrink-0"
                      >
                        Padam
                      </button>
                    </div>
                  )}
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
              <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">
                Simpan
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
