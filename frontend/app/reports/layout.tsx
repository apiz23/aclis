import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Laporan Bulanan",
  description: "Laporan bulanan aktiviti dan perkembangan kampung yang dikemukakan oleh Ketua Kampung.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
