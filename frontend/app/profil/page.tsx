"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiGet } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Settings, KeyRound, ShieldCheck } from "lucide-react";

interface LeaderInfo {
  id: string;
  name: string;
  type: string;
  kampung_name: string | null;
}

interface MeResponse {
  id: string;
  email: string | null;
  role: string;
  leader: LeaderInfo | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

const ROLE_BADGE: Record<string, "primary" | "warning" | "success"> = {
  admin_daerah:  "primary",
  penghulu:      "warning",
  ketua_kampung: "success",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-3 border-b bg-muted/30">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border-row last:border-0">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

function IdentitySkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8">
      <Skeleton className="size-20" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="py-4 space-y-3 px-5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const [me, setMe]           = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  const [pwOpen, setPwOpen] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    apiGet("/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const initials = me?.email
    ? me.email.slice(0, 2).toUpperCase()
    : "?";

  async function handleEditProfile() {
    setEditSaving(true);
    setEditMsg("");
    const { error } = await supabase.auth.updateUser({ email: editEmail });
    if (error) {
      setEditMsg(error.message);
    } else {
      setEditMsg("E-mel dikemaskini. Semak inbox untuk pengesahan.");
      setMe((prev) => (prev ? { ...prev, email: editEmail } : prev));
    }
    setEditSaving(false);
  }

  async function handleChangePassword() {
    if (pwNew !== pwConfirm) {
      setPwMsg("Kata laluan tidak sepadan.");
      return;
    }
    if (pwNew.length < 6) {
      setPwMsg("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
      return;
    }
    setPwSaving(true);
    setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) {
      setPwMsg(error.message);
    } else {
      setPwMsg("Kata laluan berjaya ditukar.");
      setPwNew("");
      setPwConfirm("");
    }
    setPwSaving(false);
  }

  function openEditDialog() {
    setEditEmail(me?.email ?? "");
    setEditMsg("");
    setEditOpen(true);
  }

  function openPwDialog() {
    setPwNew("");
    setPwConfirm("");
    setPwMsg("");
    setPwOpen(true);
  }

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="heading-page">Profil Saya</h1>
        <p className="text-sm text-muted-foreground">
          Maklumat akaun dan profil pengguna
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Identity Card ── */}
        <Card className="w-full lg:w-72 shrink-0 rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
          <SectionHeader title="Identiti" />
          {loading ? (
            <IdentitySkeleton />
          ) : (
            <CardContent className="flex flex-col items-center gap-4 px-5 py-8 text-center">
              <div className="flex size-20 items-center justify-center bg-primary/10 text-primary">
                <span className="font-heading text-3xl font-bold tracking-tight">
                  {initials}
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-navy leading-tight break-all">
                  {me?.email ?? "—"}
                </p>
                <Badge
                  variant={ROLE_BADGE[me?.role ?? ""] ?? "secondary"}
                  className="rounded-none"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—"}
                </Badge>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground/60 break-all select-all">
                ID: {me?.id}
              </p>
            </CardContent>
          )}
        </Card>

        {/* ── Right Column ── */}
        <div className="flex-1 flex flex-col gap-4 w-full min-w-0 stagger-children">
          {/* Account Info */}
          <Card className="rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
            <SectionHeader title="Maklumat Akaun" />
            {loading ? (
              <CardSkeleton lines={3} />
            ) : (
              <CardContent className="px-5">
                <InfoField
                  label="E-mel"
                  value={
                    <span className="break-all">{me?.email}</span>
                  }
                />
                <InfoField
                  label="Peranan"
                  value={
                    <Badge
                      variant={ROLE_BADGE[me?.role ?? ""] ?? "secondary"}
                      className="rounded-none"
                    >
                      {ROLE_LABEL[me?.role ?? ""] ?? me?.role}
                    </Badge>
                  }
                />
                <InfoField
                  label="ID Pengguna"
                  value={
                    <span className="font-mono text-xs text-muted-foreground select-all">
                      {me?.id}
                    </span>
                  }
                />
              </CardContent>
            )}
          </Card>

          {/* Leader Profile (if applicable) */}
          {me?.leader && !loading && (
            <Card className="rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
              <SectionHeader title="Profil Pemimpin" />
              <CardContent className="px-5">
                <InfoField label="Nama" value={me.leader.name} />
                <InfoField label="Jawatan" value={me.leader.type} />
                <InfoField label="Kampung" value={me.leader.kampung_name} />
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="rounded-none ring-0 shadow-none py-0 gap-0 overflow-hidden">
            <SectionHeader title="Tindakan Pantas" />
            <CardContent className="px-5 py-4 flex flex-wrap gap-3">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-none"
                  >
                    <Settings className="h-4 w-4" />
                    Kemaskini Profil
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Kemaskini Profil</DialogTitle>
                    <DialogDescription>
                      Kemas kini alamat e-mel anda.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium">E-mel</label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="e-mel baru…"
                      />
                    </div>
                    {editMsg && (
                      <p className="text-xs text-muted-foreground">{editMsg}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setEditOpen(false)}
                      disabled={editSaving}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleEditProfile}
                      disabled={!editEmail.trim() || editSaving}
                    >
                      {editSaving ? "Menyimpan…" : "Simpan"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-none"
                  >
                    <KeyRound className="h-4 w-4" />
                    Tukar Kata Laluan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tukar Kata Laluan</DialogTitle>
                    <DialogDescription>
                      Masukkan kata laluan baru anda.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium">Kata Laluan Baru</label>
                      <Input
                        type="password"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        placeholder="Kata laluan baru…"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium">Sahkan Kata Laluan</label>
                      <Input
                        type="password"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        placeholder="Taip semula kata laluan…"
                      />
                    </div>
                    {pwMsg && (
                      <p className="text-xs text-muted-foreground">{pwMsg}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setPwOpen(false)}
                      disabled={pwSaving}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={!pwNew || !pwConfirm || pwSaving}
                    >
                      {pwSaving ? "Menyimpan…" : "Tukar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
