import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AKSES - Akses Edukasi Setara",
  description: "Platform belajar digital inklusif untuk penyandang disabilitas sensorik di Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.className}>
      <body className="antialiased bg-slate-50">
        <a href="#main-content" className="skip-to-content">
          Langsung ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
