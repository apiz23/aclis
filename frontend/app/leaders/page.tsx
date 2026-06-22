"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { apiGet, apiPost } from "@/lib/api";
import { Users, Plus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

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

const TYPE_BADGE: Record<string, string> = {
  ketua_kampung: "bg-primary/10 text-primary",
  penghulu: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const AVATAR_BG: Record<string, string> = {
  ketua_kampung: "bg-primary/10 text-primary",
  penghulu: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const leaderSchema = z.object({
  name: z.string().min(1, "Nama diperlukan."),
  type: z.string().min(1, "Sila pilih jawatan."),
  kampung_id: z.string().optional(),
  tarikh_lantikan: z.string().optional(),
  parti_lantikan: z.string().optional(),
  parti_terkini: z.string().optional(),
  photo_url: z.string().optional(),
});
type LeaderFormValues = z.infer<typeof leaderSchema>;

const EMPTY: LeaderFormValues = {
  name: "", type: "", kampung_id: "", tarikh_lantikan: "",
  parti_lantikan: "", parti_terkini: "", photo_url: "",
};

const columns: ColumnDef<LeaderSummary>[] = [
  {
    id: "no",
    header: () => <div className="text-center">No.</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-center tabular-nums text-xs text-muted-foreground">{row.index + 1}</div>
    ),
  },
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
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[row.original.type] ?? "bg-muted text-muted-foreground"}`}>
        {TYPE_LABEL[row.original.type] ?? row.original.type}
      </span>
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
  const [leaders, setLeaders]       = useState<LeaderSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kampungs, setKampungs]     = useState<KampungOption[]>([]);
  const router = useRouter();

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<LeaderFormValues>({
    resolver: zodResolver(leaderSchema),
    defaultValues: EMPTY,
  });

  function load() {
    setLoading(true);
    apiGet("/leaders").then(setLeaders).catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function openDialog() {
    reset(EMPTY);
    setDialogOpen(true);
    if (kampungs.length === 0) {
      apiGet("/kampung").then((list: KampungOption[]) => setKampungs(list)).catch(() => {});
    }
  }

  async function onSubmit(values: LeaderFormValues) {
    try {
      await apiPost("/leaders", {
        name: values.name,
        type: values.type,
        kampung_id: values.kampung_id || null,
        tarikh_lantikan: values.tarikh_lantikan || null,
        parti_lantikan: values.parti_lantikan || null,
        parti_terkini: values.parti_terkini || null,
        photo_url: values.photo_url || null,
      });
      setDialogOpen(false);
      reset(EMPTY);
      load();
      toast.success("Pemimpin berjaya ditambah.");
    } catch {
      toast.error("Gagal menambah pemimpin. Cuba semula.");
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Pemimpin</h1>
          <p className="text-sm text-muted-foreground">Senarai Ketua Kampung &amp; Penghulu daerah Pontian</p>
        </div>
        <Button size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Tambah Pemimpin
        </Button>
      </div>

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Pemimpin</p>
        </div>

        {loading ? <TableSkeleton /> : leaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Tiada rekod pemimpin</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={leaders}
            searchPlaceholder="Cari nama atau kampung..."
            onRowClick={(l) => router.push(`/leaders/${l.id}`)}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tambah Pemimpin</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama *</FieldLabel>
                  <Input {...field} id={field.name} placeholder="Nama penuh" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="type"
              control={control}
              render={({ field, fieldState }) => (
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
              )}
            />

            <Controller
              name="kampung_id"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kampung</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih kampung..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kampungs.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="tarikh_lantikan"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Tarikh Lantikan</FieldLabel>
                  <Input {...field} id={field.name} type="date" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="parti_lantikan"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Parti Lantikan</FieldLabel>
                    <Input {...field} id={field.name} placeholder="cth: UMNO" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="parti_terkini"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Parti Terkini</FieldLabel>
                    <Input {...field} id={field.name} placeholder="cth: UMNO" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="photo_url"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>URL Foto</FieldLabel>
                  <Input {...field} id={field.name} placeholder="https://..." aria-invalid={fieldState.invalid} />
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
