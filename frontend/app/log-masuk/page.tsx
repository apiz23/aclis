import Image from "next/image";
import { LoginForm } from "@/components/login-form";

const BRAND_STATS = [
	{ value: "10", label: "Mukim" },
	{ value: "93", label: "Ketua Kampung" },
	{ value: "3", label: "Peranan Pengguna" },
];

export default function LoginPage() {
	return (
		<div className="min-h-dvh flex flex-col md:flex-row">
			{/* ── LEFT: Navy institutional panel ── */}
			<div className="relative hidden md:flex md:w-[40%] max-w-[560px] flex-col overflow-hidden bg-navy text-white">
				{/* Subtle geometric grid */}
				<div
					aria-hidden
					className="absolute inset-0 opacity-[0.04]"
					style={{
						backgroundImage:
							"linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
						backgroundSize: "140px 200px",
					}}
				/>

				<div className="relative z-10 flex flex-1 flex-col justify-center px-14 py-16">
					{/* Logo + org */}
					<div className="mb-12 flex items-center gap-4">
						<div className="size-12 shrink-0 overflow-hidden">
							<Image
								src="/icons/android-chrome-192x192.png"
								alt="ACLIS"
								width={48}
								height={48}
								className="object-contain"
								priority
							/>
						</div>
						<div>
							<p className="font-heading mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
								Kerajaan Malaysia
							</p>
							<p className="font-heading text-[13px] font-semibold uppercase tracking-[0.12em] text-white/55">
								Pejabat Daerah Pontian, Johor
							</p>
						</div>
					</div>

					{/* Wordmark */}
					<div className="mb-9">
						<h1 className="font-heading mb-3 text-[52px] font-bold uppercase leading-[0.95] tracking-[0.02em] text-white">
							Pontian
						</h1>
						<div className="mb-6 h-[3px] w-[52px] bg-gold" />
						<p className="font-heading text-[17px] font-semibold uppercase leading-[1.4] tracking-[0.06em] text-white/70">
							Sistem Pengurusan
							<br />
							Daerah
						</p>
					</div>

					<p className="max-w-[360px] text-sm leading-[1.7] text-white/45">
						Platform pengurusan rekod ketua kampung, laporan bulanan, isu komuniti dan
						penilaian prestasi bagi Daerah Pontian, Johor.
					</p>

					{/* Stats */}
					<div className="mt-12 flex gap-8">
						{BRAND_STATS.map(({ value, label }) => (
							<div key={label}>
								<p className="font-heading text-[32px] font-bold leading-none text-gold tabular-nums">
									{value}
								</p>
								<p className="mt-1 text-[11px] tracking-[0.04em] text-white/40">
									{label}
								</p>
							</div>
						))}
					</div>
				</div>

				{/* Footer */}
				<div className="relative z-10 border-t border-white/10 px-14 py-6">
					<p className="text-[11px] leading-[1.6] text-white/25">
						Jabatan Daerah Pontian
						<br />© 2026 Kerajaan Johor. Hak Cipta Terpelihara.
					</p>
				</div>
			</div>

			{/* ── RIGHT: Form panel ── */}
			<div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-6 py-12 md:min-h-0 md:px-16">
				{/* Mobile brand header */}
				<div className="mb-10 flex w-full max-w-sm items-center gap-3 md:hidden">
					<div className="size-10 shrink-0 overflow-hidden">
						<Image
							src="/icons/android-chrome-192x192.png"
							alt="ACLIS"
							width={40}
							height={40}
							className="object-contain"
						/>
					</div>
					<div>
						<p className="font-heading text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
							Pejabat Daerah
						</p>
						<h1 className="font-heading text-xl font-bold uppercase tracking-[0.03em] text-navy">
							Pontian
						</h1>
					</div>
				</div>

				<div className="w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
					<LoginForm />
				</div>

				<p className="absolute bottom-6 text-[11px] tracking-[0.03em] text-muted-foreground/60 tabular-nums">
					ACLIS · Pejabat Daerah Pontian
				</p>
			</div>
		</div>
	);
}
