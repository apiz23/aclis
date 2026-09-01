import type { Metadata } from "next";
export const metadata: Metadata = { title: "Isu Komuniti" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
