import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument" });

export const metadata: Metadata = {
  title: "GS Gestão Clínica",
  description: "CRM e gestão comercial para clínicas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${serif.variable} antialiased`}>{children}</body>
    </html>
  );
}
