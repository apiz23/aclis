"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, FileText, AlertCircle } from "lucide-react";

interface MeResponse {
  id: string;
  email: string | null;
  role: string;
}

const STATS = [
  { label: "Jumlah Kampung",   icon: MapPin,       value: "—" },
  { label: "Jumlah Pemimpin",  icon: Users,        value: "—" },
  { label: "Laporan Tertunda", icon: FileText,     value: "—" },
  { label: "Isu Terbuka",      icon: AlertCircle,  value: "—" },
];

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/me")
      .then((u: MeResponse) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Papan Pemuka</h1>
        {loading ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Log masuk sebagai{" "}
            <span className="font-medium">{me?.email ?? "—"}</span>
            {" · "}peranan:{" "}
            <span className="font-medium">{me?.role ?? "—"}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ label, icon: Icon, value }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Data akan dikemaskini selepas import
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
