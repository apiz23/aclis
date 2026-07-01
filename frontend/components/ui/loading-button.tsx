"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
}

export function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {/* keep children in DOM so button never resizes */}
      <span
        className={cn(
          "inline-flex items-center gap-2 transition-opacity duration-150",
          loading ? "opacity-0" : "opacity-100"
        )}
      >
        {children}
      </span>

      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText && (
            <span className="animate-in fade-in-0 duration-150">{loadingText}</span>
          )}
        </span>
      )}
    </Button>
  )
}
