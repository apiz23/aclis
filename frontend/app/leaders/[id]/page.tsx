"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { apiGet, apiPatch, uploadLeaderPhoto } from "@/lib/api";
import { useCurrentUser } from "@/lib/queries";
import { ArrowLeft, ClipboardList, ImageIcon, MapPin, Pencil, X, ZoomIn } from "lucide-react";
import {
  Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle,
  AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentTrigger,
} from "@/components/ui/attachment";
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
  ketua_kampung:    "Ketua Kampung",
  penghulu:         "Penghulu",
  ketua_masyarakat: "Ketua Masyarakat",
};

const TYPE_BADGE: Record<string, string> = {
  ketua_kampung:    "bg-primary/10 text-primary",
  penghulu:         "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ketua_masyarakat: "bg-muted text-muted-foreground",
};

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

function InfoRow({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className={`grid border-b last:border-0 gap-x-8 ${items.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {items.map(({ label, value }, i) => (
        <div key={i} className="py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
          <p className="text-sm">{value ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-3 border-b bg-muted/30">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
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
  const [photoUploadError, setPhotoUploadError] = useState(false);
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
  useEffect(() => {
    if (error) { toast.error("Rekod tidak ditemui atau akses ditolak."); router.replace("/leaders"); }
  }, [error]);

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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leaders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {!loading && data && isAdmin && (
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Kemaskini
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data pemimpin.</p>}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column: photo + identity + stats + map */}
        <div className="lg:w-1/3 shrink-0 flex flex-col gap-4">

          {/* Photo */}
          <button
            type="button"
            className={`relative group w-full rounded-xl overflow-hidden aspect-[4/3] bg-muted ${data?.photo_url ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => data?.photo_url && setPhotoOpen(true)}
            disabled={!data?.photo_url}
          >
            {loading ? (
              <Skeleton className="absolute inset-0 rounded-xl" />
            ) : data?.photo_url ? (
              <img src={data.photo_url} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-muted-foreground/40">
                {initials}
              </span>
            )}
            {data?.photo_url && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </button>

          {/* Identity block */}
          <div className="rounded-lg border bg-card px-5 py-4 space-y-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-24" />
              </div>
            ) : (
              <>
                <h1 className="font-heading text-xl font-bold tracking-tight leading-snug">{data?.name ?? "Pemimpin"}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[data?.type ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                    {TYPE_LABEL[data?.type ?? ""] ?? data?.type ?? "—"}
                  </span>
                  {data?.parti_terkini && (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                      {data.parti_terkini}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Eval stat */}
          <div className="rounded-lg border bg-card px-5 py-3 flex items-center gap-3">
            <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Penilaian</p>
              {loading
                ? <Skeleton className="h-6 w-10 mt-0.5" />
                : <p className="font-heading text-2xl font-bold tabular-nums">{data?.evaluation_count ?? 0}</p>
              }
            </div>
          </div>

          {/* Map */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold">Lokasi Kampung</p>
              {!loading && data?.kampung_name && (
                <span className="ml-auto text-xs text-muted-foreground truncate">{data.kampung_name}</span>
              )}
            </div>
            {!loading && kampungCoords?.lat != null && kampungCoords?.lng != null ? (
              <MapMount className="h-48 w-full">
                <Map center={[kampungCoords.lat, kampungCoords.lng]} zoom={14} className="h-48 w-full">
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
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground/40 bg-muted/20">
                <MapPin className="h-8 w-8" />
                <p className="text-xs font-medium">
                  {loading ? "Memuatkan lokasi…" : "Tiada koordinat kampung"}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right: two info cards stacked */}
        <div className="flex-1 flex flex-col gap-4 stagger-children">
          {/* Card 1: Personal & Role */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <SectionHeader title="Maklumat Peribadi" />
            <div className="px-5">
              {loading ? (
                <div className="py-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <>
                  <InfoField label="Nama Penuh" value={data?.name} />
                  <InfoRow items={[
                    { label: "No. IC", value: data?.ic_no ? <span className="font-mono text-[13px]">{data.ic_no}</span> : null },
                    { label: "Jawatan", value: TYPE_LABEL[data?.type ?? ""] ?? data?.type },
                  ]} />
                  <InfoRow items={[
                    { label: "Tarikh Dilantik", value: data?.tarikh_lantikan },
                    { label: "No. Telefon", value: data?.phone },
                  ]} />
                  <InfoField label="Alamat" value={data?.address} />
                </>
              )}
            </div>
          </div>

          {/* Card 2: Kampung & Politik */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <SectionHeader title="Kampung &amp; Politik" />
            <div className="px-5">
              {loading ? (
                <div className="py-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <>
                  <InfoRow items={[
                    { label: "Kampung", value: data?.kampung_name },
                    { label: "Mukim",   value: data?.mukim_name },
                  ]} />
                  <InfoRow items={[
                    { label: "Parti Lantikan", value: data?.parti_lantikan },
                    { label: "Parti Semasa",   value: data?.parti_terkini },
                  ]} />
                  {data?.kampung_rangkaian && (
                    <InfoField label="Kampung Rangkaian" value={data.kampung_rangkaian} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
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
                    <ScrollArea className="h-60">
                      {kampungs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                    </ScrollArea>
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
                <input
                  id="leader-photo-edit-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={photoUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPhotoUploading(true);
                    setPhotoUploadError(false);
                    try {
                      const url = await uploadLeaderPhoto(file);
                      field.onChange(url);
                      toast.success("Foto berjaya dimuat naik.");
                    } catch {
                      setPhotoUploadError(true);
                      toast.error("Gagal memuat naik foto.");
                    } finally {
                      setPhotoUploading(false);
                    }
                  }}
                />
                <Attachment
                  state={
                    photoUploading ? "uploading"
                    : photoUploadError ? "error"
                    : field.value ? "done"
                    : "idle"
                  }
                  className="w-full"
                >
                  <AttachmentMedia variant={field.value ? "image" : "icon"}>
                    {field.value
                      ? <img src={field.value} alt="Foto pemimpin" />
                      : <ImageIcon />
                    }
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>
                      {photoUploading ? "Memuat naik…"
                        : photoUploadError ? "Muat naik gagal"
                        : field.value ? "Foto sedia"
                        : "Pilih fail foto"}
                    </AttachmentTitle>
                    <AttachmentDescription>
                      {photoUploadError
                        ? "Cuba semula"
                        : field.value
                        ? "JPG · PNG · WEBP"
                        : "Klik untuk pilih gambar"}
                    </AttachmentDescription>
                  </AttachmentContent>
                  {field.value && (
                    <AttachmentActions>
                      <AttachmentAction
                        type="button"
                        aria-label="Padam foto"
                        onClick={() => { field.onChange(""); setPhotoUploadError(false); }}
                      >
                        <X />
                      </AttachmentAction>
                    </AttachmentActions>
                  )}
                  <AttachmentTrigger asChild>
                    <label htmlFor="leader-photo-edit-input" className="cursor-pointer" aria-label="Pilih foto pemimpin" />
                  </AttachmentTrigger>
                </Attachment>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <DialogFooter className="sm:justify-end gap-2">
              <Button type="button" variant="outline" className="min-w-20" onClick={() => setEditOpen(false)}>Batal</Button>
              <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…" className="min-w-24">
                Simpan
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
