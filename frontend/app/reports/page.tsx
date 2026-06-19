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

const STATUS_CLASS: Record<string, string> = {
  submitted: "bg-green-100 text-green-800",
  draft:     "bg-gray-100 text-gray-700",
  late:      "bg-red-100 text-red-800",
};

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Laporan Bulanan</h1>
        <p className="text-sm text-muted-foreground">
          Hantar dan semak laporan aktiviti kampung bulanan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekod Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampung</TableHead>
                <TableHead>Tempoh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tarikh Hantar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                      draft
                    </span>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Data akan dipaparkan selepas Fasa 3 (CRUD API) selesai
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
