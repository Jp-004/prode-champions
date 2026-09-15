"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

// Tipado estricto para los Goleadores completos
type Goleador = {
  id: number;
  jugador_nombre: string;
  equipo_nombre: string;
  goles: number;
  asistencias: number;
  penales: number;
};

export default function EstadisticasPage() {
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoleadores = async () => {
      // Traemos TODOS los goleadores ordenados por goles
      const { data } = await supabase
        .from("goleadores")
        .select("*")
        .order("goles", { ascending: false });

      if (data) setGoleadores(data);
      setLoading(false);
    };

    fetchGoleadores();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ENCABEZADO Y BOTÓN DE VOLVER */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 md:w-10 md:h-10 text-yellow-500">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
            </svg>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
              Máximos Goleadores
            </h1>
          </div>
        </div>

        {/* CONTENEDOR DE LA TABLA */}
        <div className="bg-gray-900/90 rounded-xl md:rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="text-gray-400 text-sm md:text-lg font-medium animate-pulse">Cargando la lista oficial...</span>
            </div>
          ) : goleadores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-gray-500 text-lg italic mb-2">No hay estadísticas disponibles aún.</p>
              <p className="text-gray-600 text-sm">Los datos aparecerán después de los primeros partidos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
              <table className="w-full text-left whitespace-nowrap border-collapse text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[10px] md:text-xs bg-gray-950">
                    <th className="py-4 px-4 text-center font-bold w-12">#</th>
                    <th className="py-4 px-4 font-bold">Jugador</th>
                    <th className="py-4 px-4 font-bold">Equipo</th>
                    <th className="py-4 px-4 text-center font-bold text-yellow-500 w-16">Goles</th>
                    <th className="hidden sm:table-cell py-4 px-4 text-center font-bold text-blue-400 w-16" title="Asistencias">Asist.</th>
                    <th className="hidden sm:table-cell py-4 px-4 text-center font-bold text-gray-400 w-16" title="Goles de Penal">Penales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {goleadores.map((jugador, index) => (
                    <tr key={jugador.id} className="hover:bg-gray-800/30 transition-colors">
                      {/* Posición con colores especiales para el podio */}
                      <td className="py-3.5 px-4 font-black text-center text-sm">
                        <span className={index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-300" : index === 2 ? "text-amber-700" : "text-gray-600"}>
                          {index + 1}°
                        </span>
                      </td>
                      
                      {/* Nombre del Jugador */}
                      <td className="py-3.5 px-4 font-bold text-gray-200">
                        {jugador.jugador_nombre}
                      </td>
                      
                      {/* Equipo */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs md:text-sm font-semibold uppercase tracking-wider text-gray-400">
                          {jugador.equipo_nombre}
                        </span>
                      </td>
                      
                      {/* Goles (Destacado) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded font-black text-base">
                          {jugador.goles}
                        </span>
                      </td>
                      
                      {/* Asistencias (Oculto en pantallas muy chicas) */}
                      <td className="hidden sm:table-cell py-3.5 px-4 text-center text-blue-400 font-semibold">
                        {jugador.asistencias}
                      </td>
                      
                      {/* Penales (Oculto en pantallas muy chicas) */}
                      <td className="hidden sm:table-cell py-3.5 px-4 text-center text-gray-500 font-medium">
                        {jugador.penales}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}