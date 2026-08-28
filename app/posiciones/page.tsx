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

  // Diccionario: llave = posición (1-36), valor = equipo_id
  const [inputs, setInputs] = useState<Record<number, number>>({});

  // Bloqueo de fecha límite (15 de Septiembre)
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

      // Traer equipos ordenados alfabéticamente para el selector
      const { data: dataEquipos } = await supabase.from("equipos").select("id, nombre, escudo_url").order("nombre", { ascending: true });
      if (dataEquipos) setEquipos(dataEquipos);

      if (session) {
        // Traer predicciones previas si el usuario ya había guardado algo
        const { data: misPosiciones } = await supabase
          .from("predicciones_posiciones")
          .select("*")
          .eq("usuario_id", session.user.id);

        if (misPosiciones) {
          const posicionesPrevias: Record<number, number> = {};
          misPosiciones.forEach((p) => {
            posicionesPrevias[p.posicion_predicha] = p.equipo_id;
          });
          setInputs(posicionesPrevias);
        }
      }
      setLoading(false);
    };

    fetchDatos();
  }, []);

  const handleChange = (posicion: number, equipoId: string) => {
    setInputs((prev) => {
      const nuevos = { ...prev };
      if (!equipoId) {
        delete nuevos[posicion];
      } else {
        nuevos[posicion] = parseInt(equipoId);
      }
      return nuevos;
    });
  };

  const guardarTabla = async () => {
    if (!user) return mostrarNotificacion("Debes iniciar sesión", "error");
    if (bloqueoActivo) return mostrarNotificacion("La fecha límite ha pasado", "error");

    setGuardando(true);
    
    // Armamos el arreglo de objetos para guardar en Supabase de forma masiva
    const prediccionesAInsertar = Object.entries(inputs).map(([pos, equipoId]) => ({
      usuario_id: user.id,
      equipo_id: equipoId,
      posicion_predicha: parseInt(pos)
    }));

    if (prediccionesAInsertar.length === 0) {
      setGuardando(false);
      return mostrarNotificacion("No has seleccionado ningún equipo.", "error");
    }

    // Usamos upsert para actualizar si ya existía la posición o el equipo
    const { error } = await supabase
      .from("predicciones_posiciones")
      .upsert(prediccionesAInsertar, { onConflict: "usuario_id, posicion_predicha" });

    setGuardando(false);

    if (error) {
      console.error(error);
      mostrarNotificacion("Error al guardar la tabla", "error");
    } else {
      mostrarNotificacion("¡Tabla guardada exitosamente!", "exito");
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

  // Extraemos todos los equipos ya seleccionados en cualquier posición
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
            Volver al Panel
          </Link>
        </div>

        <div className="bg-gray-900/90 p-6 rounded-xl border border-gray-800 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-800 pb-6">
            <div>
              <h2 className="text-xl font-bold">Fase de Liga (36 Equipos)</h2>
              <p className="text-sm text-gray-400 mt-1">
                Acierto exacto: <strong className="text-emerald-400">3 pts</strong> | Acierto de Zona: <strong className="text-yellow-400">1 pt</strong>
              </p>
            </div>
            
            <button 
              onClick={guardarTabla}
              disabled={bloqueoActivo || guardando || loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold transition shadow-sm w-full md:w-auto"
            >
              {guardando ? "Guardando..." : "Guardar mi Tabla"}
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-10">Cargando equipos...</p>
          ) : (
            <div className="space-y-1">
              {/* Iteramos del 1 al 36 */}
              {Array.from({ length: 36 }, (_, i) => i + 1).map((pos) => (
                <div key={pos}>
                  {obtenerEtiquetaZona(pos)}
                  <div className={`flex items-center gap-4 p-2 rounded border-l-4 ${obtenerColorZona(pos)} bg-gray-950/50`}>
                    <div className="w-8 text-center font-black text-gray-400">{pos}°</div>
                    
                    {/* Renderizamos el escudo si hay un equipo seleccionado */}
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
                      disabled={bloqueoActivo}
                      className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:border-blue-500 outline-none transition disabled:opacity-60"
                    >
                      <option value="">-- Seleccionar Equipo --</option>
                      {equipos.map((equipo) => {
                        // Deshabilitamos el equipo en la lista SI ya fue elegido en OTRA posición
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