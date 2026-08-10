import type { Metadata } from "next";
import { Figtree, Barlow_Semi_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { SplashScreen } from "@/components/splash-screen";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | ACLIS",
    default: "ACLIS | Pejabat Daerah Pontian",
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
      className={cn(
        "h-full antialiased",
        figtree.variable,
        barlowSemiCondensed.variable,
        jetbrainsMono.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <SplashScreen />
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
