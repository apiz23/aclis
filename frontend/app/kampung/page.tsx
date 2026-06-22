"use client";

import { useEffect, useState } from "react";
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
import { apiGet, apiPost } from "@/lib/api";
import { MapPin, Plus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

interface KampungSummary {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
}

interface MukimOption { id: string; name: string }

const kampungSchema = z.object({
  name: z.string().min(1, "Nama kampung diperlukan."),
  mukim_id: z.string().optional(),
  b40_count: z.coerce.number().min(0, "Tidak boleh negatif.").optional(),
  profile: z.string().optional(),
});
type KampungFormValues = z.infer<typeof kampungSchema>;

const EMPTY: KampungFormValues = { name: "", mukim_id: "", b40_count: undefined, profile: "" };

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
      <div className="text-right">
        <SortableHeader column={column} title="Bil. B40" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.b40_count}</div>
    ),
  },
  {
    accessorKey: "profile",
    header: "Profil",
    cell: ({ row }) => (
      <span className="text-muted-foreground truncate max-w-[200px] block">
        {row.original.profile ?? "—"}
      </span>
    ),
  },
];

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function KampungPage() {
  const [kampungs, setKampungs]     = useState<KampungSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mukims, setMukims]         = useState<MukimOption[]>([]);
  const router = useRouter();

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<KampungFormValues>({
    resolver: zodResolver(kampungSchema),
    defaultValues: EMPTY,
  });

  function load() {
    setLoading(true);
    apiGet("/kampung").then(setKampungs).catch(() => setKampungs([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openDialog() {
    reset(EMPTY);
    setDialogOpen(true);
    if (mukims.length === 0) {
      apiGet("/mukim").then((list: MukimOption[]) => setMukims(list)).catch(() => {});
    }
  }

  async function onSubmit(values: KampungFormValues) {
    try {
      await apiPost("/kampung", {
        name: values.name,
        mukim_id: values.mukim_id || null,
        b40_count: values.b40_count ?? null,
        profile: values.profile || null,
      });
      setDialogOpen(false);
      reset(EMPTY);
      load();
      toast.success("Kampung berjaya ditambah.");
    } catch {
      toast.error("Gagal menambah kampung. Cuba semula.");
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Profil Kampung</h1>
          <p className="text-sm text-muted-foreground">
            Senarai kampung di bawah Pejabat Daerah Pontian
          </p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Tambah Kampung
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Kampung</p>
        </div>

        {loading ? <TableSkeleton /> : kampungs.length === 0 ? (
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
            data={kampungs}
            searchPlaceholder="Cari nama atau mukim..."
            onRowClick={(k) => router.push(`/kampung/${k.id}`)}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Tambah Kampung</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama Kampung *</FieldLabel>
                  <Input {...field} id={field.name} placeholder="cth: Kg. Parit Sulong" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="mukim_id"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Mukim</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih mukim..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mukims.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="b40_count"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Bilangan Isi Rumah B40</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id={field.name}
                    type="number"
                    min={0}
                    placeholder="0"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="profile"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Profil Kampung</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="Huraikan latar belakang kampung..."
                    rows={3}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
