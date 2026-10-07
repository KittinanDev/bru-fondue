import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BRU Fondue | ระบบรับแจ้งและรายงานปัญหาอุปกรณ์ชำรุด มรภ.บุรีรัมย์",
  description: "แจ้งปัญหา ติดตามงานซ่อม และร่วมดูแลมหาวิทยาลัยราชภัฏบุรีรัมย์ในที่เดียว",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:p-4">ข้ามไปยังเนื้อหา</a>
        <Navbar />
        <main id="main-content" className="flex-1">{children}</main>
      </body>
    </html>
  );
}


