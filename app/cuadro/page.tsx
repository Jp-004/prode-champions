"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { Trophy } from "lucide-react";

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

  const getPartidosPorFase = (fase: string) => {
    return partidos.filter((p) => p.fase === fase);
  };

  const TarjetaPartido = ({ partido, fase }: { partido: PartidoCuadro; fase: string }) => {
    const isFirst = fase === '16vos';
    const isFinal = fase === 'final';
    const isFork = fase === 'cuartos' || fase === 'semifinal' || fase === 'final';

    return (
      <div className="relative flex-1 flex flex-col justify-center w-full">
        {isFork && (
          <div className="absolute top-1/4 -left-8 w-0 h-1/2 border-l-2 border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.4)] pointer-events-none"></div>
        )}
        {!isFirst && (
          <div className="absolute top-1/2 -left-8 w-8 h-[2px] bg-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.4)] -translate-y-1/2 pointer-events-none"></div>
        )}
        {!isFinal && (
          <div className="absolute top-1/2 -right-8 w-8 h-[2px] bg-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.4)] z-0 -translate-y-1/2 pointer-events-none"></div>
        )}

        <div className={`relative z-10 rounded-xl p-1.5 border flex flex-col gap-1 w-full transition-all hover:scale-110 hover:z-20 cursor-default ${
          isFinal 
            ? 'bg-gradient-to-br from-yellow-900/40 to-gray-900 border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.25)]' 
            : 'bg-gradient-to-br from-gray-800/90 to-gray-900 border-gray-700 shadow-xl'
        }`}>
          <div className="flex justify-between items-center bg-gray-950/80 p-2 rounded-lg border border-gray-800/60">
            <div className="flex items-center gap-2 overflow-hidden">
              {partido.local?.escudo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={partido.local.escudo_url} alt="Escudo" className="w-5 h-5 lg:w-6 lg:h-6 object-contain drop-shadow-md" />
              ) : (
                <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-800/80 rounded-full border border-gray-700 dashed shrink-0"></div>
              )}
              <span className={`text-xs lg:text-sm font-semibold truncate tracking-wide ${partido.local ? 'text-gray-100' : 'text-gray-500'}`}>
                {partido.local?.nombre ?? "Por definir"}
              </span>
            </div>
            <span className={`font-black text-xs lg:text-sm w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded shadow-inner shrink-0 ${partido.goles_local !== null ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {partido.goles_local ?? "-"}
            </span>
          </div>

          <div className="flex justify-between items-center bg-gray-950/80 p-2 rounded-lg border border-gray-800/60">
            <div className="flex items-center gap-2 overflow-hidden">
              {partido.visitante?.escudo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={partido.visitante.escudo_url} alt="Escudo" className="w-5 h-5 lg:w-6 lg:h-6 object-contain drop-shadow-md" />
              ) : (
                <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gray-800/80 rounded-full border border-gray-700 dashed shrink-0"></div>
              )}
              <span className={`text-xs lg:text-sm font-semibold truncate tracking-wide ${partido.visitante ? 'text-gray-100' : 'text-gray-500'}`}>
                {partido.visitante?.nombre ?? "Por definir"}
              </span>
            </div>
            <span className={`font-black text-xs lg:text-sm w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded shadow-inner shrink-0 ${partido.goles_visitante !== null ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {partido.goles_visitante ?? "-"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-[100%] 2xl:max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Cuadro Final
            </h1>
          </div>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold border border-gray-700 transition shadow-sm">
            Volver
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="text-gray-400 text-lg font-medium animate-pulse">Generando llaves del torneo...</span>
          </div>
        ) : (
          <div className="bg-gray-900/40 p-4 md:p-8 rounded-2xl border border-gray-800/60 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 shadow-inner">
            <div className="flex gap-16 min-w-max min-h-[900px] relative px-8 py-4 items-stretch">
              <div className="flex flex-col w-48 lg:w-56 shrink-0">
                <div className="h-10 shrink-0 flex items-center justify-center mb-4">
                  <h2 className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest drop-shadow-md">Play-Offs</h2>
                </div>
                <div className="flex-1 flex flex-col">
                  {getPartidosPorFase('16vos').map(p => <TarjetaPartido key={p.id} partido={p} fase="16vos" />)}
                </div>
              </div>

              <div className="flex flex-col w-48 lg:w-56 shrink-0">
                <div className="h-10 shrink-0 flex items-center justify-center mb-4">
                  <h2 className="text-xs md:text-sm font-black text-gray-300 uppercase tracking-widest drop-shadow-md">Octavos</h2>
                </div>
                <div className="flex-1 flex flex-col">
                  {getPartidosPorFase('octavos').map(p => <TarjetaPartido key={p.id} partido={p} fase="octavos" />)}
                </div>
              </div>

              <div className="flex flex-col w-48 lg:w-56 shrink-0">
                <div className="h-10 shrink-0 flex items-center justify-center mb-4">
                  <h2 className="text-xs md:text-sm font-black text-blue-400 uppercase tracking-widest drop-shadow-md">Cuartos</h2>
                </div>
                <div className="flex-1 flex flex-col">
                  {getPartidosPorFase('cuartos').map(p => <TarjetaPartido key={p.id} partido={p} fase="cuartos" />)}
                </div>
              </div>

              <div className="flex flex-col w-48 lg:w-56 shrink-0">
                <div className="h-10 shrink-0 flex items-center justify-center mb-4">
                  <h2 className="text-xs md:text-sm font-black text-emerald-400 uppercase tracking-widest drop-shadow-md">Semifinal</h2>
                </div>
                <div className="flex-1 flex flex-col">
                  {getPartidosPorFase('semifinal').map(p => <TarjetaPartido key={p.id} partido={p} fase="semifinal" />)}
                </div>
              </div>

              <div className="flex flex-col w-48 lg:w-56 shrink-0">
                <div className="h-10 shrink-0 flex items-center justify-center mb-4">
                  <h2 className="text-sm md:text-base font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Final
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </h2>
                </div>
                <div className="flex-1 flex flex-col">
                  {getPartidosPorFase('final').map(p => (
                    <TarjetaPartido key={p.id} partido={p} fase="final" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}