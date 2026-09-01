"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, Trophy } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">
      {/* Sidebar controlado */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
      />

      {/* Contenido derecho */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Barra superior visible solo en celular */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800/80 backdrop-blur-md shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition border border-gray-700"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-sm tracking-tight text-white">Prode UCL</span>
          </div>

          <div className="w-9" /> {/* Espaciador para centrar el logo */}
        </header>

        {/* Scroll principal del contenido */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}