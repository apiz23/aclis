"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { NavUser } from "@/components/nav-user";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import {
	LayoutDashboard,
	MapPin,
	Users,
	FileText,
	AlertCircle,
	ClipboardList,
	Megaphone,
	BookUser,
	FileInput,
	ScrollText,
} from "lucide-react";
import { useCurrentUser } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_ROLES = ["admin_daerah", "penghulu", "ketua_kampung"];

const NAV_GROUPS = [
	{
		label: "Pengurusan",
		items: [
			{
				label: "Papan Pemuka",
				href: "/papan-pemuka",
				icon: LayoutDashboard,
				roles: ALL_ROLES,
			},
			{
				label: "Profil Kampung",
				href: "/kampung",
				icon: MapPin,
				roles: ALL_ROLES,
			},
			{ label: "Pemimpin", href: "/pemimpin", icon: Users, roles: ALL_ROLES },
			{
				label: "Laporan Bulanan",
				href: "/laporan",
				icon: FileText,
				roles: ALL_ROLES,
			},
			{
				label: "Isu Komuniti",
				href: "/isu",
				icon: AlertCircle,
				roles: ALL_ROLES,
			},
			{
				label: "Penilaian",
				href: "/penilaian",
				icon: ClipboardList,
				roles: ["admin_daerah"],
			},
		],
	},
	{
		label: "Komunikasi",
		items: [
			{
				label: "Pengumuman",
				href: "/pengumuman",
				icon: Megaphone,
				roles: ALL_ROLES,
			},
			{ label: "Direktori", href: "/direktori", icon: BookUser, roles: ALL_ROLES },
			{ label: "Borang", href: "/borang", icon: FileInput, roles: ALL_ROLES },
		],
	},
	{
		label: "Pentadbiran",
		items: [
			{
				label: "Log Audit",
				href: "/audit",
				icon: ScrollText,
				roles: ["admin_daerah"],
			},
		],
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const { data: me, isLoading: meLoading } = useCurrentUser();
	const role = me?.role ?? null;

	return (
		<Sidebar {...props}>
			<SidebarHeader className="border-b border-sidebar-border p-0">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							asChild
							className="h-auto rounded-none px-5 py-4 hover:bg-transparent"
						>
							<Link href="/papan-pemuka">
								<div className="size-9 shrink-0 overflow-hidden">
									<Image
										src="/icons/android-chrome-192x192.png"
										alt="ACLIS"
										width={36}
										height={36}
										className="size-full object-cover"
										priority
									/>
								</div>
								<div className="grid flex-1 text-left leading-tight">
									<span className="font-heading text-[9.5px] font-semibold uppercase tracking-[0.16em] text-gold">
										Pejabat Daerah
									</span>
									<span className="font-heading text-xl font-bold uppercase tracking-[0.03em] text-white">
										Pontian
									</span>
									<span className="truncate text-[10px] tracking-[0.04em] text-sidebar-foreground/40">
										Sistem Pengurusan Daerah
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="gap-0">
				{meLoading ? (
					<>
						<SidebarGroup className="py-1">
							<SidebarGroupLabel className="px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/30">
								<Skeleton className="h-3 w-20" />
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu className="gap-0">
									{[1, 2, 3, 4, 5].map((idx) => (
										<SidebarMenuItem key={idx}>
											<SidebarMenuButton className="px-5">
												<Skeleton className="h-4 w-4 rounded" />
												<Skeleton className="h-3 w-24" />
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
						<SidebarGroup className="py-1">
							<SidebarGroupLabel className="px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/30">
								<Skeleton className="h-3 w-24" />
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu className="gap-0">
									{[1, 2, 3].map((idx) => (
										<SidebarMenuItem key={idx}>
											<SidebarMenuButton className="px-5">
												<Skeleton className="h-4 w-4 rounded" />
												<Skeleton className="h-3 w-24" />
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
						<SidebarGroup className="py-1">
							<SidebarGroupLabel className="px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/30">
								<Skeleton className="h-3 w-28" />
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu className="gap-0">
									{[1].map((idx) => (
										<SidebarMenuItem key={idx}>
											<SidebarMenuButton className="px-5">
												<Skeleton className="h-4 w-4 rounded" />
												<Skeleton className="h-3 w-24" />
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</>
				) : (
					NAV_GROUPS.map((group) => {
						const visible = group.items.filter((item) => role && item.roles.includes(role));
						if (!visible.length) return null;
						return (
							<SidebarGroup key={group.label} className="py-1">
								<Collapsible defaultOpen className="group/collapsible">
									<SidebarGroupLabel
										asChild
										className="w-full flex justify-between group/label px-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
									>
										<CollapsibleTrigger>
											{group.label}
											<Plus className="ml-auto size-3 group-data-[state=open]/collapsible:hidden" />
											<Minus className="ml-auto size-3 group-data-[state=closed]/collapsible:hidden" />
										</CollapsibleTrigger>
									</SidebarGroupLabel>
									<CollapsibleContent>
										<SidebarGroupContent>
											<SidebarMenu className="gap-0">
												{visible.map(({ label, href, icon: Icon }) => (
													<SidebarMenuItem key={href}>
														<SidebarMenuButton
															asChild
															isActive={pathname === href || pathname.startsWith(href + "/")}
															tooltip={label}
															className="rounded-none border-l-[3px] border-transparent px-5 text-[13px] text-sidebar-foreground/55 hover:bg-white/5 hover:text-sidebar-foreground data-[active=true]:border-gold data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white"
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
									</CollapsibleContent>
								</Collapsible>
							</SidebarGroup>
						);
					})
				)}
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border">
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
