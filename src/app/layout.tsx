import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Heer Collection Admin",
  description:
    "Admin panel for Heer Collection — premium luxury women's fashion. Manage products, orders, customers, and content.",
  icons: {
    icon: "/heer-logo.png",
    shortcut: "/heer-logo.png",
    apple: "/heer-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-[#F8F5F2] text-[#1A1A1A] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}