"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKampung } from "@/lib/queries";
import type { KampungSummary } from "@/lib/types";
import { Map, MapControls, MapClusterLayer } from "@/components/ui/map";
import { Skeleton } from "@/components/ui/skeleton";

const PONTIAN: [number, number] = [103.3892, 1.4855];

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

  const geoJsonData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: "FeatureCollection",
    features: filtered.map((k) => ({
      type: "Feature",
      id: k.id,
      properties: {
        name: k.name,
        mukim_name: k.mukim_name,
        b40_count: k.b40_count,
        kampung_id: k.id,
      },
      geometry: {
        type: "Point",
        coordinates: [k.lng!, k.lat!],
      },
    })),
  };

  return (
    <div className="relative w-full" style={{ height }}>
      {showFilterHint && missing > 0 && (
        <p className="absolute top-2 right-2 z-[1001] text-[11px] text-muted-foreground bg-background/80 px-2 py-1 rounded-md border shadow-sm">
          {missing} tanpa koordinat
        </p>
      )}
      <Map
        theme="light"
        viewport={{ center: PONTIAN, zoom: 11 }}
        className="w-full h-full"
      >
        <MapControls showZoom showFullscreen />
        <MapClusterLayer
          data={geoJsonData}
          pointColor="#3b82f6"
          clusterColors={["#3b82f6", "#1d4ed8", "#1e3a8a"]}
          onPointClick={(feature) => {
            const id = feature.id as string;
            if (id) router.push(`/kampung/${id}`);
          }}
        />
      </Map>
    </div>
  );
}