"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  MapPin,
  Users,
  FileText,
  AlertCircle,
  ClipboardList,
  UserCircle,
} from "lucide-react"

const NAV = [
  { label: "Papan Pemuka",    href: "/dashboard",   icon: LayoutDashboard },
  { label: "Profil Kampung",  href: "/kampung",     icon: MapPin },
  { label: "Pemimpin",        href: "/leaders",     icon: Users },
  { label: "Laporan Bulanan", href: "/reports",     icon: FileText },
  { label: "Isu Komuniti",    href: "/issues",      icon: AlertCircle },
  { label: "Penilaian",       href: "/evaluations", icon: ClipboardList },
  { label: "Profil Saya",     href: "/profile",     icon: UserCircle },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <Image
                    src="/icons/android-chrome-192x192.png"
                    alt="ACLIS"
                    width={32}
                    height={32}
                    className="size-full object-cover"
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ACLIS</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">Pjb. Daerah Pontian</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === href || pathname.startsWith(href + "/")}
                    tooltip={label}
                  >
                    <Link href={href}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
