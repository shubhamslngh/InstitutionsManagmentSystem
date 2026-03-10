import { Toaster } from "sonner";
import "./globals.css";

export const metadata = {
  title: "Maurya School Management",
  description: "Professional SaaS dashboard for institution, student, and fee operations."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}<Toaster richColors position="top-right" /></body>
    </html>
  );
}
