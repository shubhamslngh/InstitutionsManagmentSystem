import "./globals.css";

export const metadata = {
  title: "Maurya School Management",
  description: "Multi-institution school and college management built with Next.js."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
