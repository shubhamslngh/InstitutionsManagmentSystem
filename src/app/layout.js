import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata = {
  title: "Maurya School Management",
  description: "Multi-institution school and college management built with Next.js."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
