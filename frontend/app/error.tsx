"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-xl font-heading font-semibold">Ralat Sistem</h1>
        <p className="text-sm text-muted-foreground">
          Maaf, sesuatu tidak kena. Sila cuba sebentar lagi.
        </p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => window.location.href = "/papan-pemuka"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Cuba Semula
          </Button>
        </div>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground/60 font-mono mt-2">
            Rujukan: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}