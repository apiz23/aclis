import type { Metadata } from "next";
export const metadata: Metadata = { title: "Profil Kampung" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
