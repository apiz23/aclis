import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Papan Pemuka",
  description: "Ringkasan statistik dan analisis AI untuk kampung dan pemimpin daerah Pontian.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
