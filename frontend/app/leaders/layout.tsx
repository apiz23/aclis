import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pemimpin",
  description: "Senarai Ketua Kampung dan Penghulu daerah Pontian beserta maklumat lantikan dan parti.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
