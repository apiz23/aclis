"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useJpkkMeeting, useCurrentUser, QUERY_KEYS } from "@/lib/queries";
import { apiPatch, apiPost } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MapPin, Users, FileText, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

const statusMap: Record<string, { label: string; variant: "secondary" | "success" | "warning" }> = {
  planned: { label: "Dirancang", variant: "secondary" },
  conducted: { label: "Dilaksana", variant: "success" },
  claimed: { label: "Tuntut", variant: "warning" },
};

const agendaSchema = z.object({
  items: z.array(z.object({ item: z.string().min(1, "Perkara diperlukan."), action: z.string().optional() })),
});

type AgendaFormValues = z.infer<typeof agendaSchema>;

export default function JpkkMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: meeting, isLoading, refetch } = useJpkkMeeting(id);
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";

  const [editMinutesOpen, setEditMinutesOpen] = useState(false);
  const [editAgendaOpen, setEditAgendaOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const { control: agendaControl, handleSubmit: handleAgendaSubmit, reset: resetAgenda, formState: { isSubmitting: agendaSubmitting } } = useForm<AgendaFormValues>({
    resolver: zodResolver(agendaSchema),
    defaultValues: { items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: agendaControl, name: "items" });

  useEffect(() => {
    if (meeting?.agenda_json) {
      resetAgenda({ items: meeting.agenda_json });
    }
  }, [meeting, resetAgenda]);

  async function updateMinutes(minutes: string) {
    try {
      await apiPatch(`/jpkk/meetings/${id}`, { minutes_text: minutes });
      toast.success("Minit disimpan.");
      setEditMinutesOpen(false);
      refetch();
    } catch {
      toast.error("Gagal simpan minit.");
    }
  }

  async function updateStatus(status: string) {
    setStatusUpdating(true);
    try {
      await apiPatch(`/jpkk/meetings/${id}`, { status });
      toast.success("Status dikemaskini.");
      refetch();
    } catch {
      toast.error("Gagal kemaskini status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function onAgendaSubmit(values: AgendaFormValues) {
    try {
      await apiPatch(`/jpkk/meetings/${id}`, { agenda_json: values.items });
      toast.success("Agenda disimpan.");
      setEditAgendaOpen(false);
      refetch();
    } catch {
      toast.error("Gagal simpan agenda.");
    }
  }

  async function toggleAttendance(attendanceId: string, currentAttended: boolean) {
    if (!isAdmin) return;
    try {
      await apiPatch(`/jpkk/attendance/${attendanceId}`, { attended: !currentAttended });
      refetch();
    } catch {
      toast.error("Gagal kemaskini kehadiran.");
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return <AppLayout><p className="text-destructive">Mesyuarat tidak dijumpai.</p></AppLayout>;
  }

  const statusInfo = statusMap[meeting.status] || statusMap.planned;

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/jpkk/meetings?kampung=${meeting.kampung_id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="heading-page">Bil. {meeting.meeting_number}/{meeting.meeting_year}</h1>
          <p className="text-sm text-muted-foreground">{meeting.kampung_name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
          {isAdmin && (
            <Select value={meeting.status} onValueChange={(v) => updateStatus(v)} disabled={statusUpdating}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Dirancang</SelectItem>
                <SelectItem value="conducted">Dilaksana</SelectItem>
                <SelectItem value="claimed">Tuntut</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Tarikh</p><p className="font-medium">{meeting.meeting_date}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Tempat</p><p className="font-medium">{meeting.meeting_venue || "вАФ"}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Kehadiran</p><p className="font-medium">{meeting.attendee_count} ahli</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Agenda</p><p className="font-medium">{meeting.agenda_json?.length || 0} item</p></div>
        </Card>
      </div>

      <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Agenda</p>
          {isAdmin && <Button size="sm" variant="outline" onClick={() => setEditAgendaOpen(true)}>Kemaskini Agenda</Button>}
        </div>
        <CardContent className="px-5 py-4">
          {meeting.agenda_json?.length ? (
            <ul className="space-y-2">
              {meeting.agenda_json.map((item, idx) => (
                <li key={idx} className="border-b last:border-0 py-2">
                  <p className="text-sm font-medium">{item.item}</p>
                  {item.action && <p className="text-xs text-muted-foreground">Tindakan: {item.action}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground italic">Tiada agenda.</p>}
        </CardContent>
      </Card>

      <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Minit Mesyuarat</p>
          {isAdmin && <Button size="sm" variant="outline" onClick={() => setEditMinutesOpen(true)}>Kemaskini Minit</Button>}
        </div>
        <CardContent className="px-5 py-4">
          {meeting.minutes_text ? (
            <p className="text-sm whitespace-pre-wrap">{meeting.minutes_text}</p>
          ) : <p className="text-sm text-muted-foreground italic">Tiada minit.</p>}
        </CardContent>
      </Card>

      <Card className="rounded-none ring-0 shadow-none gap-0 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Kehadiran Ahli</p>
        </div>
        <CardContent className="px-5 py-4">
          {meeting.attendees.length ? (
            <div className="space-y-2">
              {meeting.attendees.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{a.name || "вАФ"}</p>
                    <p className="text-xs text-muted-foreground">{a.bureau || "вАФ"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={a.attended ? "text-success" : "text-muted-foreground"}
                        onClick={() => toggleAttendance(a.id, a.attended)}
                      >
                        {a.attended ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </Button>
                    ) : (
                      a.attended ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Tiada rekod kehadiran.</p>}
        </CardContent>
      </Card>

      <Sheet open={editMinutesOpen} onOpenChange={setEditMinutesOpen}>
        <SheetContent className="sm:max-w-md flex flex-col gap-0">
          <SheetHeader className="shrink-0"><SheetTitle>Kemaskini Minit</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <Textarea
              defaultValue={meeting.minutes_text || ""}
              rows={12}
              placeholder="Tulis minit mesyuarat..."
              className="min-h-[200px]"
              id="minutes-textarea"
            />
          </div>
          <SheetFooter className="shrink-0 border-t px-4 py-4">
            <Button variant="outline" onClick={() => setEditMinutesOpen(false)}>Batal</Button>
            <Button onClick={() => {
              const val = (document.getElementById("minutes-textarea") as HTMLTextAreaElement)?.value;
              if (val !== undefined) updateMinutes(val);
            }}>Simpan</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={editAgendaOpen} onOpenChange={setEditAgendaOpen}>
        <SheetContent className="sm:max-w-md flex flex-col gap-0">
          <SheetHeader className="shrink-0"><SheetTitle>Kemaskini Agenda</SheetTitle></SheetHeader>
          <form onSubmit={handleAgendaSubmit(onAgendaSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Controller
                      name={`items.${idx}.item`}
                      control={agendaControl}
                      render={({ field }) => <Input {...field} placeholder="Perkara" />}
                    />
                    <Controller
                      name={`items.${idx}.action`}
                      control={agendaControl}
                      render={({ field }) => <Input {...field} placeholder="Tindakan (pilihan)" />}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-1" onClick={() => remove(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ item: "", action: "" })}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Tambah Perkara
              </Button>
            </div>
            <SheetFooter className="shrink-0 border-t px-4 py-4">
              <Button type="button" variant="outline" onClick={() => setEditAgendaOpen(false)}>Batal</Button>
              <LoadingButton type="submit" loading={agendaSubmitting} loadingText="Menyimpan...">Simpan</LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}