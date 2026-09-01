import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar"; // <-- Importamos nuestra nueva barra

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prode Champions League",
  description: "Demuestra cuánto sabes de fútbol y compite con tus amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* 
        Cambiamos la estructura aquí: 
        Le decimos que ocupe todo el alto, sea flex en fila (barra al lado del contenido)
        y ocultamos el scroll general para pasárselo solo al área derecha.
      */}
      <body className="flex h-full bg-gray-950 text-white overflow-hidden">
        
        {/* Aquí insertamos el menú lateral fijo */}
        <Sidebar />

        {/* El contenedor principal donde se cargarán tus pantallas */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
        
      </body>
    </html>
  );
}