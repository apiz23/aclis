"use client"

import { useEffect, useState } from "react"

interface MapMountProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function MapMount({ children, fallback, className }: MapMountProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) {
    return (
      <div className={className ?? "h-[480px] w-full animate-pulse rounded-lg bg-muted"} />
    )
  }
  if (fallback && !mounted) return <>{fallback}</>
  return <div className={className}>{children}</div>
}
