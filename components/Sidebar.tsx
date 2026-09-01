"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { 
  Home, 
  Gamepad2, 
  ListOrdered, 
  Trophy, 
  TableProperties, 
  ChevronRight, 
  Menu, 
  X,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  const menuItems = [
    { nombre: "Panel Principal", ruta: "/", Icono: Home },
    { nombre: "Mis Pronósticos", ruta: "/fixture", Icono: Gamepad2 },
    { nombre: "Armar Tabla", ruta: "/posiciones", Icono: ListOrdered },
    { nombre: "Tabla Oficial", ruta: "/tabla", Icono: TableProperties },
    { nombre: "Cuadro Final", ruta: "/cuadro", Icono: Trophy },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Botón flotante para celular */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-gray-900/90 backdrop-blur-md p-2.5 rounded-xl border border-gray-700 shadow-xl text-white hover:bg-gray-800 transition"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-gray-200" strokeWidth={2.5} />
      </button>

      {/* Backdrop oscuro para celular */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Barra Lateral Plegable */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900/95 border-r border-gray-800 backdrop-blur-md shadow-2xl z-50 flex flex-col transition-all duration-300 ease-in-out md:relative md:flex-shrink-0 ${
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        } ${isExpanded ? "md:w-64" : "md:w-[84px]"}`}
      >
        {/* Cabecera del menú */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800/60 min-h-[72px]">
          <div className={`overflow-hidden transition-all duration-300 ${!isExpanded ? "md:w-0 md:opacity-0" : "w-auto opacity-100"}`}>
            <div className="flex items-center gap-2 pl-2">
               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                 <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
               </div>
               <h2 className="text-lg font-black tracking-tight text-white whitespace-nowrap">
                 Prode UCL
               </h2>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition border border-gray-700 mx-auto group"
            title={isExpanded ? "Plegar menú" : "Desplegar menú"}
          >
            <ChevronRight 
              className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isExpanded ? "rotate-180" : ""}`} 
              strokeWidth={3} 
            />
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const activo = pathname === item.ruta;
            const Icono = item.Icono;

            return (
              <Link
                key={item.ruta}
                href={item.ruta}
                onClick={() => setMobileOpen(false)}
                title={!isExpanded ? item.nombre : undefined}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium transition-all group relative ${
                  activo
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-gray-400 hover:bg-gray-800/40 hover:text-gray-200"
                } ${!isExpanded ? "md:justify-center md:px-0" : ""}`}
              >
                {activo && (
                  <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
                )}

                <Icono 
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ${activo ? "text-blue-500" : "group-hover:scale-110"}`} 
                  strokeWidth={activo ? 2.5 : 2} 
                />
                
                <span
                  className={`whitespace-nowrap transition-all duration-300 text-[15px] ${
                    !isExpanded ? "md:w-0 md:opacity-0 overflow-hidden" : "w-auto opacity-100"
                  } ${activo ? "font-bold" : ""}`}
                >
                  {item.nombre}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Pie de la barra con Botón Salir */}
        <div className="p-3 border-t border-gray-800/60">
          <button
            onClick={handleLogout}
            title={!isExpanded ? "Cerrar Sesión" : undefined}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group ${
              !isExpanded ? "md:justify-center md:px-0" : ""
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" strokeWidth={2} />
            <span
              className={`whitespace-nowrap transition-all duration-300 text-[15px] font-semibold ${
                !isExpanded ? "md:w-0 md:opacity-0 overflow-hidden" : "w-auto opacity-100"
              }`}
            >
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}