"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { TableProperties } from "lucide-react";

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

export default function TablaOficialPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTabla = async () => {
      const { data } = await supabase
        .from("equipos")
        .select("*")
        .order("posicion_real_actual", { ascending: true });

      if (data) setEquipos(data);
      setLoading(false);
    };

    fetchTabla();
  }, []);

  const obtenerColorZona = (posicion: number) => {
    if (posicion >= 1 && posicion <= 8) return "bg-emerald-500/10 border-l-2 md:border-l-4 border-emerald-500 hover:bg-emerald-500/20";
    if (posicion >= 9 && posicion <= 24) return "bg-orange-500/10 border-l-2 md:border-l-4 border-orange-500 hover:bg-orange-500/20";
    return "bg-red-500/10 border-l-2 md:border-l-4 border-red-500 hover:bg-red-500/20";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-3 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado Responsivo */}
        <div className="flex justify-between items-start md:items-center mb-5 md:mb-8">
          <div className="mb-6 md:mb-10 mt-2 md:mt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <TableProperties className="w-6 h-6 md:w-7 md:h-7 text-purple-400" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 leading-tight">
                Tabla Oficial
              </h1>
            </div>
            <p className="text-gray-400 mt-2 text-sm pl-[52px] md:pl-[60px]">
              Fase de Liga de la Champions League
            </p>
          </div>
        </div>

        {/* Contenedor de la Tabla */}
        <div className="bg-gray-900/90 rounded-xl md:rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
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
                          /* eslint-disable-next-line @next/next/no-img-element */
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
    </div>
  );
}