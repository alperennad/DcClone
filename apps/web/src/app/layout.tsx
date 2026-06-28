import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Main Room Voice Chat",
  description: "Private LiveKit voice room for a small friend group"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
