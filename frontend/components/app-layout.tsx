"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  MapPin,
  Users,
  FileText,
  AlertCircle,
  ClipboardList,
  LogOut,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";

const NAV = [
  { label: "Papan Pemuka",    href: "/dashboard",   icon: LayoutDashboard },
  { label: "Profil Kampung",  href: "/kampung",     icon: MapPin },
  { label: "Pemimpin",        href: "/leaders",     icon: Users },
  { label: "Laporan Bulanan", href: "/reports",     icon: FileText },
  { label: "Isu Komuniti",    href: "/issues",      icon: AlertCircle },
  { label: "Penilaian",       href: "/evaluations", icon: ClipboardList },
  { label: "Profil Saya",     href: "/profile",     icon: UserCircle },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const currentLabel = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ?? "ACLIS";

  return (
    <SidebarProvider>
      <Sidebar variant="inset">

        {/* Brand header */}
        <SidebarHeader className="pb-0">
          <div className="px-3 pt-4 pb-4">
            {/* Logo row */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-sidebar-primary">
                <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" aria-hidden>
                  <path
                    d="M4 16L10 4L16 16"
                    stroke="var(--sidebar-primary-foreground)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.5 12h7"
                    stroke="var(--sidebar-primary-foreground)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="font-heading text-[13px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground leading-none">
                ACLIS
              </p>
            </div>
            {/* District sub-label */}
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-[0.1em] leading-none pl-[2px]">
              Pjb. Daerah Pontian
            </p>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ label, href, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={pathname === href || pathname.startsWith(href + "/")}>
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

        <SidebarSeparator />

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="h-4 w-4" />
                <span>Log Keluar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

      </Sidebar>

      <SidebarInset>
        <header className="flex h-13 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1 cursor-pointer" />
          <Separator orientation="vertical" className="h-4" />
          <span className="font-heading text-sm font-semibold tracking-tight">
            {currentLabel}
          </span>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {children}
        </div>
      </SidebarInset>

    </SidebarProvider>
  );
}
