"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { TableProperties } from "lucide-react";

// Tipado estricto para los Equipos
type Equipo = {
  id: number;
  nombre: string;
  escudo_url: string | null;
  posicion_real_actual: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_empatados: number;
  partidos_perdidos: number;
  puntos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
};

// Tipado estricto para los Goleadores
type Goleador = {
  id: number;
  jugador_nombre: string;
  equipo_nombre: string;
  goles: number;
  escudo_url: string | null;
};

export default function TablaOficialPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Función para traer la tabla de posiciones
    const fetchTabla = async () => {
      const { data } = await supabase
        .from("equipos")
        .select("*")
        .order("posicion_real_actual", { ascending: true });

      if (data) setEquipos(data);
      setLoading(false);
    };

    // Función para traer el Top 5 de goleadores
    const fetchGoleadores = async () => {
      const { data } = await supabase
        .from("goleadores")
        .select("id, jugador_nombre, equipo_nombre, goles, escudo_url")
        .order("goles", { ascending: false })
        .limit(5);

      if (data) setGoleadores(data);
    };

    fetchTabla();
    fetchGoleadores();
  }, []);

  const obtenerColorZona = (posicion: number) => {
    if (posicion >= 1 && posicion <= 8) return "bg-emerald-500/10 border-l-2 md:border-l-4 border-emerald-500 hover:bg-emerald-500/20";
    if (posicion >= 9 && posicion <= 24) return "bg-orange-500/10 border-l-2 md:border-l-4 border-orange-500 hover:bg-orange-500/20";
    return "bg-red-500/10 border-l-2 md:border-l-4 border-red-500 hover:bg-red-500/20";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-3 md:p-8">
      {/* Ampliamos el max-w a 7xl para dar espacio a la estructura de columnas */}
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado Responsivo */}
        <div className="flex justify-between items-start md:items-center mb-5 md:mb-8">
          <div className="mb-6 md:mb-10 mt-2 md:mt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <TableProperties className="w-6 h-6 md:w-7 md:h-7 text-purple-400" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 leading-tight">
                Posiciones y Estadísticas
              </h1>
            </div>
            <p className="text-gray-400 mt-2 text-sm pl-[52px] md:pl-[60px]">
              Fase de Liga de la Champions League
            </p>
          </div>
        </div>

        {/* ESTRUCTURA GRID: 1 columna en móvil, 3 columnas en PC */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* COLUMNA IZQUIERDA (Ocupa 2 espacios en PC): TABLA DE POSICIONES */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/90 rounded-xl md:rounded-2xl border border-gray-800 shadow-xl overflow-hidden h-full">
              {/* Leyenda de Zonas */}
              <div className="flex flex-wrap gap-2 md:gap-4 p-3 md:p-4 border-b border-gray-800 bg-gray-950/50 text-[11px] md:text-xs font-semibold">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500 shrink-0"></div>
                  <span className="text-gray-300">Octavos de Final</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-orange-500 shrink-0"></div>
                  <span className="text-gray-300">Play-Offs</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500 shrink-0"></div>
                  <span className="text-gray-300">Eliminados</span>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-16 md:py-20">
                  <span className="text-gray-400 text-sm md:text-lg font-medium animate-pulse">Cargando clasificación...</span>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
                  <table className="w-full text-left whitespace-nowrap border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[10px] md:text-xs bg-gray-900">
                        <th className="py-2.5 px-2 md:py-4 md:px-4 text-center font-bold w-6 md:w-12">#</th>
                        <th className="py-2.5 px-2 md:py-4 md:px-4 font-bold max-w-[120px] md:max-w-none">Equipo</th>
                        <th className="py-2.5 px-1.5 md:py-4 md:px-3 text-center w-6 md:w-10">PJ</th>
                        <th className="hidden sm:table-cell py-2.5 px-1.5 md:py-4 md:px-3 text-center text-emerald-400 w-6 md:w-10">G</th>
                        <th className="hidden sm:table-cell py-2.5 px-1.5 md:py-4 md:px-3 text-center text-gray-400 w-6 md:w-10">E</th>
                        <th className="hidden sm:table-cell py-2.5 px-1.5 md:py-4 md:px-3 text-center text-red-400 w-6 md:w-10">P</th>
                        <th className="hidden sm:table-cell py-2.5 px-1.5 md:py-4 md:px-3 text-center w-6 md:w-10">GF</th>
                        <th className="hidden sm:table-cell py-2.5 px-1.5 md:py-4 md:px-3 text-center w-6 md:w-10">GC</th>
                        <th className="py-2.5 px-1.5 md:py-4 md:px-3 text-center w-6 md:w-10">DG</th>
                        <th className="py-2.5 px-2 md:py-4 md:px-4 text-center font-black text-white text-xs md:text-base w-8 md:w-14">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {equipos.map((equipo) => (
                        <tr key={equipo.id} className={`transition-colors ${obtenerColorZona(equipo.posicion_real_actual)}`}>
                          <td className="py-2 px-2 md:py-3.5 md:px-4 font-black text-white text-center text-xs md:text-base">{equipo.posicion_real_actual}°</td>
                          <td className="py-2 px-2 md:py-3.5 md:px-4 flex items-center gap-1.5 md:gap-3 max-w-[120px] md:max-w-none">
                            {equipo.escudo_url ? (
                              <img src={equipo.escudo_url} alt={`Escudo`} className="w-5 h-5 md:w-7 md:h-7 object-contain shrink-0 drop-shadow-md" />
                            ) : (
                              <div className="w-5 h-5 md:w-7 md:h-7 bg-gray-800 rounded-full shrink-0 border border-gray-700"></div>
                            )}
                            <span className="font-bold text-gray-200 truncate">{equipo.nombre}</span>
                          </td>
                          <td className="py-2 px-1.5 md:py-3.5 md:px-3 text-center text-gray-300 font-medium">{equipo.partidos_jugados}</td>
                          <td className="hidden sm:table-cell py-2 px-1.5 md:py-3.5 md:px-3 text-center text-emerald-400 font-bold">{equipo.partidos_ganados}</td>
                          <td className="hidden sm:table-cell py-2 px-1.5 md:py-3.5 md:px-3 text-center text-gray-400 font-bold">{equipo.partidos_empatados}</td>
                          <td className="hidden sm:table-cell py-2 px-1.5 md:py-3.5 md:px-3 text-center text-red-400 font-bold">{equipo.partidos_perdidos}</td>
                          <td className="hidden sm:table-cell py-2 px-1.5 md:py-3.5 md:px-3 text-center text-gray-300">{equipo.goles_favor}</td>
                          <td className="hidden sm:table-cell py-2 px-1.5 md:py-3.5 md:px-3 text-center text-gray-300">{equipo.goles_contra}</td>
                          <td className="py-2 px-1.5 md:py-3.5 md:px-3 text-center text-gray-400 font-semibold">{equipo.diferencia_goles}</td>
                          <td className="py-2 px-2 md:py-3.5 md:px-4 text-center font-black text-white text-xs md:text-lg bg-gray-900/30">{equipo.puntos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA (Ocupa 1 espacio en PC): RECUADRO DE GOLEADORES */}
          <div className="lg:col-span-1 space-y-6 self-start">
            <div className="bg-gray-900/90 rounded-xl md:rounded-2xl border border-gray-800 shadow-xl p-5 md:p-6 flex flex-col h-full">
              
              <div className="flex justify-between items-center mb-5 border-b border-gray-800 pb-4">
                <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                  Goleadores
                </h2>
              </div>

              <div className="flex-grow">
                {goleadores.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6 italic">Aún no hay estadísticas disponibles...</p>
                ) : (
                  <div className="space-y-3.5">
                    {goleadores.map((jugador, index) => (
                      <div key={jugador.id} className="flex items-center justify-between bg-gray-950/50 p-3 rounded-lg border border-gray-800/50 hover:bg-gray-800/50 transition">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-200 line-clamp-1">{jugador.jugador_nombre}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {jugador.escudo_url && (
                              <img src={jugador.escudo_url} alt={jugador.equipo_nombre} className="w-3.5 h-3.5 object-contain drop-shadow-sm" />
                            )}
                            <span className="text-[10px] md:text-xs uppercase tracking-wider text-gray-500">{jugador.equipo_nombre}</span>
                          </div>
                        </div>
                        <div className="bg-blue-600/20 border border-blue-500/20 px-3.5 py-1.5 rounded-lg text-blue-400 font-black text-lg">
                          {jugador.goles}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BOTÓN PARA REDIRECCIONAR A LA LISTA COMPLETA */}
              <div className="mt-6 pt-4 border-t border-gray-800">
                <Link href="/estadisticas" className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-lg text-xs uppercase tracking-widest font-bold transition border border-gray-700 flex justify-center items-center gap-2 shadow-sm group">
                  Lista Completa
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}