"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function LoginError({
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
        <h1 className="text-xl font-heading font-semibold">Ralat Log Masuk</h1>
        <p className="text-sm text-muted-foreground">
          Maaf, halaman log masuk tidak dapat dimuatkan. Sila cuba sebentar lagi.
        </p>
        <Button onClick={() => reset()} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Cuba Semula
        </Button>
      </div>
    </div>
  );
}