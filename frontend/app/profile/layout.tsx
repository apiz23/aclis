import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Profil Saya",
  description: "Maklumat akaun dan tetapan profil pengguna ACLIS.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
