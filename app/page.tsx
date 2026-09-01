"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { Trophy, Medal, Lock, X } from "lucide-react";

type EquipoInfo = { nombre: string; escudo_url: string | null };
type Perfil = {
  id: string;
  nombre: string;
  puntos_totales: number;
  aciertos_exactos: number;
  campeon?: EquipoInfo;
  subcampeon?: EquipoInfo;
};
type EquipoTabla = { pos: number; nombre: string; escudo: string | null; puntos: number };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ranking, setRanking] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [miTablaGuardada, setMiTablaGuardada] = useState(false);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<(Perfil & { posicion: number }) | null>(null);
  const [tablaModal, setTablaModal] = useState<EquipoTabla[]>([]);
  const [cargandoTabla, setCargandoTabla] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { count } = await supabase
          .from("predicciones_posiciones")
          .select("*", { count: 'exact', head: true })
          .eq("usuario_id", session.user.id);
        setMiTablaGuardada((count ?? 0) > 0);
      }
      const { data: dataRanking, error } = await supabase
        .from("perfiles")
        .select(`
          id, nombre, puntos_totales, aciertos_exactos,
          campeon:equipos!campeon_id(nombre, escudo_url),
          subcampeon:equipos!subcampeon_id(nombre, escudo_url)
        `)
        .order("puntos_totales", { ascending: false })
        .order("aciertos_exactos", { ascending: false });
      if (!error && dataRanking) {
        setRanking(dataRanking as unknown as Perfil[]);
      }
      setLoading(false);
    };
    fetchDatos();
  }, []);

  const abrirPerfil = async (perfil: Perfil, posicion: number) => {
    setPerfilSeleccionado({ ...perfil, posicion });
    setTablaModal([]);
    setCargandoTabla(true);
    const { data, error } = await supabase
      .from("predicciones_posiciones")
      .select("posicion_predicha, equipo:equipos(nombre, escudo_url, posicion_real_actual)")
      .eq("usuario_id", perfil.id)
      .order("posicion_predicha", { ascending: true });
    if (!error && data) {
      type EquipoData = { nombre: string; escudo_url: string | null; posicion_real_actual: number };
      type PrediccionQuery = { posicion_predicha: number; equipo: EquipoData | EquipoData[]; };
      const predicciones = data as unknown as PrediccionQuery[];
      const obtenerZona = (pos: number) => {
        if (pos >= 1 && pos <= 8) return 1;
        if (pos >= 9 && pos <= 24) return 2;
        return 3;
      };
      const formateada = predicciones.map((d) => {
        const equipoData = Array.isArray(d.equipo) ? d.equipo[0] : d.equipo;
        const posPredicha = d.posicion_predicha;
        const posReal = equipoData?.posicion_real_actual || 0;
        let puntosCalc = 0;
        if (posReal > 0) {
          if (posPredicha === posReal) puntosCalc = 3;
          else if (obtenerZona(posPredicha) === obtenerZona(posReal)) puntosCalc = 1;
        }
        return { pos: posPredicha, nombre: equipoData?.nombre || "Sin equipo", escudo: equipoData?.escudo_url || null, puntos: puntosCalc };
      });
      setTablaModal(formateada);
    }
    setCargandoTabla(false);
  };

  const renderIconoPosicion = (posicion: number) => {
    if (posicion === 1) return <Medal className="w-5 h-5 text-yellow-400 mx-auto" strokeWidth={2.5} />;
    if (posicion === 2) return <Medal className="w-5 h-5 text-slate-300 mx-auto" strokeWidth={2.5} />;
    if (posicion === 3) return <Medal className="w-5 h-5 text-amber-600 mx-auto" strokeWidth={2.5} />;
    return <span className="font-bold text-gray-400 text-sm">{posicion}°</span>;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8 relative">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 bg-gray-900/90 p-6 rounded-2xl border border-gray-800 shadow-sm flex items-center gap-5">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Champions League" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-105 transition-transform" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Prode Champions League
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {user ? `Sesión iniciada como: ${user.email}` : "Inicia sesión para participar"}
            </p>
          </div>
        </div>

        <div className="bg-gray-900/90 rounded-2xl border border-gray-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-800 bg-gray-900 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400" strokeWidth={2.5} />
            <h2 className="text-xl font-bold">Ranking General</h2>
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
                    return (
                      <tr key={perfil.id} className={`transition-colors hover:bg-gray-800/30 ${esUsuarioActual ? 'bg-blue-900/20' : ''}`}>
                        <td className="py-4 px-6 text-center">
                          {renderIconoPosicion(posicion)}
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

      {perfilSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gray-800/50 p-6 text-center relative border-b border-gray-800 shrink-0">
              <button 
                onClick={() => setPerfilSeleccionado(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-16 h-16 bg-blue-600/20 border-2 border-blue-500 text-blue-400 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-3 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                {perfilSeleccionado.posicion}°
              </div>
              <h3 className="text-2xl font-bold text-white truncate px-4">{perfilSeleccionado.nombre}</h3>
              <p className="text-gray-400 text-sm mt-1">{perfilSeleccionado.puntos_totales} Puntos Totales</p>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              {!miTablaGuardada && perfilSeleccionado.id !== user?.id ? (
                <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 text-center flex flex-col items-center justify-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                    <Lock className="w-7 h-7 text-amber-400" strokeWidth={2} />
                  </div>
                  <h4 className="text-gray-200 font-bold mb-2">Secreto de Estado</h4>
                  <p className="text-sm text-gray-500">Debes guardar tu propia tabla en la sección <strong>Armar Tabla</strong> para poder espiar los pronósticos de {perfilSeleccionado.nombre}.</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-semibold">Resultados Exactos (3 pts)</span>
                    <span className="text-emerald-400 font-black text-xl">{perfilSeleccionado.aciertos_exactos}</span>
                  </div>
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
                  <div className="mt-2 border-t border-gray-800 pt-5">
                    <h4 className="text-sm font-bold text-gray-300 mb-3 flex justify-between items-center">
                      <span>Predicción Fase Liga</span>
                      {tablaModal.length > 0 && <span className="text-xs font-normal text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Tabla Guardada</span>}
                    </h4>
                    {cargandoTabla ? (
                      <div className="flex justify-center py-4"><span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span></div>
                    ) : tablaModal.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto pr-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-700">
                        {tablaModal.map(t => (
                          <div key={t.pos} className="flex items-center justify-between bg-gray-950 p-2 rounded border border-gray-800/60">
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`w-5 font-black ${t.pos <= 8 ? 'text-emerald-500' : t.pos <= 24 ? 'text-orange-400' : 'text-red-500'}`}>{t.pos}°</span>
                              {t.escudo ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={t.escudo} className="w-5 h-5 object-contain" alt="escudo" />
                              ) : (
                                <div className="w-5 h-5 bg-gray-800 rounded-full"></div>
                              )}
                              <span className="text-gray-200 font-medium truncate">{t.nombre}</span>
                            </div>
                            <div className={`text-sm font-black pr-2 ${t.puntos === 3 ? 'text-emerald-400' : t.puntos === 1 ? 'text-yellow-400' : 'text-gray-600'}`}>
                              {t.puntos}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-center">
                        <p className="text-sm text-gray-500 italic">Aún no completó su tabla.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}