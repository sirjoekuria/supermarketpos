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
  title: "SuperMarket POS - Modern Point of Sale",
  description: "A fast, scalable Point of Sale system for supermarkets and retail shops",
  keywords: ["POS", "Point of Sale", "Supermarket", "Retail Management", "Inventory", "Sales"],
  authors: [{ name: "RocScrew" }],
  openGraph: {
    title: "SuperMarket POS",
    description: "Modern POS and Inventory Management System",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SuperMarket POS",
    description: "Modern POS and Inventory Management System",
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
