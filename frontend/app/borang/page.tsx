"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiPost, apiPatch } from "@/lib/api";
import {
	useCurrentUser,
	useKampung,
	useReports,
	QUERY_KEYS,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { LoadingButton } from "@/components/ui/loading-button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Activity {
	id: number;
	name: string;
	date: string;
	attendance: string;
}

interface KampungOption {
	id: string;
	name: string;
	mukim_name: string | null;
}

interface ReportRow {
	id: string;
	kampung_id: string | null;
	kampung_name: string | null;
	period: string;
	status: string;
	submitted_at: string | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "secondary" | "destructive" }> = {
	submitted: { label: "✓ Dihantar", variant: "success" },
	draft:     { label: "Draf",        variant: "secondary" },
	late:      { label: "Lewat",       variant: "destructive" },
};

function currentPeriod() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period: string) {
	const [y, m] = period.split("-").map(Number);
	if (!y || !m) return period;
	return new Intl.DateTimeFormat("ms-MY", {
		month: "long",
		year: "numeric",
	}).format(new Date(y, m - 1, 1));
}

function FieldLabel({ children }: { children: React.ReactNode }) {
	return (
		<Label className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-text-mid">
			{children}
		</Label>
	);
}

function SectionCard({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<Card className="rounded-none ring-0 shadow-none py-0 gap-0">
			<div className="border-b bg-surface-alt px-4 py-3">
				<p className="font-heading text-xs font-bold uppercase tracking-[0.08em] text-navy">
					{title}
				</p>
			</div>
			<CardContent className="p-0">{children}</CardContent>
		</Card>
	);
}

