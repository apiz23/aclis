"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useKampung, useJpkkClaims, useJpkkMeetings, useCurrentUser, QUERY_KEYS } from "@/lib/queries";
import { apiPost, apiPatch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, FileText, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

const claimSchema = z.object({
  meeting_id: z.string().min(1, "Sila pilih mesyuarat."),
  claim_type: z.string().min(1, "Sila pilih jenis tuntutan."),
  notes: z.string().optional(),
});

type ClaimFormValues = z.infer<typeof claimSchema>;

const statusMap: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "Draf", variant: "secondary" },
  submitted: { label: "Dihantar", variant: "warning" },
  approved: { label: "Lulus", variant: "success" },
  rejected: { label: "Ditolak", variant: "destructive" },
};

const claimTypeMap = {
  chairperson: "Pengerusi (RM100)",
  attendance: "Kehadiran (RM50)",
};

export default function JpkkClaimsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const kampungIdParam = searchParams.get("kampung") || "";

  const { data: kampungList = [] } = useKampung();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";

  const [selectedKampungId, setSelectedKampungId] = useState(kampungIdParam);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: claims = [], isLoading, refetch } = useJpkkClaims(selectedKampungId);
  const { data: meetings = [] } = useJpkkMeetings(selectedKampungId);

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: { meeting_id: "", claim_type: "", notes: "" },
  });

  useEffect(() => {
    if (kampungList.length > 0 && !selectedKampungId) {
      setSelectedKampungId(kampungList[0].id);
    }
  }, [kampungList]);

  async function onSubmit(values: ClaimFormValues) {
    try {
      await apiPost("/jpkk/claims", { ...values, kampung_id: selectedKampungId });
      toast.success("Tuntutan dicipta.");
      setDialogOpen(false);
      refetch();
    } catch {
      toast.error("Gagal cipta tuntutan.");
    }
  }

  async function updateClaimStatus(claimId: string, status: string) {
    if (!isAdmin) return;
    try {
      await apiPatch(`/jpkk/claims/${claimId}`, { status });
      toast.success("Status dikemaskini.");
      refetch();
    } catch {
      toast.error("Gagal kemaskini status.");
    }
  }

  function openDialog() {
    reset({ meeting_id: "", claim_type: "", notes: "" });
    setDialogOpen(true);
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "claim_type",
      header: "Jenis",
      cell: ({ row }) => claimTypeMap[row.original.claim_type as keyof typeof claimTypeMap] || row.original.claim_type,
    },
    {
      accessorKey: "meeting_date",
      header: "Tarikh Mesyuarat",
      cell: ({ row }) => row.original.meeting_date || "вАФ",
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => <SortableHeader column={column} title="Jumlah" className="text-right" />,
      cell: ({ row }) => <div className="text-right font-semibold">RM {row.original.total_amount.toFixed(2)}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = statusMap[row.original.status] || statusMap.draft;
        return <Badge variant={s.variant as any}>{s.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Tindakan",
      cell: ({ row }) => isAdmin ? (
        <div className="flex gap-1">
          {row.original.status === "draft" && (
            <Button size="sm" variant="outline" onClick={() => updateClaimStatus(row.original.id, "submitted")}>
              Hantar
            </Button>
          )}
          {row.original.status === "submitted" && (
            <>
              <Button size="sm" variant="default" className="bg-green-600 text-white hover:bg-green-700" onClick={() => updateClaimStatus(row.original.id, "approved")}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />Lulus
              </Button>
              <Button size="sm" variant="destructive" onClick={() => updateClaimStatus(row.original.id, "rejected")}>
                <XCircle className="h-3.5 w-3.5 mr-1" />Tolak
              </Button>
            </>
          )}
        </div>
      ) : null,
    },
  ];

  if (!selectedKampungId) return <AppLayout><p>Sila pilih kampung.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="heading-page">Tuntutan JPKK</h1>
            <p className="text-sm text-muted-foreground">Senarai tuntutan elaun mesyuarat</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedKampungId} onValueChange={setSelectedKampungId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Pilih kampung" />
              </SelectTrigger>
              <SelectContent>
                {kampungList.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {isAdmin && <Button size="sm" onClick={openDialog}><Plus className="h-3.5 w-3.5 mr-1.5" />Cipta Tuntutan</Button>}
          </div>
        </div>

        <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Senarai Tuntutan</p>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <DataTable columns={columns} data={claims} searchPlaceholder="Cari tuntutan..." onRowClick={undefined} />
          )}
        </Card>

        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent className="sm:max-w-md flex flex-col gap-0">
            <SheetHeader className="shrink-0"><SheetTitle>Cipta Tuntutan</SheetTitle></SheetHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                <Controller name="meeting_id" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="meeting_id">Mesyuarat *</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="meeting_id" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Pilih mesyuarat..." />
                      </SelectTrigger>
                      <SelectContent>
                        {meetings.filter(m => m.status === "conducted").map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            Bil. {m.meeting_number}/{m.meeting_year} - {m.meeting_date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="claim_type" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="claim_type">Jenis Tuntutan *</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="claim_type" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Pilih jenis..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chairperson">Pengerusi (RM100)</SelectItem>
                        <SelectItem value="attendance">Kehadiran (RM50)</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="notes" control={control} render={({ field }) => (
                  <Field><FieldLabel htmlFor="notes">Catatan</FieldLabel><Input {...field} id="notes" placeholder="Catatan tambahan..." /></Field>
                )} />
              </div>
              <SheetFooter className="shrink-0 border-t px-4 py-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <LoadingButton type="submit" loading={isSubmitting} loadingText="Menyimpan...">Cipta</LoadingButton>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}