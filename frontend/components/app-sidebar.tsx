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
  SidebarRail,
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
import { useCurrentUser } from "@/lib/queries"

const NAV = [
  { label: "Papan Pemuka",    href: "/dashboard",   icon: LayoutDashboard, roles: ["admin_daerah", "penghulu", "ketua_kampung"] },
  { label: "Profil Kampung",  href: "/kampung",     icon: MapPin,           roles: ["admin_daerah", "penghulu", "ketua_kampung"] },
  { label: "Pemimpin",        href: "/leaders",     icon: Users,            roles: ["admin_daerah", "penghulu", "ketua_kampung"] },
  { label: "Laporan Bulanan", href: "/reports",     icon: FileText,         roles: ["admin_daerah", "penghulu", "ketua_kampung"] },
  { label: "Isu Komuniti",    href: "/issues",      icon: AlertCircle,      roles: ["admin_daerah", "penghulu", "ketua_kampung"] },
  { label: "Penilaian",       href: "/evaluations", icon: ClipboardList,    roles: ["admin_daerah"] },
  { label: "Profil Saya",     href: "/profile",     icon: UserCircle,       roles: ["admin_daerah", "penghulu", "ketua_kampung"] },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: me, isLoading: meLoading } = useCurrentUser()
  const role = me?.role ?? null
  const visibleNav = meLoading ? [] : (role ? NAV.filter(item => item.roles.includes(role)) : [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="shrink-0 size-8 rounded-lg overflow-hidden">
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
                  <span className="truncate text-xs text-sidebar-foreground/70">Pjb. Daerah Pontian</span>
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
              {visibleNav.map(({ label, href, icon: Icon }) => (
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
      <SidebarRail />
    </Sidebar>
  )
}
