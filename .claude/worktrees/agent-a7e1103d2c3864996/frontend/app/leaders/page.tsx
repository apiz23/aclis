"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { Users } from "lucide-react";

interface LeaderSummary {
  id: string;
  name: string;
  ic_no: string | null;
  type: string;
  kampung_id: string | null;
  kampung_name: string | null;
  tarikh_lantikan: string | null;
  photo_url: string | null;
  parti_lantikan: string | null;
  parti_terkini: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

const TYPE_AVATAR_CLS: Record<string, string> = {
  ketua_kampung: "bg-primary/15 text-primary",
  penghulu:      "bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]",
};

const TYPE_BADGE_CLS: Record<string, string> = {
  ketua_kampung: "bg-primary/10 text-primary",
  penghulu:      "bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]",
};

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-5">
        <Users className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">Belum ada data pemimpin</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Data akan dipaparkan selepas import fail Excel selesai dalam Fasa 2.
      </p>
    </div>
  );
}

export default function LeadersPage() {
  const [leaders, setLeaders] = useState<LeaderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet("/leaders")
      .then(setLeaders)
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Pemimpin</h1>
        <p className="text-sm text-muted-foreground">
          Senarai Ketua Kampung &amp; Penghulu daerah Pontian
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Pemimpin</p>
        </div>

        {loading ? <TableSkeleton /> : leaders.length === 0 ? <EmptyState /> : (
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
              {leaders.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leaders/${l.id}`)}
                >
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      {l.photo_url && <AvatarImage src={l.photo_url} alt={l.name} />}
                      <AvatarFallback className={`text-xs font-semibold ${TYPE_AVATAR_CLS[l.type] ?? "bg-muted text-muted-foreground"}`}>
                        {l.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLS[l.type] ?? "bg-muted text-muted-foreground"}`}>
                      {TYPE_LABEL[l.type] ?? l.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.kampung_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {l.tarikh_lantikan ?? "—"}
                  </TableCell>
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
