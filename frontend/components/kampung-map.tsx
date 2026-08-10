"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKampung } from "@/lib/queries";
import type { KampungSummary } from "@/lib/types";
import { MapMount } from "@/components/ui/map-mount";
import { Map, MapTileLayer, MapMarkerClusterGroup, MapMarker, MapPopup, MapZoomControl, MapFullscreenControl } from "@/components/ui/map";
import { Skeleton } from "@/components/ui/skeleton";

const PONTIAN: [number, number] = [1.4855, 103.3892];

interface KampungMapProps {
  mukimId?: string | null;
  search?: string;
  kampungIds?: string[];
  height?: number;
  showFilterHint?: boolean;
}

export function KampungMap({ mukimId, search, kampungIds, height = 400, showFilterHint = true }: KampungMapProps) {
  const router = useRouter();
  const { data: kampungs = [], isLoading } = useKampung();

  const filtered = useMemo(() => {
    let list = kampungs as KampungSummary[];
    if (mukimId) list = list.filter(k => k.mukim_id === mukimId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(k => k.name.toLowerCase().includes(q) || (k.mukim_name ?? "").toLowerCase().includes(q));
    }
    if (kampungIds) list = list.filter(k => kampungIds.includes(k.id));
    return list.filter(k => k.lat != null && k.lng != null);
  }, [kampungs, mukimId, search, kampungIds]);

  const total = kampungIds ? kampungIds.length : (kampungs as KampungSummary[]).length;
  const missing = total - filtered.length;

  if (isLoading) {
    return <Skeleton className="w-full rounded-lg" style={{ height }} />;
  }

  return (
    <div className="relative">
      {showFilterHint && missing > 0 && (
        <p className="absolute top-2 right-2 z-[1001] text-[11px] text-muted-foreground bg-background/80 px-2 py-1 rounded-md border shadow-sm">
          {missing} tanpa koordinat
        </p>
      )}
      <div className="w-full" style={{ height }}>
      <MapMount className="w-full h-full">
        <Map center={PONTIAN} zoom={11} className="w-full h-full">
          <MapTileLayer />
          <MapZoomControl />
          <MapFullscreenControl />
          <MapMarkerClusterGroup>
            {filtered.map((k) => (
              <MapMarker key={k.id} position={[k.lat!, k.lng!]}>
                <MapPopup>
                  <div className="rounded-lg border bg-card shadow-sm p-3 min-w-[180px]">
                    <p className="font-semibold text-sm mb-0.5">{k.name}</p>
                    {k.mukim_name && <p className="text-xs text-muted-foreground mb-2">{k.mukim_name}</p>}
                    <p className="text-xs text-muted-foreground mb-2">B40: {k.b40_count}</p>
                    <button
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => router.push(`/kampung/${k.id}`)}
                    >
                      Lihat Butiran →
                    </button>
                  </div>
                </MapPopup>
          </MapMarker>
              ))}
            </MapMarkerClusterGroup>
          </Map>
        </MapMount>
      </div>
    </div>
  );
}
