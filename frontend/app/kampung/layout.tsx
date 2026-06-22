import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Profil Kampung",
  description: "Senarai dan profil kampung di bawah daerah Pontian termasuk data mukim dan B40.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
