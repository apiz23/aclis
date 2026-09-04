"use client";

import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertCircle, Plus, Bot, TableIcon, MapIcon } from "lucide-react";
import { Map, MapControls, MapMarker, MarkerPopup } from "@/components/ui/map";
import { LoadingButton } from "@/components/ui/loading-button";
import { ColumnDef } from "@tanstack/react-table";
import { useIssues, QUERY_KEYS } from "@/lib/queries";

interface KampungOption { id: string; name: string }
interface IssueSummary {
  id: string; kampung_id: string | null; kampung_name: string | null;
  type: string | null; location: string | null; description: string | null;
  ai_category: string | null; status: string; coords: string | null;
}

type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

const STATUS_CONFIG: Record<IssueStatus, { label: string; variant: "primary" | "warning" | "success" | "secondary" }> = {
  open:        { label: "Terbuka",      variant: "primary" },
  in_progress: { label: "Dalam Proses", variant: "warning" },
  resolved:    { label: "Selesai",      variant: "success" },
  closed:      { label: "Ditutup",      variant: "secondary" },
};

const ISSUE_TYPES = ["Lampu Jalan", "Jalan Rosak", "Paip Air", "Longkang", "Sampah", "Lain-lain"];

const issueSchema = z.object({
  kampung_id: z.string().min(1, "Sila pilih kampung."),
  type: z.enum(ISSUE_TYPES as [string, ...string[]], { required_error: "Sila pilih jenis isu." }),
  location: z.string().max(200, "Lokasi terlalu panjang.").optional().or(z.literal("")),
  description: z.string().max(2000, "Penerangan terlalu panjang.").optional().or(z.literal("")),
});
type IssueFormValues = z.infer<typeof issueSchema>;

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as IssueStatus] ?? STATUS_CONFIG.open;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function AICategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge variant="accent" className="gap-1">
      <Bot className="h-3 w-3" />
      {category}
    </Badge>
  );
}

