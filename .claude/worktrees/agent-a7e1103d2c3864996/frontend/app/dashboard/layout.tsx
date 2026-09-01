import type { Metadata } from "next";
export const metadata: Metadata = { title: "Papan Pemuka" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
