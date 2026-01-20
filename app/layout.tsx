import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nifty Master Journal",
  description: "Trading Journal Analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // FIX: Added suppressHydrationWarning to ignore browser extension injections
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}