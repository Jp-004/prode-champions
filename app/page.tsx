"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

type EquipoInfo = { nombre: string; escudo_url: string | null };

type Perfil = {
  id: string;
  nombre: string;
  puntos_totales: number;
  aciertos_exactos: number;
  campeon?: EquipoInfo;
  subcampeon?: EquipoInfo;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ranking, setRanking] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para controlar la ventana modal del Perfil
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<(Perfil & { posicion: number }) | null>(null);

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);

      // Traemos el ranking con DOBLE ORDENAMIENTO (Puntos primero, Aciertos Exactos para desempatar)
      const { data: dataRanking, error } = await supabase
        .from("perfiles")
        .select(`
          id, nombre, puntos_totales, aciertos_exactos,
          campeon:equipos!campeon_id(nombre, escudo_url),
          subcampeon:equipos!subcampeon_id(nombre, escudo_url)
        `)
        .order("puntos_totales", { ascending: false })
        .order("aciertos_exactos", { ascending: false }); // Regla de desempate

      if (!error && dataRanking) {
        setRanking(dataRanking as unknown as Perfil[]);
      }
      
      setLoading(false);
    };

    fetchDatos();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const abrirPerfil = (perfil: Perfil, posicion: number) => {
    // Almacenamos el perfil seleccionado para mostrarlo en el modal
    setPerfilSeleccionado({ ...perfil, posicion });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 bg-gray-900/90 p-6 rounded-xl border border-gray-800 shadow-sm">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Prode Champions League
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {user ? `Sesión iniciada como: ${user.email}` : "Inicia sesión para participar"}
            </p>
          </div>
          
          <div className="flex flex-wrap justify-end gap-3">
            {user ? (
              <>
                <Link href="/posiciones" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-sm border border-emerald-500">
                  Armar Tabla
                </Link>
                <Link href="/cuadro" className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2.5 rounded-lg font-bold transition shadow-sm border border-gray-700">
                  Cuadro Final
                </Link>
                <Link href="/fixture" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-sm">
                  Mis Pronósticos
                </Link>
                <button onClick={handleLogout} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-2.5 rounded-lg font-semibold transition border border-gray-700">
                  Salir
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-sm">
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>

        {/* Ranking General */}
        <div className="bg-gray-900/90 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-800 bg-gray-900">
            <h2 className="text-xl font-bold flex items-center gap-2">🏆 Ranking General</h2>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-10">Cargando posiciones...</p>
          ) : ranking.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Aún no hay jugadores registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap text-sm">
                <thead>
                  <tr className="text-gray-400 bg-gray-950/50 uppercase tracking-wider text-xs border-b border-gray-800">
                    <th className="py-4 px-6 w-16 text-center font-semibold">Pos</th>
                    <th className="py-4 px-6 font-semibold">Jugador</th>
                    <th className="py-4 px-6 text-center w-24 font-bold text-gray-300">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {ranking.map((perfil, index) => {
                    const posicion = index + 1;
                    const esUsuarioActual = user?.id === perfil.id;
                    
                    let colorPosicion = "text-gray-400 font-bold";
                    if (posicion === 1) colorPosicion = "text-yellow-400 font-black text-lg";
                    else if (posicion === 2) colorPosicion = "text-gray-300 font-black text-lg";
                    else if (posicion === 3) colorPosicion = "text-amber-600 font-black text-lg";

                    return (
                      <tr key={perfil.id} className={`transition-colors hover:bg-gray-800/30 ${esUsuarioActual ? 'bg-blue-900/20' : ''}`}>
                        <td className={`py-4 px-6 text-center ${colorPosicion}`}>
                          {posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : `${posicion}°`}
                        </td>
                        <td className="py-4 px-6">
                          <button 
                            onClick={() => abrirPerfil(perfil, posicion)}
                            className={`font-semibold hover:underline decoration-blue-500 underline-offset-4 cursor-pointer transition ${esUsuarioActual ? 'text-blue-400' : 'text-gray-200 hover:text-white'}`}
                          >
                            {perfil.nombre}
                          </button>
                          {esUsuarioActual && <span className="ml-2 text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">Tú</span>}
                        </td>
                        <td className="py-4 px-6 text-center font-black text-white text-base">
                          {perfil.puntos_totales}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* --- TARJETA MODAL DEL JUGADOR --- */}
      {perfilSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="bg-gray-800/50 p-6 text-center relative border-b border-gray-800">
              <button 
                onClick={() => setPerfilSeleccionado(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
              <div className="w-16 h-16 bg-blue-600/20 border-2 border-blue-500 text-blue-400 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-3 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                {perfilSeleccionado.posicion}°
              </div>
              <h3 className="text-2xl font-bold text-white truncate px-4">{perfilSeleccionado.nombre}</h3>
              <p className="text-gray-400 text-sm mt-1">{perfilSeleccionado.puntos_totales} Puntos Totales</p>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-5">
              
              {/* Estadística de Resultados Exactos */}
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                <span className="text-gray-400 text-sm font-semibold">Resultados Exactos (3 pts)</span>
                <span className="text-emerald-400 font-black text-xl">{perfilSeleccionado.aciertos_exactos}</span>
              </div>

              {/* Candidatos al Torneo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center flex flex-col items-center justify-center">
                  <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-2">Campeón</span>
                  {perfilSeleccionado.campeon ? (
                    <>
                      {perfilSeleccionado.campeon.escudo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={perfilSeleccionado.campeon.escudo_url} alt="Campeón" className="w-10 h-10 object-contain mb-2 drop-shadow-md" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-800 rounded-full mb-2"></div>
                      )}
                      <span className="text-sm font-bold text-gray-200 line-clamp-1">{perfilSeleccionado.campeon.nombre}</span>
                    </>
                  ) : (
                    <span className="text-gray-500 text-sm italic py-2">Aún no elige</span>
                  )}
                </div>

                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-center flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Subcampeón</span>
                  {perfilSeleccionado.subcampeon ? (
                    <>
                      {perfilSeleccionado.subcampeon.escudo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={perfilSeleccionado.subcampeon.escudo_url} alt="Subcampeón" className="w-10 h-10 object-contain mb-2 drop-shadow-md" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-800 rounded-full mb-2"></div>
                      )}
                      <span className="text-sm font-bold text-gray-200 line-clamp-1">{perfilSeleccionado.subcampeon.nombre}</span>
                    </>
                  ) : (
                    <span className="text-gray-500 text-sm italic py-2">Aún no elige</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}