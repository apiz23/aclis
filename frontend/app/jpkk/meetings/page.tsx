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
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useKampung, useJpkkMeetings, useCurrentUser, QUERY_KEYS } from "@/lib/queries";
import { apiPost, apiPatch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Calendar, MapPin, Users } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

const meetingSchema = z.object({
  meeting_number: z.coerce.number().min(1, "Bil mesyuarat diperlukan."),
  meeting_year: z.coerce.number().min(2000).max(2100),
  meeting_date: z.string().min(1, "Tarikh diperlukan."),
  meeting_venue: z.string().optional(),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

const statusMap: Record<string, { label: string; variant: "secondary" | "success" | "warning" }> = {
  planned: { label: "Dirancang", variant: "secondary" },
  conducted: { label: "Dilaksana", variant: "success" },
  claimed: { label: "Tuntut", variant: "warning" },
};

export default function JpkkMeetingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const kampungIdParam = searchParams.get("kampung") || "";

  const { data: kampungList = [] } = useKampung();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";

  const [selectedKampungId, setSelectedKampungId] = useState(kampungIdParam);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: meetings = [], isLoading, refetch } = useJpkkMeetings(selectedKampungId);

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: { meeting_number: 1, meeting_year: new Date().getFullYear(), meeting_date: "", meeting_venue: "" },
  });

  useEffect(() => {
    if (kampungList.length > 0 && !selectedKampungId) {
      setSelectedKampungId(kampungList[0].id);
    }
  }, [kampungList]);

  async function onSubmit(values: MeetingFormValues) {
    try {
      await apiPost("/jpkk/meetings", { ...values, kampung_id: selectedKampungId });
      toast.success("Mesyuarat dicipta.");
      setDialogOpen(false);
      refetch();
    } catch {
      toast.error("Gagal cipta mesyuarat.");
    }
  }

  function openDialog() {
    reset({ meeting_number: (meetings.length || 0) + 1, meeting_year: new Date().getFullYear(), meeting_date: "", meeting_venue: "" });
    setDialogOpen(true);
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "meeting_number",
      header: ({ column }) => <SortableHeader column={column} title="Bil" />,
      cell: ({ row }) => `Bil. ${row.original.meeting_number}/${row.original.meeting_year}`,
    },
    {
      accessorKey: "meeting_date",
      header: "Tarikh",
      cell: ({ row }) => row.original.meeting_date,
    },
    {
      accessorKey: "meeting_venue",
      header: "Tempat",
    },
    {
      accessorKey: "attendee_count",
      header: "Kehadiran",
      cell: ({ row }) => <span>{row.original.attendee_count} ahli</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = statusMap[row.original.status] || statusMap.planned;
        return <Badge variant={s.variant as any}>{s.label}</Badge>;
      },
    },
  ];

  const handleRowClick = (row: any) => {
    router.push(`/jpkk/meetings/${row.id}`);
  };

  if (!selectedKampungId) return <AppLayout><p>Sila pilih kampung.</p></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="heading-page">Mesyuarat JPKK</h1>
            <p className="text-sm text-muted-foreground">Senarai mesyuarat</p>
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
            {isAdmin && <Button size="sm" onClick={openDialog}><Plus className="h-3.5 w-3.5 mr-1.5" />Cipta Mesyuarat</Button>}
          </div>
        </div>

        <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Senarai Mesyuarat</p>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <DataTable columns={columns} data={meetings} searchPlaceholder="Cari mesyuarat..." onRowClick={handleRowClick} />
          )}
        </Card>

        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent className="sm:max-w-md flex flex-col gap-0">
            <SheetHeader className="shrink-0"><SheetTitle>Cipta Mesyuarat</SheetTitle></SheetHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Controller name="meeting_number" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="meeting_number">Bil *</FieldLabel>
                      <Input {...field} id="meeting_number" type="number" min={1} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                  <Controller name="meeting_year" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="meeting_year">Tahun *</FieldLabel>
                      <Input {...field} id="meeting_year" type="number" min={2000} max={2100} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                </div>
                <Controller name="meeting_date" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="meeting_date">Tarikh *</FieldLabel>
                    <Input {...field} id="meeting_date" type="date" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="meeting_venue" control={control} render={({ field }) => (
                  <Field><FieldLabel htmlFor="meeting_venue">Tempat</FieldLabel><Input {...field} id="meeting_venue" placeholder="Balai Raya..." /></Field>
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