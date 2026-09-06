import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Premium Point of Sale System",
  description: "Advanced POS & Inventory Management software for professional retail operations.",
  keywords: ["POS", "Retail", "Sales Management", "Inventory Control", "Cloud POS"],
  authors: [{ name: "POS Admin" }],
  openGraph: {
    title: "Premium POS",
    description: "Enterprise-grade point of sale and inventory management.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Premium POS",
    description: "Enterprise-grade point of sale and inventory management.",
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
