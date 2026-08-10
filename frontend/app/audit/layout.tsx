import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Log Audit",
  description: "Jejak audit aktiviti pengguna sistem | rekod cipta, kemas kini dan padam.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
