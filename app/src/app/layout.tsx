import type { Metadata } from "next";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "./globals.css";
import { AppProvider } from "@/components/mobile/app-provider";
import { SolanaProvider } from "@/components/mobile/solana-provider";

export const metadata: Metadata = {
  title: "DepositLock — Rental deposits, made clear",
  description: "A mobile demo for creating, tracking and returning a rental security deposit.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><SolanaProvider><AppProvider>{children}</AppProvider></SolanaProvider></body>
    </html>
  );
}
