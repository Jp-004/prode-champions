"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

type Equipo = { id: number; nombre: string; escudo_url: string | null; posicion_real_actual: number; partidos_jugados: number; partidos_ganados: number; partidos_empatados: number; partidos_perdidos: number; puntos: number; goles_favor: number; goles_contra: number; diferencia_goles: number; };
type Partido = { id: number; fecha_partido: string; estado: string; goles_local: number | null; goles_visitante: number | null; jornada?: number | null; local: { nombre: string; escudo_url: string | null }; visitante: { nombre: string; escudo_url: string | null }; };
type Notificacion = { mensaje: string; tipo: "exito" | "error"; };
type PronosticoEspia = { nombre: string; local: number; visitante: number };

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

  const [modalPronosticos, setModalPronosticos] = useState(false);
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [pronosticosUsuarios, setPronosticosUsuarios] = useState<PronosticoEspia[]>([]);
  const [cargandoPronosticos, setCargandoPronosticos] = useState(false);

  const FECHA_LIMITE = new Date("2026-09-15T16:00:00Z");
  const bloqueoActivo = new Date() > FECHA_LIMITE;

  const mostrarNotificacion = (mensaje: string, tipo: "exito" | "error" = "exito") => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  useEffect(() => {
    const fetchDatos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);

      const { data: dataEquipos } = await supabase.from("equipos").select("*").order("posicion_real_actual", { ascending: true });
      if (dataEquipos) setEquipos(dataEquipos);

      const { data: dataPartidos } = await supabase.from("partidos").select(`
          id, fecha_partido, estado, goles_local, goles_visitante, jornada,
          local:equipos!equipo_local_id(nombre, escudo_url),
          visitante:equipos!equipo_visitante_id(nombre, escudo_url)
        `).not("equipo_local_id", "is", null).order("fecha_partido", { ascending: true });
      if (dataPartidos) setPartidos(dataPartidos as unknown as Partido[]);

      if (session) {
        const { data: misPredicciones } = await supabase.from("predicciones").select("*").eq("usuario_id", session.user.id);
        if (misPredicciones) {
          const prediccionesPrevias: Record<number, { local: number; visitante: number }> = {};
          misPredicciones.forEach((p) => {
            prediccionesPrevias[p.partido_id] = { local: p.prediccion_local, visitante: p.prediccion_visitante };
          });
          setInputs(prediccionesPrevias);
        }

        const { data: miPerfil } = await supabase.from("perfiles").select("campeon_id, subcampeon_id").eq("id", session.user.id).single();
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
    
    const partido = partidos.find(p => p.id === partidoId);
    if (partido && new Date(partido.fecha_partido).getTime() <= new Date().getTime()) {
      return mostrarNotificacion("El partido ya comenzó, no se permiten cambios.", "error");
    }

    const prediccion = inputs[partidoId] ?? { local: 0, visitante: 0 };
    setGuardandoId(partidoId);

    const { error } = await supabase.from("predicciones").upsert({
        usuario_id: user.id, partido_id: partidoId, prediccion_local: prediccion.local, prediccion_visitante: prediccion.visitante,
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
    const { error } = await supabase.from("perfiles").update({ campeon_id: parseInt(campeonId), subcampeon_id: parseInt(subcampeonId) }).eq("id", user.id);
    setGuardandoCandidatos(false);

    if (error) mostrarNotificacion("Error al guardar candidatos.", "error");
    else mostrarNotificacion("¡Candidatos guardados exitosamente!", "exito");
  };

  const abrirPronosticos = async (partido: Partido) => {
    setPartidoActivo(partido);
    setModalPronosticos(true);
    setCargandoPronosticos(true);

    const { data: predicciones } = await supabase
      .from("predicciones")
      .select("usuario_id, prediccion_local, prediccion_visitante")
      .eq("partido_id", partido.id);

    if (predicciones && predicciones.length > 0) {
      const userIds = predicciones.map(p => p.usuario_id);
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre")
        .in("id", userIds);

      const formateada = predicciones.map(p => {
        const perfil = perfiles?.find(pf => pf.id === p.usuario_id);
        return {
          nombre: perfil?.nombre || "Jugador Desconocido",
          local: p.prediccion_local,
          visitante: p.prediccion_visitante
        };
      });
      setPronosticosUsuarios(formateada);
    } else {
      setPronosticosUsuarios([]);
    }
    setCargandoPronosticos(false);
  };

  const formatearFecha = (fechaIso: string) => {
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Date(fechaIso).toLocaleDateString('es-ES', opciones).replace(',', ' -');
  };

  const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const partidosFiltrados = partidos.filter((p, index) => {
    if (p.jornada) return p.jornada === jornadaSeleccionada;
    return Math.floor(index / 18) + 1 === jornadaSeleccionada;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      {/* NOTIFICACIONES CON SVG */}
      {notificacion && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`px-5 py-3 rounded-lg shadow-xl font-medium border flex items-center gap-2 ${notificacion.tipo === "exito" ? "bg-emerald-950/90 border-emerald-500 text-emerald-200" : "bg-red-950/90 border-red-500 text-red-200"}`}>
            {notificacion.tipo === "exito" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
            )}
            {notificacion.mensaje}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            {/* ICONO DE CALENDARIO DEPORTIVO */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 md:w-10 md:h-10 text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Mis Pronósticos
            </h1>
          </div>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition">Volver</Link>
        </div>

        <div className="bg-gray-900/90 p-5 md:p-6 rounded-xl border border-gray-800 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
              {/* ICONO DE TROFEO SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-yellow-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.29 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
              </svg>
              Pronóstico a Largo Plazo
            </h2>
            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${bloqueoActivo ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800'}`}>
              {bloqueoActivo ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                  </svg>
                  Selecciones bloqueadas
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                  </svg>
                  Cierra el 15 de Septiembre
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Campeón</label>
              <select value={campeonId} onChange={(e) => setCampeonId(e.target.value)} disabled={bloqueoActivo || loading} className="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-3 disabled:opacity-60">
                <option value="">Selecciona el Campeón</option>
                {equiposOrdenados.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Subcampeón</label>
              <select value={subcampeonId} onChange={(e) => setSubcampeonId(e.target.value)} disabled={bloqueoActivo || loading} className="bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-gray-400 focus:border-gray-400 block w-full p-3 disabled:opacity-60">
                <option value="">Selecciona el Subcampeón</option>
                {equiposOrdenados.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
              </select>
            </div>
            <button onClick={guardarCandidatos} disabled={bloqueoActivo || guardandoCandidatos || loading} className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed border border-yellow-500 text-white font-bold p-3 rounded-lg transition shadow-sm h-[46px]">
              {guardandoCandidatos ? "Guardando..." : "Guardar Elección"}
            </button>
          </div>
        </div>

        <div className="bg-gray-900/90 p-5 rounded-xl border border-gray-800 shadow-sm w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-200">Partidos</h2>
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-full font-bold border border-blue-500/30">Fecha {jornadaSeleccionada}</span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-thin scrollbar-thumb-gray-700">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button key={num} type="button" onClick={() => setJornadaSeleccionada(num)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${jornadaSeleccionada === num ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"}`}>F{num}</button>
            ))}
          </div>
          
          {loading ? (
            <p className="text-center text-gray-400 py-6">Cargando partidos...</p>
          ) : partidosFiltrados.length === 0 ? (
            <div className="text-gray-400 text-center py-10 border border-dashed border-gray-700 rounded-lg">No hay partidos para esta fecha.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {partidosFiltrados.map((partido) => {
                const golesLoc = inputs[partido.id]?.local ?? 0;
                const golesVis = inputs[partido.id]?.visitante ?? 0;
                const yaEmpezo = new Date(partido.fecha_partido).getTime() <= new Date().getTime() || partido.estado !== 'pendiente';

                let cartelStatus = null;
                if (partido.estado === 'finalizado') {
                  cartelStatus = (
                    <span className="absolute top-3 right-3 bg-red-500/10 text-red-400 text-[9px] md:text-[10px] font-bold uppercase px-2 py-1 rounded border border-red-500/20 z-10 shadow-sm pointer-events-none">
                      Finalizado
                    </span>
                  );
                } else if (partido.estado === 'en_juego' || (partido.estado === 'pendiente' && yaEmpezo)) {
                  cartelStatus = (
                    <span className="absolute top-3 right-3 flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 text-[9px] md:text-[10px] font-bold uppercase px-2 py-1 rounded border border-yellow-500/20 z-10 shadow-sm pointer-events-none">
                      {/* EFECTO DE PULSO PARA EL PARTIDO EN JUEGO */}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </span>
                      En juego...
                    </span>
                  );
                }

                return (
                  <div key={partido.id} className="relative bg-gray-950/70 p-4 pb-3 rounded-lg border border-gray-800/80 flex flex-col h-full">
                    {cartelStatus}

                    <div className="text-center text-[11px] md:text-xs text-gray-400 mb-4 font-semibold uppercase tracking-wider pr-16">{formatearFecha(partido.fecha_partido)}</div>
                    
                    <div className="grid grid-cols-3 items-center gap-2 flex-grow">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 mb-2 flex items-center justify-center">
                          {partido.local.escudo_url ? <img src={partido.local.escudo_url} alt={partido.local.nombre} className="w-9 h-9 object-contain" /> : <div className="w-9 h-9 bg-gray-800 rounded-full"></div>}
                        </div>
                        <span className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">{partido.local.nombre}</span>
                      </div>

                      <div className="flex flex-col items-center justify-center w-full">
                        {!yaEmpezo ? (
                          <div className="flex items-center justify-center gap-2 bg-gray-900/80 p-2 rounded-lg border border-gray-800 w-full min-w-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              <button type="button" onClick={() => ajustarGoles(partido.id, "local", 1)} className="w-6 h-6 md:w-7 md:h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">+</button>
                              <span className="w-6 md:w-7 text-center font-bold text-lg text-white">{golesLoc}</span>
                              <button type="button" onClick={() => ajustarGoles(partido.id, "local", -1)} className="w-6 h-6 md:w-7 md:h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">-</button>
                            </div>
                            <span className="text-gray-600 font-black text-lg">-</span>
                            <div className="flex flex-col items-center gap-1">
                              <button type="button" onClick={() => ajustarGoles(partido.id, "visitante", 1)} className="w-6 h-6 md:w-7 md:h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">+</button>
                              <span className="w-6 md:w-7 text-center font-bold text-lg text-white">{golesVis}</span>
                              <button type="button" onClick={() => ajustarGoles(partido.id, "visitante", -1)} className="w-6 h-6 md:w-7 md:h-6 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">-</button>
                            </div>
                          </div>
                        ) : (
                          <span className="bg-blue-600/90 text-white px-3 py-2 rounded-lg text-lg font-black tracking-widest shadow-sm whitespace-nowrap inline-block text-center min-w-[70px]">
                            {partido.goles_local ?? '0'} - {partido.goles_visitante ?? '0'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 mb-2 flex items-center justify-center">
                          {partido.visitante.escudo_url ? <img src={partido.visitante.escudo_url} alt={partido.visitante.nombre} className="w-9 h-9 object-contain" /> : <div className="w-9 h-9 bg-gray-800 rounded-full"></div>}
                        </div>
                        <span className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">{partido.visitante.nombre}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800/50 mt-auto">
                      {!yaEmpezo ? (
                        <button 
                          onClick={() => guardarPrediccion(partido.id)} 
                          disabled={guardandoId === partido.id} 
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2.5 rounded-lg font-bold transition w-full shadow-sm"
                        >
                          {guardandoId === partido.id ? "Guardando..." : "Guardar Pronóstico"}
                        </button>
                      ) : (
                        <button 
                          onClick={() => abrirPronosticos(partido)}
                          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-xs uppercase tracking-widest font-bold transition border border-gray-700 flex justify-center items-center gap-2 shadow-sm group"
                        >
                          {/* ICONO DEL OJO SVG */}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                          Ver Pronósticos
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalPronosticos && partidoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="bg-gray-800/50 p-4 relative border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-gray-200">Pronósticos de los Jugadores</h3>
              <button onClick={() => setModalPronosticos(false)} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition">
                {/* ICONO DE CERRAR SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="bg-gray-950 p-4 border-b border-gray-800 shrink-0 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center w-20">
                {partidoActivo.local.escudo_url ? <img src={partidoActivo.local.escudo_url} className="w-8 h-8 object-contain mb-1" alt="" /> : <div className="w-8 h-8 bg-gray-800 rounded-full mb-1"></div>}
                <span className="text-[10px] uppercase font-bold text-gray-400 text-center">{partidoActivo.local.nombre}</span>
              </div>
              <span className="font-black text-xl text-white">{partidoActivo.goles_local ?? '0'} - {partidoActivo.goles_visitante ?? '0'}</span>
              <div className="flex flex-col items-center w-20">
                {partidoActivo.visitante.escudo_url ? <img src={partidoActivo.visitante.escudo_url} className="w-8 h-8 object-contain mb-1" alt="" /> : <div className="w-8 h-8 bg-gray-800 rounded-full mb-1"></div>}
                <span className="text-[10px] uppercase font-bold text-gray-400 text-center">{partidoActivo.visitante.nombre}</span>
              </div>
            </div>

            <div className="p-2 overflow-y-auto">
              {cargandoPronosticos ? (
                <p className="text-center text-gray-400 py-6 text-sm">Cargando pronósticos...</p>
              ) : pronosticosUsuarios.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm italic">Nadie pronosticó este partido.</p>
              ) : (
                <div className="space-y-1">
                  {pronosticosUsuarios.map((p, i) => {
                    const golesRealesLocal = partidoActivo.goles_local;
                    const golesRealesVisitante = partidoActivo.goles_visitante;
                    const partidoIniciado = golesRealesLocal !== null && golesRealesVisitante !== null;

                    const aciertoExacto = partidoIniciado && p.local === golesRealesLocal && p.visitante === golesRealesVisitante;
                    
                    let aciertoParcial = false;
                    if (partidoIniciado && !aciertoExacto) {
                      const tendenciaReal = golesRealesLocal === golesRealesVisitante ? 0 : (golesRealesLocal > golesRealesVisitante ? 1 : -1);
                      const tendenciaPred = p.local === p.visitante ? 0 : (p.local > p.visitante ? 1 : -1);
                      aciertoParcial = tendenciaReal === tendenciaPred;
                    }

                    let bgClass = 'bg-gray-900 border-gray-800';
                    let textClass = 'text-white';
                    
                    if (aciertoExacto) {
                      bgClass = 'bg-emerald-500/10 border-emerald-500/30';
                      textClass = 'text-emerald-400';
                    } else if (aciertoParcial) {
                      bgClass = 'bg-yellow-500/10 border-yellow-500/30';
                      textClass = 'text-yellow-400';
                    }

                    return (
                      <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${bgClass}`}>
                        <span className="font-semibold text-sm text-gray-200">{p.nombre}</span>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-base w-5 text-center ${textClass}`}>{p.local}</span>
                          <span className="text-gray-600 text-xs">-</span>
                          <span className={`font-bold text-base w-5 text-center ${textClass}`}>{p.visitante}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}