"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderDetail {
  id: string;
  name: string;
  ic_no: string | null;
  type: string;
  kampung_id: string | null;
  kampung_name: string | null;
  mukim_name: string | null;
  tarikh_lantikan: string | null;
  photo_url: string | null;
  parti_lantikan: string | null;
  parti_terkini: string | null;
  evaluation_count: number;
}

const TYPE_LABEL: Record<string, string> = {
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default function LeaderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]       = useState<LeaderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet(`/leaders/${id}`)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const initials = data?.name.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?";

  return (
    <AppLayout>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leaders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {loading ? <Skeleton className="h-7 w-56" /> : (
            <h1 className="font-heading text-2xl font-bold tracking-tight">{data?.name ?? "Pemimpin"}</h1>
          )}
          <p className="text-sm text-muted-foreground">
            {loading ? "—" : (TYPE_LABEL[data?.type ?? ""] ?? data?.type ?? "—")}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Gagal memuatkan data pemimpin.</p>}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Photo + eval count */}
        <div className="flex flex-col items-center gap-4 md:w-48 shrink-0">
          <Avatar className="h-28 w-28 rounded-xl">
            {data?.photo_url && <AvatarImage src={data.photo_url} alt={data.name} className="object-cover" />}
            <AvatarFallback className="rounded-xl text-2xl font-bold">
              {loading ? "?" : initials}
            </AvatarFallback>
          </Avatar>
          <div className="rounded-lg border bg-card p-4 text-center w-full">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Penilaian</p>
            </div>
            {loading ? <Skeleton className="h-8 w-12 mx-auto" /> : (
              <p className="font-heading text-2xl font-bold tabular-nums">{data?.evaluation_count ?? 0}</p>
            )}
          </div>
        </div>

        {/* Detail fields */}
        <div className="flex-1 rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Maklumat Pemimpin</p>
          </div>
          <div className="px-5">
            {loading ? (
              <div className="py-4 space-y-3">
                {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                <Field label="Nama Penuh" value={data?.name} />
                <Field label="No. IC" value={data?.ic_no} />
                <Field label="Jawatan" value={TYPE_LABEL[data?.type ?? ""] ?? data?.type} />
                <Field label="Kampung" value={data?.kampung_name} />
                <Field label="Mukim" value={data?.mukim_name} />
                <Field label="Tarikh Dilantik" value={data?.tarikh_lantikan} />
                <Field label="Parti Lantikan" value={data?.parti_lantikan} />
                <Field label="Parti Semasa" value={data?.parti_terkini} />
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
