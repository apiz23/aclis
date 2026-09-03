"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";

type Category = "Notis Rasmi" | "Arahan" | "Taklimat" | "Borang";
const CATEGORIES: Category[] = ["Notis Rasmi", "Arahan", "Taklimat", "Borang"];

interface Announcement {
  id: string;
  category: Category;
  title: string;
  body: string;
  date: string;      // paparan
  isNew?: boolean;
  archived?: boolean;
  attachment?: string;
  action?: string;
}

// Data contoh — akan diganti dengan Supabase kemudian
const PINNED = {
  category: "Notis Rasmi" as Category,
  date: "1 Julai 2026",
  title: "Taklimat Penghulu & Ketua Kampung — Suku Ketiga 2026",
  body: (
    <>
      Semua Penghulu dan Ketua Kampung diwajibkan hadir pada Taklimat Suku Ketiga
      2026 yang akan diadakan pada <strong>15 Julai 2026 (Rabu), jam 9.00 pagi</strong>{" "}
      di Dewan Mesyuarat Pejabat Daerah Pontian.
    </>
  ),
  author: "Ahmad Halim bin Razali",
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1",
    category: "Arahan",
    title: "Kemaskini Data Profil Ketua Kampung 2026",
    body:
      "Semua Ketua Kampung dikehendaki mengemaskini data profil masing-masing melalui sistem sebelum 31 Julai 2026. Sila sertakan maklumat terkini mengenai alamat, nombor telefon dan alamat e-mel.",
    date: "3 Jul 2026",
    isNew: true,
    attachment: "Borang KK-01.pdf",
  },
  {
    id: "a2",
    category: "Borang",
    title: "Borang Penilaian Prestasi Suku 2/2026 — Dibuka",
    body:
      "Borang penilaian prestasi untuk suku kedua 2026 kini dibuka. Semua KK perlu melengkapkan borang sebelum 15 Julai 2026. Admin Daerah akan menilai prestasi berdasarkan penyerahan laporan dan kehadiran mesyuarat.",
    date: "1 Jul 2026",
    action: "Isi borang →",
  },
  {
    id: "a3",
    category: "Notis Rasmi",
    title: "Penangguhan Mesyuarat Bulanan Jun — Mukim Kukup",
    body:
      "Mesyuarat bulanan Jun bagi Mukim Kukup telah ditangguhkan ke 10 Julai 2026 atas sebab penjadualan semula oleh Penghulu. Semua peserta diberitahu untuk membuat perubahan jadual yang sewajarnya.",
    date: "28 Jun 2026",
  },
  {
    id: "a4",
    category: "Taklimat",
    title: "Taklimat Sistem ACLIS — Latihan Pengguna Baru",
    body:
      "Latihan penggunaan sistem ACLIS untuk kakitangan baru telah berjaya diadakan. Rakaman sesi dan nota latihan tersedia untuk dimuat turun.",
    date: "15 Jun 2026",
    archived: true,
    action: "Muat turun nota →",
  },
];

const CATEGORY_COUNTS: { label: Category; count: number }[] = [
  { label: "Notis Rasmi", count: 12 },
  { label: "Arahan", count: 7 },
  { label: "Taklimat", count: 4 },
  { label: "Borang", count: 3 },
];

const DEADLINES = [
  { label: "Kemaskini Profil KK", due: "31 Jul", tone: "amber" as const },
  { label: "Borang Penilaian S2", due: "15 Jul", tone: "red" as const },
  { label: "Laporan Bulanan Jul", due: "7 Ogo", tone: "muted" as const },
];

const DEADLINE_TONE = {
  amber: "bg-amber-bg border-amber-border text-amber",
  red:   "bg-red-bg border-red-border text-red",
  muted: "bg-background border-border text-muted-foreground",
};

interface NewAnnouncement {
  title: string;
  body: string;
  category: Category;
}

