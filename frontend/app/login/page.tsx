import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
	return (
		<div className="min-h-dvh flex flex-col md:flex-row">
			{/* ── LEFT: Dark institutional panel — always dark regardless of theme ── */}
			<div
				className="relative hidden md:flex md:w-[42%] flex-col overflow-hidden"
				style={{ background: "oklch(0.09 0 0)", color: "oklch(0.97 0 0)" }}
			>
				{/* White grid texture */}
				<div
					aria-hidden
					className="absolute inset-0 opacity-[0.08]"
					style={{
						backgroundImage:
							"linear-gradient(to right, oklch(1 0 0) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0) 1px, transparent 1px)",
						backgroundSize: "40px 40px",
					}}
				/>

				<div className="relative z-10 flex flex-col justify-between h-full p-12">
					{/* Top: logo + org */}
					<div className="flex items-center gap-3">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src="/icons/android-chrome-192x192.png"
							alt="ACLIS"
							width={30}
							height={30}
							className="rounded-md opacity-80"
						/>
						<span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.97_0_0)]/50">
							Pejabat Daerah &amp; Tanah Pontian
						</span>
					</div>

					{/* Centre: wordmark */}
					<div>
						<h1 className="font-heading text-[6rem] font-bold leading-none tracking-tight text-[oklch(0.97_0_0)] mb-5">
							ACLIS
						</h1>
						<div
							className="w-10 h-px mb-5"
							style={{ background: "oklch(0.97 0 0 / 0.25)" }}
						/>
						<p className="text-sm text-[oklch(0.97_0_0)]/50 max-w-[26ch] leading-relaxed">
							AI Community Leadership Intelligence System — pengurusan pemimpin dan
							komuniti daerah Pontian.
						</p>
					</div>

					{/* Bottom: district + version */}
					<div className="space-y-1">
						<p className="text-[11px] uppercase tracking-[0.18em] text-[oklch(0.97_0_0)]/35">
							Johor Darul Ta&apos;zim
						</p>
						<p className="font-mono text-[11px] text-[oklch(0.97_0_0)]/20 tabular-nums">
							v1.0 &mdash; 2026
						</p>
					</div>
				</div>
			</div>

			{/* ── RIGHT: Form panel ── */}
			<div className="flex flex-1 flex-col justify-center bg-background min-h-dvh md:min-h-0 px-6 py-12 md:px-16 lg:px-24">
				{/* Mobile: compact brand header */}
				<div className="md:hidden flex items-center gap-3 mb-10">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="/icons/android-chrome-192x192.png"
						alt="ACLIS"
						width={38}
						height={38}
						className="rounded-lg"
					/>
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Pejabat Daerah Pontian
						</p>
						<h1 className="font-heading text-xl font-bold tracking-tight">ACLIS</h1>
					</div>
				</div>

				{/* Desktop: subtle back-reference to org */}
				<p className="hidden md:block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 mb-8">
					Pejabat Daerah &amp; Tanah Pontian
				</p>

				<div className="w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
					<LoginForm />
				</div>
			</div>
		</div>
	);
}
