"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

type EquipoInfo = { nombre: string; escudo_url: string | null } | null;

type PartidoCuadro = {
  id: number;
  fase: string;
  orden_llave: number;
  goles_local: number | null;
  goles_visitante: number | null;
  local: EquipoInfo;
  visitante: EquipoInfo;
};

export default function CuadroPage() {
  const [partidos, setPartidos] = useState<PartidoCuadro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCuadro = async () => {
      // Traemos solo los partidos que NO son de fase de liga
      const { data } = await supabase
        .from("partidos")
        .select(`
          id, fase, orden_llave, goles_local, goles_visitante,
          local:equipos!equipo_local_id(nombre, escudo_url),
          visitante:equipos!equipo_visitante_id(nombre, escudo_url)
        `)
        .neq("fase", "fase_liga")
        .order("orden_llave", { ascending: true });

      if (data) setPartidos(data as unknown as PartidoCuadro[]);
      setLoading(false);
    };

    fetchCuadro();
  }, []);

  // Función para filtrar los partidos por fase específica
  const getPartidosPorFase = (fase: string) => {
    return partidos.filter((p) => p.fase === fase);
  };

  // Componente interno para dibujar la tarjeta de un partido
  const TarjetaPartido = ({ partido }: { partido: PartidoCuadro }) => (
    <div className="bg-gray-900 rounded-lg p-2.5 w-56 border border-gray-700 shadow-sm flex flex-col gap-1.5 shrink-0">
      {/* Equipo Local */}
      <div className="flex justify-between items-center bg-gray-950 p-2 rounded border border-gray-800">
        <div className="flex items-center gap-2 overflow-hidden">
          {partido.local?.escudo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={partido.local.escudo_url} alt="Escudo" className="w-5 h-5 object-contain" />
          ) : (
            <div className="w-5 h-5 bg-gray-800 rounded-full border border-gray-700 dashed"></div>
          )}
          <span className={`text-xs font-semibold truncate ${partido.local ? 'text-gray-200' : 'text-gray-500'}`}>
            {partido.local?.nombre ?? "Por definir"}
          </span>
        </div>
        <span className="font-bold text-sm text-white bg-gray-800 px-2 rounded">
          {partido.goles_local ?? "-"}
        </span>
      </div>

      {/* Equipo Visitante */}
      <div className="flex justify-between items-center bg-gray-950 p-2 rounded border border-gray-800">
        <div className="flex items-center gap-2 overflow-hidden">
          {partido.visitante?.escudo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={partido.visitante.escudo_url} alt="Escudo" className="w-5 h-5 object-contain" />
          ) : (
            <div className="w-5 h-5 bg-gray-800 rounded-full border border-gray-700 dashed"></div>
          )}
          <span className={`text-xs font-semibold truncate ${partido.visitante ? 'text-gray-200' : 'text-gray-500'}`}>
            {partido.visitante?.nombre ?? "Por definir"}
          </span>
        </div>
        <span className="font-bold text-sm text-white bg-gray-800 px-2 rounded">
          {partido.goles_visitante ?? "-"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">🏆 Cuadro Final</h1>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition">
            Volver al Panel
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-10">Generando llaves del torneo...</p>
        ) : (
          /* Contenedor con scroll horizontal para el árbol del torneo */
          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 overflow-x-auto">
            <div className="flex gap-10 items-center min-w-max pb-4">
              
              {/* Columna 16vos */}
              <div className="flex flex-col gap-4 relative">
                <h2 className="text-center text-sm font-black text-gray-400 uppercase tracking-widest mb-2">16vos de Final</h2>
                {getPartidosPorFase('16vos').map(p => <TarjetaPartido key={p.id} partido={p} />)}
              </div>

              {/* Columna Octavos */}
              <div className="flex flex-col gap-8 justify-around relative h-full">
                <h2 className="text-center text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Octavos</h2>
                {getPartidosPorFase('octavos').map(p => <TarjetaPartido key={p.id} partido={p} />)}
              </div>

              {/* Columna Cuartos */}
              <div className="flex flex-col gap-16 justify-around relative h-full">
                <h2 className="text-center text-sm font-black text-amber-500 uppercase tracking-widest mb-2">Cuartos</h2>
                {getPartidosPorFase('cuartos').map(p => <TarjetaPartido key={p.id} partido={p} />)}
              </div>

              {/* Columna Semifinales */}
              <div className="flex flex-col gap-32 justify-around relative h-full">
                <h2 className="text-center text-sm font-black text-orange-500 uppercase tracking-widest mb-2">Semifinal</h2>
                {getPartidosPorFase('semifinal').map(p => <TarjetaPartido key={p.id} partido={p} />)}
              </div>

              {/* Columna Final */}
              <div className="flex flex-col justify-center relative h-full">
                <h2 className="text-center text-sm font-black text-yellow-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                  <span>🏆</span> La Gran Final <span>🏆</span>
                </h2>
                {getPartidosPorFase('final').map(p => (
                  <div key={p.id} className="ring-2 ring-yellow-500/50 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                    <TarjetaPartido partido={p} />
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}