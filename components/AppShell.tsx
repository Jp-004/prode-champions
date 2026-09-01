"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "./Sidebar";
import { Menu, Trophy, ArrowLeft } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  // Verificamos si estamos en la página principal
  const isHome = pathname === "/";

  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* BARRA SUPERIOR (Solo Móvil) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900/90 border-b border-gray-800/80 backdrop-blur-md shrink-0 z-10">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition border border-gray-700 shadow-sm"
          >
            <Menu className="w-5 h-5" strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-inner">
              <Trophy className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-sm tracking-tight text-white">Prode UCL</span>
          </div>

          {/* Botón Volver dinámico */}
          {!isHome ? (
            <Link href="/" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition border border-gray-700 shadow-sm">
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          ) : (
            <div className="w-9" /> 
          )}
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto relative">
          
          {/* Botón Volver Global (Solo PC) */}
          {!isHome && (
            <div className="hidden md:block absolute top-6 right-8 z-20">
              <Link href="/" className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 backdrop-blur-md px-4 py-2.5 rounded-lg text-sm font-bold border border-gray-700 transition shadow-sm text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} /> Volver
              </Link>
            </div>
          )}
          
          {children}
        </main>
      </div>
    </div>
  );
}