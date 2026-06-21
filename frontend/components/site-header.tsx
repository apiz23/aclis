"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const PATH_LABEL: Record<string, string> = {
  "/dashboard":   "Papan Pemuka",
  "/kampung":     "Profil Kampung",
  "/leaders":     "Pemimpin",
  "/reports":     "Laporan Bulanan",
  "/issues":      "Isu Komuniti",
  "/evaluations": "Penilaian Prestasi",
  "/profile":     "Profil Saya",
}

export function SiteHeader() {
  const pathname = usePathname()

  const segments = pathname.split("/").filter(Boolean)
  const rootPath = "/" + (segments[0] ?? "")
  const rootLabel = PATH_LABEL[rootPath] ?? segments[0] ?? "ACLIS"
  const isDetail = segments.length > 1

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {isDetail ? (
                <a href={rootPath} className="text-muted-foreground hover:text-foreground text-sm">
                  {rootLabel}
                </a>
              ) : (
                <BreadcrumbPage className="text-sm font-medium">{rootLabel}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {isDetail && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-medium">Butiran</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
