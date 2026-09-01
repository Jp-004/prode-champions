"use client";
import { useEffect, useState } from "react";
import SelectorEquipo from "../../components/SelectorEquipo";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Gamepad2, Trophy, Lock, Hourglass, Eye, X } from "lucide-react";

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
    const prediccion = inputs[partidoId];
    if (!prediccion) return mostrarNotificacion("Ajusta los goles antes de guardar.", "error"); // Validación extra

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
    
    const { data } = await supabase
      .from("predicciones")
      .select("prediccion_local, prediccion_visitante, perfiles(nombre)")
      .eq("partido_id", partido.id);
      
    if (data) {
      type DBResponse = { prediccion_local: number, prediccion_visitante: number, perfiles: { nombre: string } | { nombre: string }[] | null };
      const formateada = (data as unknown as DBResponse[]).map(d => ({
        nombre: Array.isArray(d.perfiles) ? d.perfiles[0]?.nombre : d.perfiles?.nombre || "Desconocido",
        local: d.prediccion_local,
        visitante: d.prediccion_visitante
      }));
      setPronosticosUsuarios(formateada);
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
      {notificacion && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`px-5 py-3 rounded-lg shadow-xl font-medium border flex items-center gap-2 ${notificacion.tipo === "exito" ? "bg-emerald-950/90 border-emerald-500 text-emerald-200" : "bg-red-950/90 border-red-500 text-red-200"}`}>
            <span>{notificacion.tipo === "exito" ? "✓" : "⚠"}</span> {notificacion.mensaje}
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 mt-2 md:mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-6 h-6 md:w-7 md:h-7 text-blue-400" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 leading-tight">
              Mis Pronósticos
            </h1>
          </div>
        </div>
        
        <div className="bg-gray-900/90 p-5 md:p-6 rounded-xl border border-gray-800 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" strokeWidth={2.5} />
              Pronóstico a Largo Plazo
            </h2>
            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${bloqueoActivo ? 'bg-red-900/40 text-red-400 border border-red-800' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800'}`}>
              {bloqueoActivo ? <Lock className="w-4 h-4" /> : <Hourglass className="w-4 h-4" />}
              {bloqueoActivo ? 'Selecciones bloqueadas' : 'Cierra el 15 de Septiembre'}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Campeón</label>
              <SelectorEquipo
                equipos={equiposOrdenados}
                equipoSeleccionadoId={campeonId ? parseInt(campeonId) : null}
                onSeleccionar={(id) => setCampeonId(id ? id.toString() : "")}
                placeholder="Selecciona el Campeón"
                disabled={bloqueoActivo || loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Subcampeón</label>
              <SelectorEquipo
                equipos={equiposOrdenados}
                equipoSeleccionadoId={subcampeonId ? parseInt(subcampeonId) : null}
                onSeleccionar={(id) => setSubcampeonId(id ? id.toString() : "")}
                placeholder="Selecciona el Subcampeón"
                disabled={bloqueoActivo || loading}
              />
            </div>
          <button onClick={guardarCandidatos} disabled={bloqueoActivo || guardandoCandidatos || loading} className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed border border-yellow-500 text-white font-bold p-3 rounded-lg transition shadow-sm h-[46px]">
            {guardandoCandidatos ? "Guardando..." : "Guardar Elección"}
          </button>
        </div>
      </div>

        <div className="bg-gray-900/90 p-5 rounded-xl border border-gray-800 shadow-sm">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partidosFiltrados.map((partido) => {
                // Si no hay input cargado, será undefined
                const partidoPred = inputs[partido.id];
                const displayLoc = partidoPred !== undefined ? partidoPred.local : "-";
                const displayVis = partidoPred !== undefined ? partidoPred.visitante : "-";

                return (
                  <div key={partido.id} className="bg-gray-950/70 p-4 rounded-xl border border-gray-800/80 shadow-sm flex flex-col">
                    <div className="text-center text-xs text-gray-400 mb-4 font-semibold uppercase tracking-wider">{formatearFecha(partido.fecha_partido)}</div>
                    
                    <div className="grid grid-cols-3 items-center gap-2 mb-2">
                      <div className="flex flex-col items-center justify-center text-center px-1">
                        <div className="w-10 h-10 mb-2 flex items-center justify-center">
                          {partido.local.escudo_url ? <img src={partido.local.escudo_url} alt={partido.local.nombre} className="w-9 h-9 object-contain drop-shadow-md" /> : <div className="w-9 h-9 bg-gray-800 rounded-full"></div>}
                        </div>
                        <span className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">{partido.local.nombre}</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center w-full">
                        {partido.estado === 'pendiente' ? (
                          <div className="flex items-center justify-center gap-2 md:gap-3 bg-gray-900/80 p-2 rounded-xl border border-gray-800/80 max-w-[120px] mx-auto shadow-inner">
                            <div className="flex flex-col items-center gap-1.5">
                              <button type="button" onClick={() => ajustarGoles(partido.id, "local", 1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-blue-600 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">+</button>
                              <span className="w-7 text-center font-bold text-lg text-white">{displayLoc}</span>
                              <button type="button" onClick={() => ajustarGoles(partido.id, "local", -1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-red-600 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">-</button>
                            </div>
                            <span className="text-gray-600 font-black text-lg">-</span>
                            <div className="flex flex-col items-center gap-1.5">
                              <button type="button" onClick={() => ajustarGoles(partido.id, "visitante", 1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-blue-600 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">+</button>
                              <span className="w-7 text-center font-bold text-lg text-white">{displayVis}</span>
                              <button type="button" onClick={() => ajustarGoles(partido.id, "visitante", -1)} className="w-7 h-6 rounded bg-gray-800 hover:bg-red-600 text-gray-300 font-bold text-sm flex items-center justify-center select-none transition">-</button>
                            </div>
                          </div>
                        ) : (
                          <span className="bg-blue-600/90 text-white px-3 py-1.5 rounded-md text-sm font-bold tracking-wider shadow-md">
                            {partido.goles_local} - {partido.goles_visitante}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center justify-center text-center px-1">
                        <div className="w-10 h-10 mb-2 flex items-center justify-center">
                          {partido.visitante.escudo_url ? <img src={partido.visitante.escudo_url} alt={partido.visitante.nombre} className="w-9 h-9 object-contain drop-shadow-md" /> : <div className="w-9 h-9 bg-gray-800 rounded-full"></div>}
                        </div>
                        <span className="text-xs font-semibold text-gray-200 leading-tight line-clamp-2">{partido.visitante.nombre}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-4 border-t border-gray-800/60 w-full mt-auto">
                      {partido.estado === 'pendiente' ? (
                        <button 
                          onClick={() => guardarPrediccion(partido.id)} 
                          disabled={guardandoId === partido.id || partidoPred === undefined} 
                          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:opacity-80 disabled:cursor-not-allowed text-white text-sm px-4 py-2.5 rounded-lg font-bold transition w-full shadow-md"
                        >
                          {guardandoId === partido.id ? "Guardando..." : (partidoPred === undefined ? "Ingresa resultado" : "Guardar Pronóstico")}
                        </button>
                      ) : (
                        <button 
                          onClick={() => abrirPronosticos(partido)} 
                          className="text-xs uppercase tracking-wider bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg w-full font-bold transition border border-gray-700 shadow-sm flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> Ver Pronósticos
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
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-gray-950 p-4 border-b border-gray-800 shrink-0 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center w-20">
                {partidoActivo.local.escudo_url ? <img src={partidoActivo.local.escudo_url} className="w-8 h-8 object-contain mb-1" alt="" /> : <div className="w-8 h-8 bg-gray-800 rounded-full mb-1"></div>}
                <span className="text-[10px] uppercase font-bold text-gray-400 text-center">{partidoActivo.local.nombre}</span>
              </div>
              <span className="font-black text-xl text-white">{partidoActivo.goles_local} - {partidoActivo.goles_visitante}</span>
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
                    const acertoLocal = p.local === partidoActivo.goles_local;
                    const acertoVisitante = p.visitante === partidoActivo.goles_visitante;
                    const aciertoExacto = acertoLocal && acertoVisitante;
                    
                    return (
                      <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${aciertoExacto ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-900 border-gray-800'}`}>
                        <span className="font-semibold text-sm text-gray-200">{p.nombre}</span>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-base w-5 text-center ${acertoLocal ? 'text-emerald-400' : 'text-white'}`}>{p.local}</span>
                          <span className="text-gray-600 text-xs">-</span>
                          <span className={`font-bold text-base w-5 text-center ${acertoVisitante ? 'text-emerald-400' : 'text-white'}`}>{p.visitante}</span>
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