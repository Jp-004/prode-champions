import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Mejoramos el normalizador para quitar puntos, tildes, comas y dejar solo texto limpio
const normalizar = (texto?: string) => {
  if (!texto) return "";
  return texto.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes (y la cedilla de Barça)
    .replace(/[^a-zA-Z0-9\s]/g, "") // Quita símbolos raros
    .toLowerCase()
    .trim();
};

// "Familias de Equipos"
const familiasEquipos = [
  ["estrella roja", "crvena zvezda", "crvena"],
  ["bayern munich", "bayern munchen", "bayern"],
  ["psg", "paris saintgermain", "paris sg", "paris saint germain"],
  ["sporting lisboa", "sporting cp", "sporting"],
  ["aston villa", "aston villa fc"],
  ["inter", "internazionale", "inter milan"],
  ["bologna", "bologna fc"],
  ["rb leipzig", "leipzig"],
  ["sturm graz", "sturm"],
  ["salzburgo", "salzburg", "red bull salzburg"],
  ["milan", "ac milan"],
  ["barcelona", "fc barcelona", "barca"], 
  ["shakhtar", "shakhtar donetsk", "fk shakhtar donetsk", "shaktar"], 
  ["manchester city", "manchester city fc", "man city", "city"], 
  ["manchester united", "manchester united fc", "man united", "man utd"]
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');

    if (secret !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const respuesta = await fetch("https://api.football-data.org/v4/competitions/CL/matches", {
      method: 'GET',
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! },
      cache: 'no-store'
    });
    const datosAPI = await respuesta.json();

    if (datosAPI.errorCode || datosAPI.error) {
      return NextResponse.json({ error: 'La API falló', detalles: datosAPI.message });
    }

    const { data: equiposDB } = await supabaseAdmin.from('equipos').select('id, nombre');
    if (!equiposDB) throw new Error("Error al cargar Supabase");

    // OPTIMIZACIÓN 1: Traemos todos los partidos de Supabase en 1 sola consulta
    const { data: partidosDB } = await supabaseAdmin
      .from('partidos')
      .select('id, equipo_local_id, equipo_visitante_id');
    const partidosExistentes = partidosDB || [];

// Le explicamos a TypeScript exactamente qué datos guardaremos
    type DatosPartido = {
      id?: number; // Opcional, porque los partidos nuevos no lo tienen
      equipo_local_id: number;
      equipo_visitante_id: number;
      estado: string;
      fecha_partido: string;
      goles_local: number | null;
      goles_visitante: number | null;
      fase: string;
      jornada: number;
    };

    const partidosAActualizar: DatosPartido[] = [];
    const partidosAInsertar: DatosPartido[] = [];
    const errores = new Set<string>();

    const partidosFaseLiga = datosAPI.matches.filter((m: { matchday: number }) => m.matchday >= 1 && m.matchday <= 8);

    const buscarEquipo = (equipoAPI: { shortName?: string; name?: string }) => {
      const nomCorto = normalizar(equipoAPI?.shortName);
      const nomLargo = normalizar(equipoAPI?.name);

      const encontrado = equiposDB.find(e => {
        const nomDB = normalizar(e.nombre);
        
        // 1. Coincidencia directa
        if (nomDB === nomCorto || nomDB === nomLargo) return true;
        if (nomCorto && nomDB.includes(nomCorto)) return true;
        if (nomLargo && nomDB.includes(nomLargo)) return true;
        if (nomCorto && nomCorto.includes(nomDB)) return true;
        if (nomLargo && nomLargo.includes(nomDB)) return true;
        
        // 2. Coincidencia por Familia
        for (const familia of familiasEquipos) {
          const dbEnFamilia = familia.some(miembro => nomDB.includes(miembro) || miembro.includes(nomDB));
          const apiEnFamilia = familia.some(miembro => 
            (nomCorto && (nomCorto.includes(miembro) || miembro.includes(nomCorto))) || 
            (nomLargo && (nomLargo.includes(miembro) || miembro.includes(nomLargo)))
          );
          
          if (dbEnFamilia && apiEnFamilia) return true;
        }

        return false;
      });

      if (!encontrado) errores.add(equipoAPI?.name || "Desconocido");
      return encontrado;
    };

    for (const partido of partidosFaseLiga) {
      const local = buscarEquipo(partido.homeTeam);
      const visitante = buscarEquipo(partido.awayTeam);

      if (local && visitante) {
        let estadoBD = 'pendiente';
        if (partido.status === 'IN_PLAY' || partido.status === 'PAUSED') estadoBD = 'en_juego';
        if (partido.status === 'FINISHED') estadoBD = 'finalizado';

        // Buscamos en memoria (0 milisegundos)
        const partidoExistente = partidosExistentes.find(
          p => p.equipo_local_id === local.id && p.equipo_visitante_id === visitante.id
        );

        const payload = {
          equipo_local_id: local.id,
          equipo_visitante_id: visitante.id,
          estado: estadoBD,
          fecha_partido: partido.utcDate,
          goles_local: partido.score?.fullTime?.home ?? null,
          goles_visitante: partido.score?.fullTime?.away ?? null,
          fase: 'fase_liga',
          jornada: partido.matchday
        };

        if (partidoExistente) {
          partidosAActualizar.push({ id: partidoExistente.id, ...payload });
        } else {
          partidosAInsertar.push(payload);
        }
      }
    }

    // OPTIMIZACIÓN 2: Escritura masiva en lote (1 o 2 llamadas en total)
    if (partidosAActualizar.length > 0) {
      const { error: errUpdate } = await supabaseAdmin
        .from('partidos')
        .upsert(partidosAActualizar);
      if (errUpdate) console.error("Error en bulk upsert:", errUpdate);
    }

    if (partidosAInsertar.length > 0) {
      const { error: errInsert } = await supabaseAdmin
        .from('partidos')
        .insert(partidosAInsertar);
      if (errInsert) console.error("Error en bulk insert:", errInsert);
    }

    return NextResponse.json({
      success: true,
      message: `Proceso terminado ultra-rápido. Nuevos: ${partidosAInsertar.length} | Actualizados: ${partidosAActualizar.length}`,
      equipos_sin_coincidencia: Array.from(errores)
    });

  } catch (error) {
    console.error("Fallo general:", error);
    return NextResponse.json({ error: 'Fallo general' }, { status: 500 });
  }
}