const columns: ColumnDef<IssueSummary>[] = [
  {
    accessorKey: "kampung_name",
    header: ({ column }) => <SortableHeader column={column} title="Kampung" />,
    cell: ({ row }) => <span className="font-medium">{row.original.kampung_name ?? "—"}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column} title="Jenis" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.type ?? "—"}</span>,
  },
  {
    accessorKey: "location",
    header: "Lokasi",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.location ?? "—"}</span>,
  },
  {
    accessorKey: "ai_category",
    header: "Kategori AI",
    cell: ({ row }) => <AICategoryBadge category={row.original.ai_category} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

function parseCoords(coords: string | null): [number, number] | null {
  if (!coords) return null;
  const parts = coords.split(",").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return [parts[0], parts[1]];
}

const STATUS_COLOR: Record<string, string> = {
  open:        "text-destructive fill-destructive",
  in_progress: "text-[var(--amber)] fill-[var(--amber)]",
  resolved:    "text-[var(--success)] fill-[var(--success)]",
  closed:      "text-muted-foreground fill-muted-foreground",
};

const PONTIAN: [number, number] = [103.3892, 1.4855];

export default function IssuesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: issues = [], isLoading: loading } = useIssues();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"table" | "map">("table");
  const { data: kampungs = [] } = useQuery<KampungOption[]>({
    queryKey: QUERY_KEYS.kampung,
    queryFn: () => apiGet("/kampung"),
  });

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { kampung_id: "", type: "", location: "", description: "" },
  });

  function openDialog() {
    reset();
    setDialogOpen(true);
  }

  async function onSubmit(values: IssueFormValues) {
    const promise = apiPost("/issues", {
      kampung_id: values.kampung_id,
      type: values.type || null,
      location: values.location || null,
      description: values.description || null,
    });

    toast.promise(promise, {
      loading: "Menghantar isu...",
      success: "Isu berjaya dilaporkan.",
      error: "Gagal merekod isu. Cuba semula.",
    });

    try {
      await promise;
      setDialogOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: QUERY_KEYS.issues });
    } catch {
      // handled by toast.promise
    }
  }

  const issueList = issues as IssueSummary[];
  const statusCounts = (Object.keys(STATUS_CONFIG) as IssueStatus[]).reduce((acc, s) => {
    acc[s] = issueList.filter(i => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = statusFilter ? issueList.filter(i => i.status === statusFilter) : issueList;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="heading-page">Isu Komuniti</h1>
          <p className="text-sm text-muted-foreground">Isu dan aduan daripada komuniti kampung</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button size="sm" variant={view === "table" ? "default" : "ghost"} className="rounded-none px-3" onClick={() => setView("table")} aria-label="Paparan jadual">
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant={view === "map" ? "default" : "ghost"} className="rounded-none px-3" onClick={() => setView("map")} aria-label="Paparan peta">
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Laporkan Isu
          </Button>
        </div>
      </div>

      {!loading && issueList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusFilter === null ? "default" : "secondary"} className="cursor-pointer rounded-none px-3 py-1" onClick={() => setStatusFilter(null)}>
            Semua ({issueList.length})
          </Badge>
          {(Object.entries(STATUS_CONFIG) as [IssueStatus, { label: string; variant: "primary" | "warning" | "success" | "secondary" }][]).map(([s, cfg]) => statusCounts[s] > 0 && (
            <Badge
              key={s}
              variant={statusFilter === s ? cfg.variant : "secondary"}
              className={cn("cursor-pointer rounded-none px-3 py-1", statusFilter !== s && "opacity-70 hover:opacity-100")}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            >
              {cfg.label} ({statusCounts[s]})
            </Badge>
          ))}
        </div>
      )}

      {view === "table" && (
        <Card className="ring-0 shadow-none gap-0">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Senarai Isu</p>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : issueList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">Tiada isu komuniti</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              searchPlaceholder="Cari kampung atau jenis..."
              onRowClick={(issue) => router.push(`/isu/${issue.id}`)}
            />
          )}
        </Card>
      )}

      {view === "map" && (
        <Card className="ring-0 shadow-none gap-0 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <p className="text-sm font-semibold">Peta Isu</p>
            <p className="text-xs text-muted-foreground">
              {(filtered as IssueSummary[]).filter(i => parseCoords(i.coords)).length} isu dengan koordinat
            </p>
          </div>
          <Map
            viewport={{ center: PONTIAN, zoom: 11 }}
            className="h-[480px] w-full"
          >
            <MapControls showZoom showFullscreen />
            {(filtered as IssueSummary[]).map((issue) => {
              const pos = parseCoords(issue.coords);
              if (!pos) return null;
              return (
                <MapMarker
                  key={issue.id}
                  longitude={pos[0]}
                  latitude={pos[1]}
                >
                  <MarkerPopup>
                    <Card className="ring-0 shadow-sm p-3 min-w-[200px]">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm">{issue.type ?? "Isu"}</p>
                        <Badge variant={STATUS_CONFIG[issue.status as IssueStatus]?.variant ?? "secondary"}>
                          {STATUS_CONFIG[issue.status as IssueStatus]?.label ?? issue.status}
                        </Badge>
                      </div>
                      {issue.kampung_name && <p className="text-xs text-muted-foreground mb-1">{issue.kampung_name}</p>}
                      {issue.description && <p className="text-xs text-muted-foreground line-clamp-2">{issue.description}</p>}
                    </Card>
                  </MarkerPopup>
                </MapMarker>
              );
            })}
          </Map>
        </Card>
      )}

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="sm:max-w-md flex flex-col gap-0">
          <SheetHeader className="shrink-0"><SheetTitle>Laporkan Isu</SheetTitle></SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">

            <Controller
              name="kampung_id"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kampung *</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih kampung..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {(kampungs as KampungOption[]).map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="type"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Isu</FieldLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange} name={field.name}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih jenis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="location"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Lokasi</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="cth: Jalan Kampung Baru"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Penerangan</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder="Huraikan masalah dengan jelas..."
                    rows={3}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

          </div>
            <SheetFooter className="shrink-0 border-t px-4 py-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan…">
                Hantar
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
