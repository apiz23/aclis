"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

const PATH_LABEL: Record<string, string> = {
  "/papan-pemuka":   "Papan Pemuka",
  "/kampung":        "Profil Kampung",
  "/pemimpin":       "Pemimpin",
  "/laporan":        "Laporan Bulanan",
  "/isu":            "Isu Komuniti",
  "/penilaian":      "Penilaian Prestasi",
  "/pengumuman":     "Pengumuman",
  "/direktori":      "Direktori",
  "/borang":         "Borang",
  "/audit":          "Log Audit",
  "/profil":         "Profil Saya",
}

export function SiteHeader() {
  const pathname = usePathname()

  const segments = pathname.split("/").filter(Boolean)
  const rootPath = "/" + (segments[0] ?? "")
  const rootLabel = PATH_LABEL[rootPath] ?? segments[0] ?? "ACLIS"
  const isDetail = segments.length > 1

  const today = new Intl.DateTimeFormat("ms-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <header className="sticky top-0 z-40 flex h-[50px] shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs">Portal</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gold" />
            {isDetail ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild className="text-xs">
                    <Link href={rootPath}>{rootLabel}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-gold" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-semibold">Butiran</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-semibold">{rootLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
        {today}
      </span>
    </header>
  )
}
