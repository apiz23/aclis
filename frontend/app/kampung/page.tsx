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
import { Skeleton } from "@/components/ui/skeleton";

export default function KampungPage() {
  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Profil Kampung</h1>
        <p className="text-sm text-muted-foreground">
          Senarai kampung di bawah Pejabat Daerah Pontian
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senarai Kampung</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kampung</TableHead>
                <TableHead>Mukim</TableHead>
                <TableHead>Bilangan B40</TableHead>
                <TableHead>Profil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Data akan dipaparkan selepas import selesai
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
