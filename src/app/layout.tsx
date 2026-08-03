import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "CodeBoard",
  description: "Orchestrate GitHub Copilot CLI coding tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-neutral-900 text-neutral-100">
        <NavBar />
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
