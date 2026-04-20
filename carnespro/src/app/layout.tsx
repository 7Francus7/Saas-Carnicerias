import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "CarnesPro — Sistema de Gestión para Carnicerías",
  description: "El sistema más completo para gestionar tu carnicería. Control de ventas, stock, desposte, costos y más.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
