"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKampung, useCurrentUser, useJpkkBank, useJpkkMembers, useJpkkStats, QUERY_KEYS } from "@/lib/queries";
import { apiPost, apiPatch, apiDelete, apiPut } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, Users, Calendar, FileText, Building2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

const JPKK_BUREAUS = [
  "Pengerusi", "Setiausaha",
  "Biro Pembangunan Prasarana", "Biro Keselamatan Dan Kesihatan",
  "Biro Pengurusan Kewangan", "Biro Ekonomi Dan Keusahawanan",
  "Biro Kesejahteraan Dan Keceriaan", "Biro Pendidikan Dan Inovasi",
  "Biro Pemantapan Spiritual", "Biro Kebajikan Dan Kesukarelawan",
  "Biro Belia Sukan Dan Ngo", "Biro Infrastruktur Dan Komunikasi",
  "Biro Hal Ehwal Wanita Dan Keluarga",
];

const memberSchema = z.object({
  name: z.string().min(1, "Nama diperlukan."),
  ic_no: z.string().optional(),
  bureau: z.string().min(1, "Sila pilih biro."),
  phone: z.string().optional(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

const bankSchema = z.object({
  account_name: z.string().optional(),
  account_no: z.string().optional(),
  bank_name: z.string().optional(),
});

type BankFormValues = z.infer<typeof bankSchema>;

export default function JpkkPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: kampungList = [] } = useKampung();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";

  const [selectedKampungId, setSelectedKampungId] = useState<string>("");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; ic_no: string | null; bureau: string; phone: string | null } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const { data: bank, refetch: refetchBank } = useJpkkBank(selectedKampungId);
  const { data: members = [], refetch: refetchMembers } = useJpkkMembers(selectedKampungId);
  const { data: stats, refetch: refetchStats } = useJpkkStats(selectedKampungId);

  const { control: memberControl, handleSubmit: handleMemberSubmit, reset: resetMember, formState: { isSubmitting: memberSubmitting } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", ic_no: "", bureau: "", phone: "" },
  });

  const { control: bankControl, handleSubmit: handleBankSubmit, reset: resetBank, formState: { isSubmitting: bankSubmitting } } = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
  });

  useEffect(() => {
    if (kampungList.length > 0 && !selectedKampungId) {
      setSelectedKampungId(kampungList[0].id);
    }
  }, [kampungList]);

  useEffect(() => {
    if (bank) {
      resetBank({
        account_name: bank.account_name ?? "",
        account_no: bank.account_no ?? "",
        bank_name: bank.bank_name ?? "",
      });
    }
  }, [bank, resetBank]);

  function openAddMember() {
    setEditingMember(null);
    resetMember({ name: "", ic_no: "", bureau: "", phone: "" });
    setMemberDialogOpen(true);
  }

  function openEditMember(m: any) {
    setEditingMember(m);
    resetMember({
      name: m.name,
      ic_no: m.ic_no ?? "",
      bureau: m.bureau,
      phone: m.phone ?? "",
    });
    setMemberDialogOpen(true);
  }

  async function onMemberSubmit(values: MemberFormValues) {
    const payload = {
      kampung_id: selectedKampungId,
      name: values.name,
      ic_no: values.ic_no || null,
      bureau: values.bureau,
      phone: values.phone || null,
    };
    try {
      if (editingMember) {
        await apiPatch(`/jpkk/members/${editingMember.id}`, payload);
        toast.success("Ahli dikemaskini.");
      } else {
        await apiPost("/jpkk/members", payload);
        toast.success("Ahli ditambah.");
      }
      setMemberDialogOpen(false);
      refetchMembers();
      refetchStats();
    } catch {
      toast.error("Gagal simpan ahli.");
    }
  }

  async function onDeleteMember(id: string) {
    try {
      await apiDelete(`/jpkk/members/${id}`);
      toast.success("Ahli dipadam.");
      setDeleteDialogOpen(false);
      refetchMembers();
      refetchStats();
    } catch {
      toast.error("Gagal padam ahli.");
    }
  }

  async function onBankSubmit(values: BankFormValues) {
    try {
      await apiPut(`/jpkk/bank/${selectedKampungId}`, values);
      toast.success("Maklumat bank dikemaskini.");
      refetchBank();
    } catch {
      toast.error("Gagal kemaskini bank.");
    }
  }

  const memberColumns: ColumnDef<any>[] = [
    { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Nama" /> },
    { accessorKey: "ic_no", header: "No. IC", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ic_no ?? "вАФ"}</span> },
    { accessorKey: "bureau", header: "Biro" },
    { accessorKey: "phone", header: "Telefon" },
    {
      id: "actions",
      header: "Tindakan",
      cell: ({ row }) => isAdmin ? (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMember(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeletingMemberId(row.original.id); setDeleteDialogOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null,
    },
  ];

  const handleRowClick = (row: any) => {
    router.push(`/jpkk/meetings/${row.id}`);
  };

  const selectedKampungName = kampungList.find(k => k.id === selectedKampungId)?.name ?? "";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-page">JPKK</h1>
            <p className="text-sm text-muted-foreground">Jawatankuasa Pembangunan Keselamatan Kampung</p>
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
          </div>
        </div>

        {!selectedKampungId ? <p className="text-muted-foreground">Sila pilih kampung.</p> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Ahli Aktif</p>
                  <p className="font-heading text-2xl font-bold">{stats?.member_count ?? <Skeleton className="h-8 w-12" />}</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Mesyuarat</p>
                  <p className="font-heading text-2xl font-bold">{stats?.meeting_count ?? <Skeleton className="h-8 w-12" />}</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tuntutan Belum Selesai</p>
                  <p className="font-heading text-2xl font-bold">{stats?.pending_claims ?? <Skeleton className="h-8 w-12" />}</p>
                </div>
              </Card>
            </div>

            <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <p className="text-sm font-semibold">Maklumat Bank</p>
              </div>
              <CardContent className="px-5 py-4">
                <form onSubmit={handleBankSubmit(onBankSubmit)} className="flex flex-wrap items-end gap-3">
                  <Controller name="account_name" control={bankControl} render={({ field }) => (
                    <Field className="flex-1 min-w-[140px]">
                      <FieldLabel htmlFor="account_name">Nama Akaun</FieldLabel>
                      <Input {...field} id="account_name" placeholder="Nama akaun JPKK" />
                    </Field>
                  )} />
                  <Controller name="account_no" control={bankControl} render={({ field }) => (
                    <Field className="flex-1 min-w-[140px]">
                      <FieldLabel htmlFor="account_no">No. Akaun</FieldLabel>
                      <Input {...field} id="account_no" placeholder="No. akaun bank" />
                    </Field>
                  )} />
                  <Controller name="bank_name" control={bankControl} render={({ field }) => (
                    <Field className="flex-1 min-w-[140px]">
                      <FieldLabel htmlFor="bank_name">Nama Bank</FieldLabel>
                      <Input {...field} id="bank_name" placeholder="Nama bank" />
                    </Field>
                  )} />
                  <Button type="submit" disabled={!isAdmin || bankSubmitting} size="sm">
                    {bankSubmitting ? "Menyimpan..." : "Kemaskini"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <p className="text-sm font-semibold">Ahli Jawatankuasa</p>
                {isAdmin && <Button size="sm" onClick={openAddMember}><Plus className="h-3.5 w-3.5 mr-1.5" />Tambah Ahli</Button>}
              </div>
              <DataTable columns={memberColumns} data={members} searchPlaceholder="Cari ahli..." onRowClick={undefined} />
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push(`/jpkk/meetings?kampung=${selectedKampungId}`)}>
                <Calendar className="h-4 w-4 mr-1.5" />
                Mesyuarat
              </Button>
              <Button variant="outline" onClick={() => router.push(`/jpkk/claims?kampung=${selectedKampungId}`)}>
                <FileText className="h-4 w-4 mr-1.5" />
                Tuntutan
              </Button>
            </div>
          </>
        )}
      </div>

      <Sheet open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <SheetContent className="sm:max-w-md flex flex-col gap-0">
          <SheetHeader className="shrink-0"><SheetTitle>{editingMember ? "Kemaskini Ahli" : "Tambah Ahli"}</SheetTitle></SheetHeader>
          <form onSubmit={handleMemberSubmit(onMemberSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              <Controller name="name" control={memberControl} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Nama *</FieldLabel>
                  <Input {...field} id="name" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="ic_no" control={memberControl} render={({ field }) => (
                <Field><FieldLabel htmlFor="ic_no">No. IC</FieldLabel><Input {...field} id="ic_no" placeholder="650310036782" /></Field>
              )} />
              <Controller name="bureau" control={memberControl} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bureau">Biro *</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="bureau" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Pilih biro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {JPKK_BUREAUS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller name="phone" control={memberControl} render={({ field }) => (
                <Field><FieldLabel htmlFor="phone">Telefon</FieldLabel><Input {...field} id="phone" placeholder="011-XXXXXXX" /></Field>
              )} />
            </div>
            <SheetFooter className="shrink-0 border-t px-4 py-4">
              <Button type="button" variant="outline" onClick={() => setMemberDialogOpen(false)}>Batal</Button>
              <LoadingButton type="submit" loading={memberSubmitting} loadingText="Menyimpan...">Simpan</LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Padam Ahli</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Anda pasti mahu padam ahli ini? Tindakan ini tidak boleh dibatalkan.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => deletingMemberId && onDeleteMember(deletingMemberId)}>Padam</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}