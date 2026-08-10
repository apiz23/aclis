"use client";

import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { apiGet, apiPost } from "@/lib/api";
import Image from "next/image";
import { Users, Plus, ImageIcon, X } from "lucide-react";
import {
  Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle,
  AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentTrigger,
} from "@/components/ui/attachment";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useCurrentUser, useLeaders, QUERY_KEYS } from "@/lib/queries";

interface LeaderSummary {
  id: string; name: string; ic_no: string | null; type: string;
  kampung_id: string | null; kampung_name: string | null;
  tarikh_lantikan: string | null; photo_url: string | null;
  parti_lantikan: string | null; parti_terkini: string | null;
}

interface KampungOption { id: string; name: string }

const TYPE_LABEL: Record<string, string> = {
  ketua_kampung: "Ketua Kampung",
  penghulu: "Penghulu",
};

const TYPE_BADGE: Record<string, "primary" | "warning"> = {
  ketua_kampung: "primary",
  penghulu: "warning",
};

const AVATAR_BG: Record<string, string> = {
  ketua_kampung: "bg-primary/10 text-primary",
  penghulu: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const leaderSchema = z.object({
  name:            z.string().min(1, "Nama diperlukan."),
  type:            z.string().min(1, "Sila pilih jawatan."),
  ic_no:           z.string().optional(),
  kampung_id:      z.string().optional(),
  tarikh_lantikan: z.string().optional(),
  parti_lantikan:  z.string().optional(),
  parti_terkini:   z.string().optional(),
  photo_url:       z.string().optional(),
});
type LeaderFormValues = z.infer<typeof leaderSchema>;

const EMPTY: LeaderFormValues = {
  name: "", type: "", ic_no: "", kampung_id: "", tarikh_lantikan: "",
  parti_lantikan: "", parti_terkini: "", photo_url: "",
};

const columns: ColumnDef<LeaderSummary>[] = [
  {
    id: "avatar",
    header: "",
    enableSorting: false,
    enableHiding: false,
    cell: ({ row: { original: l } }) => (
      <Avatar className="h-8 w-8">
        {l.photo_url && <AvatarImage src={l.photo_url} alt={l.name} />}
        <AvatarFallback className={`text-xs font-semibold ${AVATAR_BG[l.type] ?? "bg-muted"}`}>
          {initials(l.name)}
        </AvatarFallback>
      </Avatar>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Nama" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column} title="Jawatan" />,
    cell: ({ row }) => (
      <Badge variant={TYPE_BADGE[row.original.type] ?? "secondary"}>
        {TYPE_LABEL[row.original.type] ?? row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "kampung_name",
    header: ({ column }) => <SortableHeader column={column} title="Kampung" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.kampung_name ?? "—"}</span>,
  },
  {
    accessorKey: "tarikh_lantikan",
    header: ({ column }) => <SortableHeader column={column} title="Tarikh Lantikan" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{row.original.tarikh_lantikan ?? "—"}</span>
    ),
  },
  {
    accessorKey: "parti_terkini",
    header: "Parti",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.parti_terkini ?? "—"}</span>,
  },
];

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

export default function LeadersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: leaders = [], isLoading } = useLeaders();
  const { data: kampungs = [] } = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState(false);
  const isAdmin = me?.role === "admin_daerah";

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<LeaderFormValues>({
    resolver: zodResolver(leaderSchema),
    defaultValues: EMPTY,
  });

  function openDialog() {
    reset(EMPTY);
    setDialogOpen(true);
  }

  async function onSubmit(values: LeaderFormValues) {
    const promise = apiPost("/leaders", {
      name:            values.name,
      type:            values.type,
      ic_no:           values.ic_no || null,
      kampung_id:      values.kampung_id || null,
      tarikh_lantikan: values.tarikh_lantikan || null,
      parti_lantikan:  values.parti_lantikan || null,
      parti_terkini:   values.parti_terkini || null,
      photo_url:       values.photo_url || null,
    });

    toast.promise(promise, {
      loading: "Menyimpan pemimpin...",
      success: "Pemimpin berjaya ditambah.",
      error: "Gagal menambah pemimpin. Cuba semula.",
    });

    try {
      await promise;
      setDialogOpen(false);
      reset(EMPTY);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.leaders });
    } catch {
      // handled by toast.promise
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="heading-page">Pemimpin</h1>
          <p className="text-sm text-muted-foreground">Senarai Ketua Kampung &amp; Penghulu daerah Pontian</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Pemimpin
          </Button>
        )}
      </div>

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Pemimpin</p>
        </div>

        {isLoading ? <TableSkeleton /> : (leaders as LeaderSummary[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Tiada rekod pemimpin</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={leaders as LeaderSummary[]}
            searchPlaceholder="Cari nama atau kampung..."
            onRowClick={(l) => router.push(`/pemimpin/${l.id}`)}
          />
        )}
      </div>

      {isAdmin && (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent className="sm:max-w-md flex flex-col gap-0">
            <SheetHeader className="shrink-0"><SheetTitle>Tambah Pemimpin</SheetTitle></SheetHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">

              <Controller name="name" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
                  <Input {...field} id={field.name} placeholder="Nama penuh" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="ic_no" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>No. KP</FieldLabel>
                  <Input {...field} id={field.name} placeholder="cth: 900101-01-1234" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="type" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jawatan *</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} name={field.name}>
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

              <Controller name="kampung_id" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kampung</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih kampung..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {(kampungs as KampungOption[]).map((k) => (
                          <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="tarikh_lantikan" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Tarikh Lantikan</FieldLabel>
                  <Input {...field} id={field.name} type="date" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <Controller name="parti_lantikan" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Parti Lantikan</FieldLabel>
                    <Input {...field} id={field.name} placeholder="cth: UMNO" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="parti_terkini" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Parti Terkini</FieldLabel>
                    <Input {...field} id={field.name} placeholder="cth: UMNO" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              <Controller name="photo_url" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Foto</FieldLabel>
                  <input
                    id="leader-photo-input"
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
                        const { uploadLeaderPhoto } = await import("@/lib/api");
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
                        ? <Image src={field.value} alt="Foto pemimpin" width={80} height={80} className="object-cover" />
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
                      <label htmlFor="leader-photo-input" className="cursor-pointer" aria-label="Pilih foto pemimpin" />
                    </AttachmentTrigger>
                  </Attachment>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

            </div>
              <SheetFooter className="shrink-0 border-t sm:justify-end gap-2 px-4 py-4">
                <Button type="button" variant="outline" className="min-w-20" onClick={() => setDialogOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…" className="min-w-24">
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
