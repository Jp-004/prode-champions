"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

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

type Partido = {
  id: number;
  fecha_partido: string;
  estado: string;
  goles_local: number | null;
  goles_visitante: number | null;
  jornada?: number | null;
  local: { nombre: string; escudo_url: string | null };
  visitante: { nombre: string; escudo_url: string | null };
};

type Notificacion = {
  mensaje: string;
  tipo: "exito" | "error";
};

export default function FixturePage() {
  const [user, setUser] = useState<User | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [inputs, setInputs] = useState<Record<number, { local: number; visitante: number }>>({});
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<number>(1);
  
  const [campeonId, setCampeonId] = useState<string>("");
  const [subcampeonId, setSubcampeonId] = useState<string>("");
  const [guardandoCandidatos, setGuardandoCandidatos] = useState(false);

  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [notificacion, setNotificacion] = useState<Notificacion | null>(null);

  const FECHA_LIMITE = new Date("2026-09-15T16:00:00Z");
  const bloqueoActivo = new Date() > FECHA_LIMITE;

  const mostrarNotificacion = (mensaje: string, tipo: "exito" | "error" = "exito") => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => {
      setNotificacion(null);
    }, 3000);
  };

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);

      const { data: dataEquipos } = await supabase
        .from("equipos")
        .select("*")
        .order("posicion_real_actual", { ascending: true });
      if (dataEquipos) setEquipos(dataEquipos);

      const { data: dataPartidos } = await supabase
        .from("partidos")
        .select(`
          id, fecha_partido, estado, goles_local, goles_visitante, jornada,
          local:equipos!equipo_local_id(nombre, escudo_url),
          visitante:equipos!equipo_visitante_id(nombre, escudo_url)
        `)
        .not("equipo_local_id", "is", null)
        .order("fecha_partido", { ascending: true });
      if (dataPartidos) setPartidos(dataPartidos as unknown as Partido[]);

      if (session) {
        const { data: misPredicciones } = await supabase
          .from("predicciones")
          .select("*")
          .eq("usuario_id", session.user.id);

        if (misPredicciones) {
          const prediccionesPrevias: Record<number, { local: number; visitante: number }> = {};
          misPredicciones.forEach((p) => {
            prediccionesPrevias[p.partido_id] = {
              local: p.prediccion_local,
              visitante: p.prediccion_visitante,
            };
          });
          setInputs(prediccionesPrevias);
        }

        const { data: miPerfil } = await supabase
          .from("perfiles")
          .select("campeon_id, subcampeon_id")
          .eq("id", session.user.id)
          .single();

        if (miPerfil) {
          if (miPerfil.campeon_id) setCampeonId(miPerfil.campeon_id.toString());
          if (miPerfil.subcampeon_id) setSubcampeonId(miPerfil.subcampeon_id.toString());
        }
      }
      setLoading(false);
    };

    fetchDatos();
  }, []);

  const ajustarGoles = (partidoId: number, tipo: "local" | "visitante", delta: number) => {
    setInputs((prev) => {
      const actual = prev[partidoId] ?? { local: 0, visitante: 0 };
      const nuevoValor = Math.max(0, actual[tipo] + delta);
      return { ...prev, [partidoId]: { ...actual, [tipo]: nuevoValor } };
    });
  };

  const guardarPrediccion = async (partidoId: number) => {
    if (!user) return mostrarNotificacion("Debes iniciar sesión para jugar.", "error");
    
    const prediccion = inputs[partidoId] ?? { local: 0, visitante: 0 };
    setGuardandoId(partidoId);

    const { error } = await supabase
      .from("predicciones")
      .upsert({
        usuario_id: user.id,
        partido_id: partidoId,
        prediccion_local: prediccion.local,
        prediccion_visitante: prediccion.visitante,
      }, { onConflict: "usuario_id, partido_id" });

    setGuardandoId(null);

    if (error) mostrarNotificacion("Error al guardar el pronóstico.", "error");
    else mostrarNotificacion("¡Pronóstico guardado exitosamente!", "exito");
  };

  const guardarCandidatos = async () => {
    if (!user) return mostrarNotificacion("Debes iniciar sesión.", "error");
    if (bloqueoActivo) return mostrarNotificacion("La fecha límite ya ha pasado.", "error");
    if (!campeonId || !subcampeonId) return mostrarNotificacion("Selecciona a ambos equipos.", "error");
    if (campeonId === subcampeonId) return mostrarNotificacion("Campeón y Subcampeón no pueden ser el mismo.", "error");

    setGuardandoCandidatos(true);

    const { error } = await supabase
      .from("perfiles")
      .update({
        campeon_id: parseInt(campeonId),
        subcampeon_id: parseInt(subcampeonId)
      })
      .eq("id", user.id);

    setGuardandoCandidatos(false);

    if (error) mostrarNotificacion("Error al guardar candidatos.", "error");
    else mostrarNotificacion("¡Candidatos guardados exitosamente!", "exito");
  };

  const obtenerColorFila = (posicion: number) => {
    if (posicion >= 1 && posicion <= 8) return "bg-emerald-500/10 border-l-4 border-emerald-500 hover:bg-emerald-500/20";
    if (posicion >= 9 && posicion <= 24) return "bg-orange-500/10 border-l-4 border-orange-500 hover:bg-orange-500/20";
    return "bg-red-500/10 border-l-4 border-red-500 hover:bg-red-500/20";
  };

  const formatearFecha = (fechaIso: string) => {
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Date(fechaIso).toLocaleDateString('es-ES', opciones).replace(',', ' -');
  };

  const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Filtra los partidos de la fecha seleccionada
  const partidosFiltrados = partidos.filter((p, index) => {
    if (p.jornada) return p.jornada === jornadaSeleccionada;
    // Respaldo en caso de que la columna jornada aún no tenga valor: 18 partidos por fecha
    const fechaCalculada = Math.floor(index / 18) + 1;
    return fechaCalculada === jornadaSeleccionada;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      {notificacion && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`px-5 py-3 rounded-lg shadow-xl font-medium border flex items-center gap-2 ${
            notificacion.tipo === "exito" ? "bg-emerald-950/90 border-emerald-500 text-emerald-200" : "bg-red-950/90 border-red-500 text-red-200"
          }`}>
            <span>{notificacion.tipo === "exito" ? "✓" : "⚠"}</span>
            {notificacion.mensaje}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            ⚽ Fixture y Posiciones
          </h1>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition">
            Volver
          </Link>
        </div>

        <div className="bg-gray-900/90 p-5 md:p-6 rounded-xl border border-gray-800 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
              🏆 Pronóstico a Largo Plazo
            </h2>
            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${bloqueoActivo ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800'}`}>
              {bloqueoActivo ? '🔒 Selecciones bloqueadas' : '⏳ Cierra el 15 de Septiembre'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Campeón</label>
              <select 
                value={campeonId}
                onChange={(e) => setCampeonId(e.target.value)}
                disabled={bloqueoActivo || loading}
                className="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-3 disabled:opacity-60"
              >
                <option value="">Selecciona el Campeón</option>
                {equiposOrdenados.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Subcampeón</label>
              <select 
                value={subcampeonId}
                onChange={(e) => setSubcampeonId(e.target.value)}
                disabled={bloqueoActivo || loading}
                className="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-gray-400 focus:border-gray-400 block w-full p-3 disabled:opacity-60"
              >
                <option value="">Selecciona el Subcampeón</option>
                {equiposOrdenados.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={guardarCandidatos}
              disabled={bloqueoActivo || guardandoCandidatos || loading}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed border border-yellow-500 text-white font-bold p-3 rounded-lg transition shadow-sm h-[46px]"
            >
              {guardandoCandidatos ? "Guardando..." : "Guardar Elección"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna Izquierda: Partidos y Paginador de Fechas */}
          <div className="lg:col-span-1 bg-gray-900/90 p-5 rounded-xl border border-gray-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-200">Partidos</h2>
              <span className="text-xs bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-full font-bold border border-blue-500/30">
                Fecha {jornadaSeleccionada}
              </span>
            </div>

            {/* Pestañas de Fechas 1 a 8 */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-thin scrollbar-thumb-gray-700">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setJornadaSeleccionada(num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    jornadaSeleccionada === num
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  F{num}
                </button>
              ))}
            </div>
            
            {loading ? (
              <p className="text-center text-gray-400 py-6">Cargando partidos...</p>
            ) : partidosFiltrados.length === 0 ? (
              <div className="text-gray-400 text-center py-10 border border-dashed border-gray-700 rounded-lg">
                No hay partidos para esta fecha.
              </div>
            ) : (
              <div className="space-y-4">
                {partidosFiltrados.map((partido) => {
                  const golesLoc = inputs[partido.id]?.local ?? 0;
                  const golesVis = inputs[partido.id]?.visitante ?? 0;

                  return (
                    <div key={partido.id} className="bg-gray-950/70 p-4 rounded-lg border border-gray-800/80">
                      <div className="text-center text-xs text-gray-400 mb-4 font-semibold uppercase tracking-wider">
                        {formatearFecha(partido.fecha_partido)}
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-2">
                        {/* Equipo Local */}
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 mb-2 flex items-center justify-center">
                            {partido.local.escudo_url ? (
                              <img src={partido.local.escudo_url} alt={partido.local.nombre} className="w-9 h-9 object-contain" />
                            ) : (
                              <div className="w-9 h-9 bg-gray-800 rounded-full"></div>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">
                            {partido.local.nombre}
                          </span>
                        </div>

                        {/* Controles de Marcador */}
                        <div className="flex flex-col items-center justify-center gap-3">
                          {partido.estado === 'pendiente' ? (
                            <>
                              <div className="flex items-center justify-center gap-3 bg-gray-900/60 p-2 rounded-lg border border-gray-800 w-full">
                                <div className="flex flex-col items-center gap-1">
                                  <button type="button" onClick={() => ajustarGoles(partido.id, "local", 1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">+</button>
                                  <span className="w-7 text-center font-bold text-lg text-white">{golesLoc}</span>
                                  <button type="button" onClick={() => ajustarGoles(partido.id, "local", -1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">-</button>
                                </div>
                                <span className="text-gray-600 font-black text-lg">-</span>
                                <div className="flex flex-col items-center gap-1">
                                  <button type="button" onClick={() => ajustarGoles(partido.id, "visitante", 1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">+</button>
                                  <span className="w-7 text-center font-bold text-lg text-white">{golesVis}</span>
                                  <button type="button" onClick={() => ajustarGoles(partido.id, "visitante", -1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">-</button>
                                </div>
                              </div>
                              <button 
                                onClick={() => guardarPrediccion(partido.id)}
                                disabled={guardandoId === partido.id}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-md font-semibold transition w-full shadow-sm"
                              >
                                {guardandoId === partido.id ? "Guardando..." : "Guardar"}
                              </button>
                            </>
                          ) : (
                            <span className="bg-blue-600/90 text-white px-3 py-1.5 rounded-md text-sm font-bold tracking-wider">
                              {partido.goles_local} - {partido.goles_visitante}
                            </span>
                          )}
                        </div>

                        {/* Equipo Visitante */}
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 mb-2 flex items-center justify-center">
                            {partido.visitante.escudo_url ? (
                              <img src={partido.visitante.escudo_url} alt={partido.visitante.nombre} className="w-9 h-9 object-contain" />
                            ) : (
                              <div className="w-9 h-9 bg-gray-800 rounded-full"></div>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">
                            {partido.visitante.nombre}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Columna Derecha: Tabla de Posiciones */}
          <div className="lg:col-span-2 bg-gray-900/90 p-5 rounded-xl border border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-gray-200">Tabla Oficial</h2>
            {loading ? (
              <p className="text-center text-gray-400 py-6">Cargando tabla...</p>
            ) : (
              <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700">
                <table className="w-full min-w-[600px] text-left whitespace-nowrap border-collapse text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800 text-xs uppercase tracking-wider">
                      <th className="pb-3 px-3 w-10 text-center">Pos</th>
                      <th className="pb-3 px-3 text-left min-w-[160px]">Equipo</th>
                      <th className="pb-3 px-2 text-center w-8">J</th>
                      <th className="pb-3 px-2 text-center w-8 text-emerald-400">G</th>
                      <th className="pb-3 px-2 text-center w-8 text-gray-400">E</th>
                      <th className="pb-3 px-2 text-center w-8 text-red-400">P</th>
                      <th className="pb-3 px-2 text-center w-8">GF</th>
                      <th className="pb-3 px-2 text-center w-8">GC</th>
                      <th className="pb-3 px-2 text-center w-8">DG</th>
                      <th className="pb-3 px-3 text-center w-10 font-bold text-white">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {equipos.map((equipo) => (
                      <tr key={equipo.id} className={`transition-colors ${obtenerColorFila(equipo.posicion_real_actual)}`}>
                        <td className="py-3 px-3 font-bold text-white text-center">{equipo.posicion_real_actual}°</td>
                        <td className="py-3 px-3 flex items-center gap-3">
                          {equipo.escudo_url ? (
                            <img src={equipo.escudo_url} alt={`Escudo de ${equipo.nombre}`} className="w-6 h-6 object-contain shrink-0" />
                          ) : (
                            <div className="w-6 h-6 bg-gray-800 rounded-full shrink-0"></div>
                          )}
                          <span className="font-semibold text-gray-200 truncate">{equipo.nombre}</span>
                        </td>
                        <td className="py-3 px-2 text-center text-gray-300">{equipo.partidos_jugados}</td>
                        <td className="py-3 px-2 text-center text-emerald-400 font-medium">{equipo.partidos_ganados}</td>
                        <td className="py-3 px-2 text-center text-gray-400 font-medium">{equipo.partidos_empatados}</td>
                        <td className="py-3 px-2 text-center text-red-400 font-medium">{equipo.partidos_perdidos}</td>
                        <td className="py-3 px-2 text-center text-gray-400">{equipo.goles_favor}</td>
                        <td className="py-3 px-2 text-center text-gray-400">{equipo.goles_contra}</td>
                        <td className="py-3 px-2 text-center text-gray-400">{equipo.diferencia_goles}</td>
                        <td className="py-3 px-3 text-center font-bold text-white text-base">{equipo.puntos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}