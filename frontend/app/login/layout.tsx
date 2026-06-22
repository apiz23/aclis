import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Log Masuk",
  description: "Log masuk ke sistem ACLIS — Pejabat Daerah Pontian.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
