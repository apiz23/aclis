import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Isu Komuniti",
  description: "Pengurusan dan pemantauan isu komuniti yang dilaporkan dalam daerah Pontian.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