export default function PengumumanPage() {
  const [filter, setFilter] = useState<"Semua" | Category>("Semua");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<NewAnnouncement>({
    title: "",
    body: "",
    category: "Notis Rasmi",
  });
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === "admin_daerah";
  const qc = useQueryClient();

  const createAnnouncement = useMutation({
    mutationFn: (data: NewAnnouncement) => apiPost("/announcements", data),
    onSuccess: () => {
      setDialogOpen(false);
      setNewAnnouncement({ title: "", body: "", category: "Notis Rasmi" });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const items = useMemo(() => {
    return ANNOUNCEMENTS.filter(a => {
      if (filter !== "Semua" && a.category !== filter) return false;
      if (query && !`${a.title} ${a.body}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query]);

  return (
    <AppLayout>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-page">Pengumuman</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Notis rasmi, siaran dan arahan perkhidmatan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Arkib</Button>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">+ Pengumuman Baru</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Pengumuman Baru</DialogTitle>
                  <DialogDescription>
                    Cipta pengumuman untuk ditunjukkan kepada penghulu dan ketua kampung.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium">Kategori</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <Button
                          key={cat}
                          variant={newAnnouncement.category === cat ? "default" : "outline"}
                          size="sm"
                          type="button"
                          onClick={() =>
                            setNewAnnouncement((prev) => ({ ...prev, category: cat }))
                          }
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium">Tajuk</label>
                    <Input
                      value={newAnnouncement.title}
                      onChange={(e) =>
                        setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Tajuk pengumuman…"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium">Kandungan</label>
                    <Textarea
                      value={newAnnouncement.body}
                      onChange={(e) =>
                        setNewAnnouncement((prev) => ({ ...prev, body: e.target.value }))
                      }
                      placeholder="Tulis pengumuman di sini…"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={createAnnouncement.isPending}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => createAnnouncement.mutate(newAnnouncement)}
                    disabled={
                      !newAnnouncement.title.trim() ||
                      !newAnnouncement.body.trim() ||
                      createAnnouncement.isPending
                    }
                  >
                    {createAnnouncement.isPending ? "Menghantar…" : "Hantar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex border bg-card rounded-md overflow-hidden">
          {(["Semua", ...CATEGORIES] as const).map((cat, i) => (
            <Button
              key={cat}
              variant={filter === cat ? "default" : "ghost"}
              size="sm"
              className={cn("rounded-none", i > 0 && "border-l")}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari pengumuman…"
            className="w-[220px] pl-7 text-xs"
          />
        </div>
      </div>

      {/* Pinned notice */}
      <Alert className="border-l-4 border-l-gold bg-card text-foreground">
        <Badge variant="warning" className="shrink-0 mt-0.5">Disematkan</Badge>
        <div className="flex-1">
          <p className="text-[11px] text-muted-foreground mb-1">
            {PINNED.category} · {PINNED.date}
          </p>
          <p className="mb-1 text-sm font-semibold">{PINNED.title}</p>
          <p className="text-[13px] leading-[1.6] text-muted-foreground">{PINNED.body}</p>
          <div className="mt-2.5 flex items-center gap-3.5">
            <span className="text-xs font-semibold underline cursor-pointer">Baca selanjutnya →</span>
            <span className="text-xs text-muted-foreground">
              Disiarkan oleh: {PINNED.author}
            </span>
          </div>
        </div>
      </Alert>

      {/* Two-column: list + aside */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Announcement list */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {items.length === 0 && (
            <Card className="ring-0 shadow-none px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">Tiada pengumuman sepadan.</p>
            </Card>
          )}
          {items.map(a => (
            <Card
              key={a.id}
              className={cn("ring-0 shadow-none px-5 py-4", a.archived && "opacity-70")}
            >
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {a.isNew && <Badge variant="success" className="text-[9.5px] leading-none">Baru</Badge>}
                  <span className="text-[11px] text-muted-foreground">{a.category}</span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">{a.date}</span>
              </div>
              <p className="mb-1 text-sm font-semibold">{a.title}</p>
              <p className="text-[12.5px] leading-[1.6] text-muted-foreground">{a.body}</p>
              <div className="mt-2.5 flex items-center gap-3.5">
                <span className="text-xs font-semibold underline cursor-pointer">
                  {a.action ?? "Baca selanjutnya →"}
                </span>
                {a.attachment && (
                  <span className="text-[11px] text-muted-foreground">
                    Lampiran:{" "}
                    <span className="underline cursor-pointer">{a.attachment}</span>
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Aside: stats + deadlines */}
        <div className="flex w-full flex-none flex-col gap-3.5 lg:w-[268px]">
          <Card className="ring-0 shadow-none gap-0">
            <div className="border-b px-4 py-3">
              <p className="text-xs font-semibold">Statistik</p>
            </div>
            <CardContent className="flex flex-col gap-3 px-4 py-3.5">
              {CATEGORY_COUNTS.map(({ label, count }, i) => (
                <div key={label}>
                  {i > 0 && <div className="mb-3 h-px bg-border" />}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="font-heading text-lg font-bold tabular-nums">{count}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="ring-0 shadow-none gap-0">
            <div className="border-b px-4 py-3">
              <p className="text-xs font-semibold">Tarikh Akhir</p>
            </div>
            <div>
              {DEADLINES.map(({ label, due, tone }, i) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-start justify-between gap-2 px-4 py-2.5",
                    i < DEADLINES.length - 1 && "border-b"
                  )}
                >
                  <span className="text-xs font-medium leading-[1.4]">{label}</span>
                  <Badge variant={tone === "red" ? "destructive" : tone === "amber" ? "warning" : "secondary"}>{due}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
