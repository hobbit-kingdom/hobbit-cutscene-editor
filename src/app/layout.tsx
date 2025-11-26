import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cutscene Editor",
  description: "Cinema cutscene object editor for The Hobbit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
