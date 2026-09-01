"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";
import { Users, Search } from "lucide-react";

interface LeaderSummary {
  id: string; name: string; ic_no: string | null; type: string;
  kampung_id: string | null; kampung_name: string | null;
  tarikh_lantikan: string | null; photo_url: string | null;
  parti_lantikan: string | null; parti_terkini: string | null;
}

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

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}

export default function LeadersPage() {
  const [leaders, setLeaders] = useState<LeaderSummary[]>([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet("/leaders")
      .then(setLeaders)
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leaders.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.kampung_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Pemimpin</h1>
        <p className="text-sm text-muted-foreground">Senarai Ketua Kampung &amp; Penghulu daerah Pontian</p>
      </div>

      <div className="border bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <p className="text-sm font-semibold flex-1">Senarai Pemimpin</p>
          {!loading && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {filtered.length} rekod
            </span>
          )}
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau kampung..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {loading ? <TableSkeleton /> : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{search ? "Tiada hasil carian" : "Tiada rekod pemimpin"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Nama</TableHead>
                <TableHead>Jawatan</TableHead>
                <TableHead>Kampung</TableHead>
                <TableHead>Tarikh Lantikan</TableHead>
                <TableHead>Parti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/40" onClick={() => router.push(`/leaders/${l.id}`)}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      {l.photo_url && <AvatarImage src={l.photo_url} alt={l.name} />}
                      <AvatarFallback className={`text-xs font-semibold ${AVATAR_BG[l.type] ?? "bg-muted"}`}>
                        {initials(l.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[l.type] ?? "bg-muted text-muted-foreground"}`}>
                      {TYPE_LABEL[l.type] ?? l.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.kampung_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{l.tarikh_lantikan ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.parti_terkini ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
