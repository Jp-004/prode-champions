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
    if (posicion >= 1 && posicion <= 8) return "bg-emerald-500/10 border-l-4 border-emerald-500 hover:bg-emerald-500/20";
    if (posicion >= 9 && posicion <= 24) return "bg-orange-500/10 border-l-4 border-orange-500 hover:bg-orange-500/20";
    return "bg-red-500/10 border-l-4 border-red-500 hover:bg-red-500/20";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start md:items-center mb-8">
        <div className="pl-12 md:pl-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <TableProperties className="w-4 h-4 md:w-6 md:h-6 text-purple-400" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 leading-tight">
              Tabla Oficial
            </h1>
          </div>
          <p className="text-gray-400 mt-1 md:mt-2 text-xs md:text-sm pl-10 md:pl-[52px]">
            Fase de Liga de la Champions League
          </p>
        </div>
        <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold border border-gray-700 transition shadow-sm shrink-0 mt-1 md:mt-0">
          Volver
        </Link>
      </div>

        <div className="bg-gray-900/90 rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="flex flex-wrap gap-4 p-4 border-b border-gray-800 bg-gray-950/50 text-xs font-semibold">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-gray-300">Octavos de Final</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-300">Play-Offs</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-300">Eliminados</span>
             </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="text-gray-400 text-lg font-medium animate-pulse">Cargando clasificación oficial...</span>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700">
              <table className="w-full min-w-[700px] text-left whitespace-nowrap border-collapse text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800 text-xs uppercase tracking-wider bg-gray-900">
                    <th className="py-4 px-4 w-12 text-center font-bold">Pos</th>
                    <th className="py-4 px-4 text-left min-w-[200px] font-bold">Equipo</th>
                    <th className="py-4 px-3 text-center w-10">J</th>
                    <th className="py-4 px-3 text-center w-10 text-emerald-400">G</th>
                    <th className="py-4 px-3 text-center w-10 text-gray-400">E</th>
                    <th className="py-4 px-3 text-center w-10 text-red-400">P</th>
                    <th className="py-4 px-3 text-center w-10">GF</th>
                    <th className="py-4 px-3 text-center w-10">GC</th>
                    <th className="py-4 px-3 text-center w-10">DG</th>
                    <th className="py-4 px-4 text-center w-14 font-black text-white text-base">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {equipos.map((equipo) => (
                    <tr key={equipo.id} className={`transition-colors ${obtenerColorZona(equipo.posicion_real_actual)}`}>
                      <td className="py-3.5 px-4 font-black text-white text-center text-base">{equipo.posicion_real_actual}°</td>
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        {equipo.escudo_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={equipo.escudo_url} alt={`Escudo`} className="w-7 h-7 object-contain shrink-0 drop-shadow-md" />
                        ) : (
                          <div className="w-7 h-7 bg-gray-800 rounded-full shrink-0 border border-gray-700"></div>
                        )}
                        <span className="font-bold text-gray-200 truncate">{equipo.nombre}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center text-gray-300 font-medium">{equipo.partidos_jugados}</td>
                      <td className="py-3.5 px-3 text-center text-emerald-400 font-bold">{equipo.partidos_ganados}</td>
                      <td className="py-3.5 px-3 text-center text-gray-400 font-bold">{equipo.partidos_empatados}</td>
                      <td className="py-3.5 px-3 text-center text-red-400 font-bold">{equipo.partidos_perdidos}</td>
                      <td className="py-3.5 px-3 text-center text-gray-300">{equipo.goles_favor}</td>
                      <td className="py-3.5 px-3 text-center text-gray-300">{equipo.goles_contra}</td>
                      <td className="py-3.5 px-3 text-center text-gray-400 font-semibold">{equipo.diferencia_goles}</td>
                      <td className="py-3.5 px-4 text-center font-black text-white text-lg bg-gray-900/30 rounded-r-lg">{equipo.puntos}</td>
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