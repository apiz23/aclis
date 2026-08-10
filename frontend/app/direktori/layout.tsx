import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Direktori",
  description: "Direktori kakitangan Pejabat Daerah, Penghulu dan Ketua Kampung daerah Pontian.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
