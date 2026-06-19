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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadersPage() {
  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Pemimpin</h1>
        <p className="text-sm text-muted-foreground">
          Senarai Ketua Kampung &amp; Penghulu
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senarai Pemimpin</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jawatan</TableHead>
                <TableHead>Kampung</TableHead>
                <TableHead>Tarikh Lantikan</TableHead>
                <TableHead>Parti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>—</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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
