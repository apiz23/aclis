"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface MapMountProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function MapMount({ children, fallback, className }: MapMountProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) {
    if (fallback) return <>{fallback}</>
    return (
      <div className={cn("animate-pulse rounded-lg bg-muted", className ?? "h-[480px] w-full")} />
    )
  }
  return <div className={className}>{children}</div>
}
