import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DepositLock",
  description:
    "Time-locked rental deposit escrow on Solana. Landlord inaction refunds the tenant automatically.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
