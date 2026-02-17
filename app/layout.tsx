import type { Metadata } from "next";
import "./globals.css";
import { GlobalProvider } from './context/GlobalContext';
import LayoutContent from "./components/LayoutContent";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Track your trades and psychology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body>
        <GlobalProvider>
            <LayoutContent>{children}</LayoutContent>
        </GlobalProvider>
      </body>
    </html>
  );
}