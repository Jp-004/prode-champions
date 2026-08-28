"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

type Equipo = { id: number; nombre: string; escudo_url: string | null };
type Notificacion = { mensaje: string; tipo: "exito" | "error" };

export default function PosicionesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [notificacion, setNotificacion] = useState<Notificacion | null>(null);
  const [inputs, setInputs] = useState<Record<number, number>>({});
  
  // NUEVO ESTADO: Controla si la tabla ya fue guardada definitivamente
  const [tablaBloqueada, setTablaBloqueada] = useState(false);

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

      const { data: dataEquipos } = await supabase.from("equipos").select("id, nombre, escudo_url").order("nombre", { ascending: true });
      if (dataEquipos) setEquipos(dataEquipos);

      if (session) {
        const { data: misPosiciones } = await supabase
          .from("predicciones_posiciones")
          .select("*")
          .eq("usuario_id", session.user.id);

        if (misPosiciones && misPosiciones.length > 0) {
          const posicionesPrevias: Record<number, number> = {};
          misPosiciones.forEach((p) => {
            posicionesPrevias[p.posicion_predicha] = p.equipo_id;
          });
          setInputs(posicionesPrevias);
          
          // LA MAGIA: Si ya tenía registros, bloqueamos la tabla para siempre
          setTablaBloqueada(true);
        }
      }
      setLoading(false);
    };

    fetchDatos();
  }, []);

  const handleChange = (posicion: number, equipoId: string) => {
    setInputs((prev) => {
      const nuevos = { ...prev };
      if (!equipoId) delete nuevos[posicion];
      else nuevos[posicion] = parseInt(equipoId);
      return nuevos;
    });
  };

const guardarTabla = async () => {
    if (!user) return mostrarNotificacion("Debes iniciar sesión", "error");
    if (bloqueoActivo || tablaBloqueada) return; // Doble seguridad

    // Validar que haya llenado los 36 lugares antes de guardar definitivamente
    const cantidadSeleccionada = Object.keys(inputs).length;
    if (cantidadSeleccionada < 36) {
      return mostrarNotificacion(`Te faltan ${36 - cantidadSeleccionada} equipos por colocar.`, "error");
    }

    // --- NUEVO: CARTEL DE ADVERTENCIA PREVIO ---
    const confirmar = window.confirm(
      "🚨 ATENCIÓN 🚨\n\nUna vez que guardes tu tabla, NO podrás volver a modificarla en toda la temporada.\n\n¿Estás 100% seguro de que esta es tu predicción final?"
    );
    if (!confirmar) return; // Si el usuario pone "Cancelar", frenamos la función acá.
    // ------------------------------------------

    setGuardando(true);
    const prediccionesAInsertar = Object.entries(inputs).map(([pos, equipoId]) => ({
      usuario_id: user.id,
      equipo_id: equipoId,
      posicion_predicha: parseInt(pos)
    }));

    const { error } = await supabase.from("predicciones_posiciones").insert(prediccionesAInsertar);

    setGuardando(false);

    if (error) {
      mostrarNotificacion("Error al guardar la tabla", "error");
    } else {
      mostrarNotificacion("¡Tabla guardada y bloqueada exitosamente!", "exito");
      setTablaBloqueada(true); // La bloqueamos en pantalla inmediatamente
    }
  };

  const obtenerColorZona = (posicion: number) => {
    if (posicion >= 1 && posicion <= 8) return "bg-emerald-950/40 border-emerald-500/50";
    if (posicion >= 9 && posicion <= 24) return "bg-orange-950/40 border-orange-500/50";
    return "bg-red-950/40 border-red-500/50";
  };

  const obtenerEtiquetaZona = (posicion: number) => {
    if (posicion === 1) return <span className="text-emerald-400 text-xs font-black uppercase tracking-widest block mb-1">Octavos de Final</span>;
    if (posicion === 9) return <span className="text-orange-400 text-xs font-black uppercase tracking-widest block mb-1 mt-6">Play-Offs</span>;
    if (posicion === 25) return <span className="text-red-400 text-xs font-black uppercase tracking-widest block mb-1 mt-6">Eliminados</span>;
    return null;
  };

  const equiposSeleccionados = Object.values(inputs);

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">🎯 Arma tu Tabla Final</h1>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition">
            Volver
          </Link>
        </div>

        <div className="bg-gray-900/90 p-6 rounded-xl border border-gray-800 shadow-sm">
          {/* Mensaje de Bloqueo */}
          {tablaBloqueada && (
            <div className="mb-6 bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-bold text-blue-400">Tabla Guardada Definitivamente</h3>
                <p className="text-sm text-gray-300">Ya has enviado tu predicción. Ahora los demás jugadores pueden verla en tu perfil y los cambios son irreversibles.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-800 pb-6">
            <div>
              <h2 className="text-xl font-bold">Fase de Liga (36 Equipos)</h2>
              <p className="text-sm text-gray-400 mt-1">Acierto exacto: <strong className="text-emerald-400">3 pts</strong> | Acierto de Zona: <strong className="text-yellow-400">1 pt</strong></p>
            </div>
            
            <button 
              onClick={guardarTabla}
              disabled={bloqueoActivo || guardando || loading || tablaBloqueada}
              className={`px-6 py-3 rounded-lg font-bold transition shadow-sm w-full md:w-auto text-white ${tablaBloqueada ? 'bg-gray-700 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {tablaBloqueada ? "✓ Tabla Confirmada" : guardando ? "Guardando..." : "Guardar mi Tabla (Definitivo)"}
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-10">Cargando equipos...</p>
          ) : (
            <div className="space-y-1">
              {Array.from({ length: 36 }, (_, i) => i + 1).map((pos) => (
                <div key={pos}>
                  {obtenerEtiquetaZona(pos)}
                  <div className={`flex items-center gap-4 p-2 rounded border-l-4 ${obtenerColorZona(pos)} bg-gray-950/50`}>
                    <div className="w-8 text-center font-black text-gray-400">{pos}°</div>
                    
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {inputs[pos] && equipos.find(e => e.id === inputs[pos])?.escudo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={equipos.find(e => e.id === inputs[pos])!.escudo_url!} alt="Escudo" className="w-7 h-7 object-contain" />
                      ) : (
                        <div className="w-7 h-7 bg-gray-800 rounded-full border border-gray-700"></div>
                      )}
                    </div>

                    <select
                      value={inputs[pos] || ""}
                      onChange={(e) => handleChange(pos, e.target.value)}
                      disabled={bloqueoActivo || tablaBloqueada}
                      className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:border-blue-500 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Seleccionar Equipo --</option>
                      {equipos.map((equipo) => {
                        const estaSeleccionadoEnOtraPosicion = equiposSeleccionados.includes(equipo.id) && inputs[pos] !== equipo.id;
                        return (
                          <option key={equipo.id} value={equipo.id} disabled={estaSeleccionadoEnOtraPosicion}>
                            {equipo.nombre}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}