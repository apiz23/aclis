"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { MapPin } from "lucide-react";

interface KampungSummary {
  id: string;
  name: string;
  mukim_id: string | null;
  mukim_name: string | null;
  b40_count: number;
  profile: string | null;
}

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
        <MapPin className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">Belum ada data kampung</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Data akan dipaparkan selepas import fail Excel selesai dalam Fasa 2.
      </p>
    </div>
  );
}

export default function KampungPage() {
  const [kampungs, setKampungs] = useState<KampungSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet("/kampung")
      .then(setKampungs)
      .catch(() => setKampungs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-0.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Profil Kampung</h1>
        <p className="text-sm text-muted-foreground">
          Senarai kampung di bawah Pejabat Daerah Pontian
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Senarai Kampung</p>
        </div>

        {loading ? <TableSkeleton /> : kampungs.length === 0 ? <EmptyState /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kampung</TableHead>
                <TableHead>Mukim</TableHead>
                <TableHead className="text-right">Bil. B40</TableHead>
                <TableHead>Profil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kampungs.map((k) => (
                <TableRow
                  key={k.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/kampung/${k.id}`)}
                >
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="text-muted-foreground">{k.mukim_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.b40_count}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[200px]">
                    {k.profile ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
