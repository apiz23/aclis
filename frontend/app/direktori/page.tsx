"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeaders } from "@/lib/queries";

interface Leader {
	id: string;
	name: string;
	type: string;
	kampung_id: string | null;
	kampung_name: string | null;
	mukim_name: string | null;
	phone: string | null;
	photo_url: string | null;
}

const FILTERS = ["Semua", "Penghulu", "KK"] as const;

function initials(name: string) {
	const parts = name.split(" ").filter((p) => /^[A-Z]/i.test(p));
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function PersonCard({ leader }: { leader: Leader }) {
	return (
		<Link
			href={`/pemimpin/${leader.id}`}
			className="flex items-start gap-3.5 border bg-card px-4 py-4 transition-colors hover:bg-surface-alt"
		>
			<Avatar className="size-10 rounded-lg">
				<AvatarFallback className="bg-navy text-sm font-bold tracking-[0.05em] text-gold">
					{initials(leader.name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<p className="truncate text-[13px] font-semibold text-navy">
					{leader.name}
				</p>
				<p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-gold">
					Penghulu
				</p>
				<p className="mt-1 text-[11px] text-muted-foreground">
					{leader.mukim_name
						? `Mukim ${leader.mukim_name}`
						: (leader.kampung_name ?? "—")}
				</p>
				<p className="mt-0.5 text-[11px] text-text-mid tabular-nums">
					{leader.phone ?? "—"}
				</p>
			</div>
		</Link>
	);
}

function SectionRule({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-heading mb-2.5 border-b-2 border-navy pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-navy">
			{children}
		</p>
	);
}

export default function DirektoriPage() {
	const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
	const [query, setQuery] = useState("");
	const { data, isLoading } = useLeaders();

	const leaders = (data ?? []) as Leader[];
	const q = query.toLowerCase();
	const match = (l: Leader) =>
		!q ||
		`${l.name} ${l.kampung_name ?? ""} ${l.mukim_name ?? ""}`
			.toLowerCase()
			.includes(q);

	const penghulu = useMemo(
		() => leaders.filter((l) => l.type === "penghulu").filter(match),
		[leaders, q], // eslint-disable-line react-hooks/exhaustive-deps
	);
	const kks = useMemo(
		() => leaders.filter((l) => l.type === "ketua_kampung").filter(match),
		[leaders, q], // eslint-disable-line react-hooks/exhaustive-deps
	);

	return (
		<AppLayout>
			{/* Page header */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="heading-page">Direktori</h1>
					<p className="mt-1.5 text-xs text-muted-foreground">
						Penghulu dan Ketua Kampung daerah Pontian
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex border bg-card rounded-md overflow-hidden">
						{FILTERS.map((f, i) => (
							<Button
								key={f}
								variant={filter === f ? "default" : "ghost"}
								size="sm"
								className={cn("rounded-none", i > 0 && "border-l")}
								onClick={() => setFilter(f)}
							>
								{f}
							</Button>
						))}
					</div>
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Cari nama / mukim…"
							className="w-[190px] pl-7 text-xs"
						/>
					</div>
				</div>
			</div>

			{/* Penghulu */}
			{(filter === "Semua" || filter === "Penghulu") && (
				<div>
					<SectionRule>Penghulu ({isLoading ? "…" : penghulu.length})</SectionRule>
					{isLoading ? (
						<div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-[92px] w-full" />
							))}
						</div>
					) : penghulu.length === 0 ? (
						<Card className="ring-0 shadow-none px-5 py-8 text-center">
							<p className="text-sm text-muted-foreground">Tiada rekod penghulu.</p>
						</Card>
					) : (
						<div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
							{penghulu.map((p) => (
								<PersonCard key={p.id} leader={p} />
							))}
						</div>
					)}
				</div>
			)}

			{/* Ketua Kampung table */}
			{(filter === "Semua" || filter === "KK") && (
				<Card className="ring-0 shadow-none gap-0">
					<div className="flex items-center justify-between border-b px-4 py-3.5">
						<div>
							<p className="text-sm font-semibold">
								Ketua Kampung ({isLoading ? "…" : kks.length})
							</p>
							<p className="mt-0.5 text-[11px] text-muted-foreground">
								Disusun mengikut nama
							</p>
						</div>
					</div>
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="pl-4">Nama</TableHead>
								<TableHead>Kampung</TableHead>
								<TableHead>Mukim</TableHead>
								<TableHead>Telefon</TableHead>
								<TableHead className="pr-4" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading &&
								Array.from({ length: 6 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={5} className="px-4">
											<Skeleton className="h-5 w-full" />
										</TableCell>
									</TableRow>
								))}
							{!isLoading && kks.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={5}
										className="py-8 text-center text-muted-foreground"
									>
										Tiada rekod sepadan.
									</TableCell>
								</TableRow>
							)}
							{kks.map((kk) => (
								<TableRow key={kk.id}>
									<TableCell className="pl-4 font-medium">{kk.name}</TableCell>
									<TableCell className="text-xs text-text-mid">
										{kk.kampung_name ?? "—"}
									</TableCell>
									<TableCell>
										{kk.mukim_name ? (
											<Badge variant="outline">{kk.mukim_name}</Badge>
										) : (
											<span className="text-xs text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell className="text-xs text-text-mid tabular-nums">
										{kk.phone ?? "—"}
									</TableCell>
									<TableCell className="pr-4 text-right">
										<Link
											href={`/pemimpin/${kk.id}`}
											className="text-xs font-semibold text-navy underline"
										>
											Lihat →
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div className="flex items-center justify-between border-t px-4 py-2.5">
						<span className="text-[11px] text-muted-foreground">
							{isLoading ? "Memuatkan…" : `Menunjukkan ${kks.length} rekod`}
						</span>
						<Link href="/pemimpin" className="text-xs font-semibold underline">
							Lihat semua →
						</Link>
					</div>
				</Card>
			)}
		</AppLayout>
	);
}
