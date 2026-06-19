"use client";

import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function EvaluationsPage() {
  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Penilaian Prestasi</h1>
        <p className="text-sm text-muted-foreground">
          Rekod penilaian prestasi Ketua Kampung &amp; Penghulu
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekod Penilaian</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pemimpin</TableHead>
                <TableHead>Tempoh</TableHead>
                <TableHead>Jumlah Markah</TableHead>
                <TableHead className="w-40">Pencapaian</TableHead>
                <TableHead>Ulasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell>
                    <Progress value={0} className="h-2" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Data akan dipaparkan selepas import dan Fasa 3 selesai
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
