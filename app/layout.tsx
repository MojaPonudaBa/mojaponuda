import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const ibmPlexSerif = IBM_Plex_Serif({
  weight: ['400', '500', '600', '700'],
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "MojaPonuda.ba — Upravljanje ponudama u javnim nabavkama",
  description: "MojaPonuda je Vaš recept za uspjeh. Alat za upravljanje ponudama u javnim nabavkama u Bosni i Hercegovini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bs">
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
