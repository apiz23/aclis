import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pengumuman",
  description: "Notis rasmi, siaran dan arahan perkhidmatan Pejabat Daerah Pontian.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