function MonthPickerCell({ period, onChange }: { period: string; onChange: (period: string) => void }) {
	const [open, setOpen] = useState(false);
	const [y, m] = period.split("-").map(Number);
	const selected = y && m ? new Date(y, m - 1, 1) : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="w-full justify-start border bg-card text-sm font-normal"
				>
					<CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
					{period ? (
						periodLabel(period)
					) : (
						<span className="text-muted-foreground">Pilih bulan</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" side="bottom" align="start">
				<Calendar
					mode="single"
					captionLayout="dropdown"
					selected={selected}
					onSelect={(d) => {
						if (d) {
							onChange(format(d, "yyyy-MM"));
							setOpen(false);
						}
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

function DatePickerCell({ date, onChange }: { date: string; onChange: (date: string) => void }) {
	const [open, setOpen] = useState(false);
	const selected = date ? new Date(date + "T00:00:00") : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					data-empty={!date}
					className="h-7 w-[110px] justify-start border bg-surface-alt text-xs font-normal data-[empty=true]:text-muted-foreground"
				>
					<CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
					{date ? (
						format(new Date(date + "T00:00:00"), "dd/MM/yyyy")
					) : (
						<span>Pilih tarikh</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" side="bottom" align="start">
				<Calendar
					mode="single"
					selected={selected}
					onSelect={(d) => {
						if (d) {
							onChange(format(d, "yyyy-MM-dd"));
							setOpen(false);
						}
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

function CheckItem({
	done,
	children,
}: {
	done: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2">
			{done ? (
				<div className="flex size-3.5 flex-none items-center justify-center bg-green">
					<svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden>
						<path
							d="M1 3l2 2 4-4"
							stroke="#fff"
							strokeWidth="1.3"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
			) : (
				<div className="size-3.5 flex-none border-[1.5px] border-border" />
			)}
			<span
				className={cn("text-xs", done ? "text-text-mid" : "text-muted-foreground")}
			>
				{children}
			</span>
		</div>
	);
}

function buildContent(opts: {
	period: string;
	kampungName: string;
	mukimName: string;
	population: string;
	households: string;
	births: string;
	deaths: string;
	activities: Activity[];
	notes: string;
}) {
	const lines = [
		`LAPORAN BULANAN — ${periodLabel(opts.period)}`,
		`Kampung: ${opts.kampungName}${opts.mukimName ? ` · Mukim ${opts.mukimName}` : ""}`,
		"",
		"B — DATA PENDUDUK & ISI RUMAH",
		`Jumlah penduduk: ${opts.population || "—"}`,
		`Jumlah isi rumah: ${opts.households || "—"}`,
		`Kelahiran (bulan ini): ${opts.births || "0"}`,
		`Kematian (bulan ini): ${opts.deaths || "0"}`,
		"",
		"C — AKTIVITI & PROGRAM",
		...(opts.activities.filter((a) => a.name.trim()).length
			? opts.activities
					.filter((a) => a.name.trim())
					.map(
						(a) =>
							`- ${a.name}${a.date ? ` (${a.date})` : ""} — penyertaan: ${a.attendance || "0"}`,
					)
			: ["Tiada aktiviti dilaporkan."]),
		"",
		"D — ISU & CATATAN TAMBAHAN",
		opts.notes.trim() || "Tiada.",
	];
	return lines.join("\n");
}

export default function BorangPage() {
	const qc = useQueryClient();
	const { data: me } = useCurrentUser();
	const { data: kampungData, isLoading: kampungLoading } = useKampung();
	const { data: reportsData, isLoading: reportsLoading } = useReports();

	const kampungList = (kampungData ?? []) as KampungOption[];
	const reports = useMemo(
		() => (reportsData ?? []) as ReportRow[],
		[reportsData],
	);

	const [kampungId, setKampungId] = useState("");
	const [period, setPeriod] = useState(currentPeriod());
	const [population, setPopulation] = useState("");
	const [households, setHouseholds] = useState("");
	const [births, setBirths] = useState("");
	const [deaths, setDeaths] = useState("");
	const [notes, setNotes] = useState("");
	const [activities, setActivities] = useState<Activity[]>([
		{ id: 1, name: "", date: "", attendance: "" },
	]);
	const [nextId, setNextId] = useState(2);
	const [saving, setSaving] = useState(false);

	const selectedKampung =
		kampungList.find((k) => k.id === kampungId) ??
		(kampungList.length === 1 ? kampungList[0] : undefined);
	const effectiveKampungId = selectedKampung?.id ?? "";

	const pastReports = useMemo(
		() =>
			reports
				.filter((r) => !effectiveKampungId || r.kampung_id === effectiveKampungId)
				.slice(0, 5),
		[reports, effectiveKampungId],
	);

	function addActivity() {
		setActivities((a) => [
			...a,
			{ id: nextId, name: "", date: "", attendance: "" },
		]);
		setNextId((id) => id + 1);
	}
	function removeActivity(id: number) {
		setActivities((a) => a.filter((x) => x.id !== id));
	}
	function updateActivity(id: number, patch: Partial<Activity>) {
		setActivities((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
	}

	const checklist = [
		{ label: "Maklumat asas", done: Boolean(effectiveKampungId && period) },
		{
			label: "Data penduduk",
			done: [population, households].every((v) => v.trim() !== ""),
		},
		{
			label: "Aktiviti & program",
			done: activities.some((a) => a.name.trim() !== ""),
		},
		{ label: "Catatan tambahan", done: notes.trim() !== "" },
	];

	async function save(submit: boolean) {
		if (!effectiveKampungId) {
			toast.error("Sila pilih kampung dahulu.");
			return;
		}
		setSaving(true);
		try {
			const content = buildContent({
				period,
				kampungName: selectedKampung?.name ?? "",
				mukimName: selectedKampung?.mukim_name ?? "",
				population,
				households,
				births,
				deaths,
				activities,
				notes,
			});
			const created = (await apiPost("/reports", {
				kampung_id: effectiveKampungId,
				period,
				content,
			})) as ReportRow;

			if (submit) {
				try {
					await apiPatch(`/reports/${created.id}`, { status: "submitted" });
					toast.success("Laporan diserahkan!");
				} catch {
					toast.info(
						"Draf disimpan. Penyerahan rasmi memerlukan pengesahan Admin Daerah.",
					);
				}
			} else {
				toast.success("Draf disimpan.");
			}
			qc.invalidateQueries({ queryKey: QUERY_KEYS.reports });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Gagal menyimpan laporan.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<AppLayout>
			<div className="flex flex-col gap-4 xl:flex-row xl:gap-5">
				{/* ── Form column ── */}
				<div className="flex min-w-0 flex-1 flex-col gap-4">
					{/* Title */}
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h1 className="heading-page">Laporan Bulanan</h1>
							<p className="mt-1.5 text-xs text-muted-foreground">
								{periodLabel(period)}
								{selectedKampung ? ` · ${selectedKampung.name}` : ""}
								{selectedKampung?.mukim_name
									? `, Mukim ${selectedKampung.mukim_name}`
									: ""}
							</p>
						</div>
						<Badge
							variant="outline"
							className="border-amber-border bg-amber-bg text-[10px] font-semibold uppercase tracking-[0.04em] text-amber rounded-none"
						>
							Draf — Belum Diserah
						</Badge>
					</div>

					{/* A — Maklumat Asas */}
					<SectionCard title="A — Maklumat Asas">
						<div className="grid gap-3.5 p-4 sm:grid-cols-2">
							<div>
								<FieldLabel>Bulan Laporan</FieldLabel>
								<MonthPickerCell
									period={period}
									onChange={setPeriod}
								/>
							</div>
							<div>
								<FieldLabel>Pengguna</FieldLabel>
								<Input
									value={me?.email ?? "—"}
									readOnly
									className="bg-surface-alt text-muted-foreground"
								/>
							</div>
							<div>
								<FieldLabel>Kampung</FieldLabel>
								{kampungLoading ? (
									<Skeleton className="h-9 w-full" />
								) : (
									<Select
										value={effectiveKampungId || undefined}
										onValueChange={setKampungId}
									>
										<SelectTrigger className="text-muted-foreground w-full">
											<SelectValue placeholder="— Pilih kampung —" />
										</SelectTrigger>
										<SelectContent>
											{kampungList.map((k) => (
												<SelectItem key={k.id} value={k.id}>
													{k.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>
							<div>
								<FieldLabel>Mukim</FieldLabel>
								<Input
									value={selectedKampung?.mukim_name ?? "—"}
									readOnly
									className="bg-surface-alt text-muted-foreground"
								/>
							</div>
						</div>
					</SectionCard>

					{/* B — Data Penduduk */}
					<SectionCard title="B — Data Penduduk & Isi Rumah">
						<div className="grid gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-4">
							{(
								[
									["Jum. Penduduk", population, setPopulation],
									["Jum. Isi Rumah", households, setHouseholds],
									["Kelahiran (bulan ini)", births, setBirths],
									["Kematian (bulan ini)", deaths, setDeaths],
								] as const
							).map(([label, value, setter]) => (
								<div key={label}>
									<FieldLabel>{label}</FieldLabel>
									<Input
										value={value}
										onChange={(e) => setter(e.target.value.replace(/[^\d]/g, ""))}
										inputMode="numeric"
										placeholder="0"
										className="tabular-nums"
									/>
								</div>
							))}
						</div>
					</SectionCard>

					{/* C — Aktiviti */}
					<SectionCard title="C — Aktiviti & Program">
						<div className="p-4">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Nama Aktiviti</TableHead>
										<TableHead>Tarikh</TableHead>
										<TableHead className="text-right">Penyertaan</TableHead>
										<TableHead className="w-14" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{activities.map((a) => (
										<TableRow key={a.id}>
											<TableCell className="px-2.5 py-2">
												<Input
													value={a.name}
													onChange={(e) => updateActivity(a.id, { name: e.target.value })}
													placeholder="Nama aktiviti…"
													className="h-7 text-xs border bg-surface-alt"
												/>
											</TableCell>
											<TableCell className="px-2.5 py-2">
												<DatePickerCell
													date={a.date}
													onChange={(d) => updateActivity(a.id, { date: d })}
												/>
											</TableCell>
											<TableCell className="px-2.5 py-2 text-right">
												<Input
													value={a.attendance}
													onChange={(e) =>
														updateActivity(a.id, {
															attendance: e.target.value.replace(/[^\d]/g, ""),
														})
													}
													placeholder="0"
													inputMode="numeric"
													className="h-7 w-[60px] text-xs text-right border bg-surface-alt tabular-nums"
												/>
											</TableCell>
											<TableCell className="px-2.5 py-2 text-right">
												<Button
													variant="link"
													size="sm"
													onClick={() => removeActivity(a.id)}
													className="text-[11px] text-red p-0 h-auto"
												>
													Padam
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<Button
								variant="link"
								size="sm"
								onClick={addActivity}
								className="mt-2.5 text-xs font-semibold text-navy p-0 h-auto"
							>
								+ Tambah aktiviti
							</Button>
						</div>
					</SectionCard>

					{/* D — Catatan */}
					<SectionCard title="D — Isu & Catatan Tambahan">
						<div className="p-4">
							<Textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Nyatakan isu, kejadian atau catatan penting bulan ini…"
								className="min-h-[80px] resize-y leading-[1.6]"
							/>
						</div>
					</SectionCard>
				</div>

				{/* ── Right rail ── */}
				<div className="flex w-full flex-none flex-col gap-3.5 xl:w-[252px]">
					{/* Status */}
					<Card className="rounded-none ring-0 shadow-none py-0 gap-0">
						<div className="border-b px-4 py-3">
							<p className="heading-section text-xs">Status Borang</p>
						</div>
						<CardContent className="flex flex-col gap-2.5 px-4 py-3.5">
							<div className="flex items-center justify-between">
								<span className="text-xs text-text-mid">Status</span>
								<Badge
									variant="outline"
									className="border-amber-border bg-amber-bg text-amber rounded-none"
								>
									Draf
								</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs text-text-mid">Bulan</span>
								<span className="text-xs font-semibold text-navy tabular-nums">
									{periodLabel(period)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs text-text-mid">Peranan</span>
								<span className="text-xs text-muted-foreground">{me?.role ?? "—"}</span>
							</div>
						</CardContent>
					</Card>

					{/* Checklist */}
					<Card className="rounded-none ring-0 shadow-none py-0 gap-0">
						<div className="border-b px-4 py-3">
							<p className="heading-section text-xs">Senarai Semak</p>
						</div>
						<CardContent className="flex flex-col gap-2 px-4 py-3">
							{checklist.map(({ label, done }) => (
								<CheckItem key={label} done={done}>
									{label}
								</CheckItem>
							))}
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex flex-col gap-2">
						<LoadingButton
							onClick={() => save(true)}
							loading={saving}
							loadingText="Menyimpan…"
							className="font-heading w-full text-[13px] font-bold uppercase tracking-[0.08em]"
						>
							Serah Laporan
						</LoadingButton>
						<Button
							onClick={() => save(false)}
							disabled={saving}
							variant="outline"
							className="w-full text-xs font-medium"
						>
							Simpan Draf
						</Button>
						<Button
							onClick={() => window.print()}
							variant="outline"
							className="w-full text-xs font-medium"
						>
							Cetak / PDF
						</Button>
					</div>

					{/* Past reports */}
					<Card className="rounded-none ring-0 shadow-none py-0 gap-0">
						<div className="border-b px-4 py-3">
							<p className="heading-section text-xs">Laporan Lepas</p>
						</div>
						<div>
							{reportsLoading && (
								<div className="flex flex-col gap-2 p-4">
									{Array.from({ length: 3 }).map((_, i) => (
										<Skeleton key={i} className="h-5 w-full" />
									))}
								</div>
							)}
							{!reportsLoading && pastReports.length === 0 && (
								<p className="px-4 py-4 text-xs text-muted-foreground">
									Tiada laporan lepas.
								</p>
							)}
							{pastReports.map((r, i) => {
								const badge = STATUS_BADGE[r.status] ?? {
									label: r.status,
									variant: "secondary" as const,
								};
								return (
									<Link
										key={r.id}
										href={`/laporan/${r.id}`}
										className={cn(
											"flex items-center justify-between px-4 py-2 transition-colors hover:bg-surface-alt",
											i < pastReports.length - 1 && "border-b border-border-row",
										)}
									>
										<span className="text-xs tabular-nums">{periodLabel(r.period)}</span>
										<Badge variant={badge.variant} className="text-[10px]">
											{badge.label}
										</Badge>
									</Link>
								);
							})}
						</div>
					</Card>
				</div>
			</div>
		</AppLayout>
	);
}
