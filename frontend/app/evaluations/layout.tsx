import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Penilaian Prestasi",
  description: "Penilaian prestasi Ketua Kampung dan Penghulu berdasarkan kriteria yang ditetapkan.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
