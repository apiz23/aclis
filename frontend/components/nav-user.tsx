"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, UserCircleIcon, LogOutIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface UserInfo { email: string | null; role: string | null }

const ROLE_LABEL: Record<string, string> = {
  admin_daerah:  "Admin Daerah",
  ketua_kampung: "Ketua Kampung",
  penghulu:      "Penghulu",
}

function initials(email: string | null) {
  if (!email) return "?"
  return email.slice(0, 2).toUpperCase()
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [user, setUser] = useState<UserInfo>({ email: null, role: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return
      const meta = data.session.user.app_metadata as Record<string, string> | undefined
      setUser({
        email: data.session.user.email ?? null,
        role: meta?.role ?? null,
      })
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace("/log-masuk")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold tracking-wide">
                  {initials(user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.email ?? "—"}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {ROLE_LABEL[user.role ?? ""] ?? user.role ?? "—"}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold tracking-wide">
                    {initials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.email ?? "—"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {ROLE_LABEL[user.role ?? ""] ?? "—"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profil">
                <UserCircleIcon className="h-4 w-4" />
                Profil Saya
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOutIcon className="h-4 w-4" />
              Log Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
