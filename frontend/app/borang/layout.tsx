import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Borang",
  description: "Borang laporan bulanan Ketua Kampung, Pejabat Daerah Pontian.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
