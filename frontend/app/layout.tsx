import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Barlow_Semi_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    template: "%s — ACLIS",
    default: "ACLIS — Pejabat Daerah Pontian",
  },
  description: "Sistem AI Pengurusan Data Ketua Kampung & Penghulu, Pejabat Daerah Pontian",
  keywords: ["ACLIS", "Pejabat Daerah Pontian", "Ketua Kampung", "Penghulu", "Johor"],
  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
    shortcut: "/icons/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        plusJakartaSans.variable,
        barlowSemiCondensed.variable,
        ibmPlexMono.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster richColors closeButton />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
