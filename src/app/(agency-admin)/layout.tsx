import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { template: "%s | Dashboard", default: "Dashboard Agence" },
};

export default function AgencyAdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable}`} style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}>
      {children}
    </div>
  );
}
