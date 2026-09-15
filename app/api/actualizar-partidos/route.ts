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
  ["manchester united", "manchester united fc", "man united", "man utd"],
  ["aek atenas", "pae aek", "aek athens", "aek"]
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');

    if (secret !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const timestamp = new Date().getTime();
    const apiUrl = `https://api.football-data.org/v4/competitions/CL/matches?_nocache=${timestamp}`;

    const respuesta = await fetch(apiUrl, {
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
      .select('id, equipo_local_id, equipo_visitante_id, estado');
    const partidosExistentes = partidosDB || [];

// Le explicamos a TypeScript exactamente qué datos guardaremos
    type DatosPartido = {
      id?: number; 
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

    // Traemos todos los partidos de la API, sin filtrar por número
    const partidosFaseLiga = datosAPI.matches;

    const buscarEquipo = (equipoAPI: { shortName?: string; name?: string }) => {
      const nomCorto = normalizar(equipoAPI?.shortName);
      const nomLargo = normalizar(equipoAPI?.name);

      const encontrado = equiposDB.find(e => {
        const nomDB = normalizar(e.nombre);
        
        // Coincidencia directa
        if (nomDB === nomCorto || nomDB === nomLargo) return true;
        if (nomCorto && nomDB.includes(nomCorto)) return true;
        if (nomLargo && nomDB.includes(nomLargo)) return true;
        if (nomCorto && nomCorto.includes(nomDB)) return true;
        if (nomLargo && nomLargo.includes(nomDB)) return true;
        
        // Coincidencia por Familia
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

        const partidoExistente = partidosExistentes.find(
          p => p.equipo_local_id === local.id && p.equipo_visitante_id === visitante.id
        );

        let faseBD = 'fase_liga';
        if (partido.stage === 'PLAYOFFS') faseBD = 'dieciseisavos';
        if (partido.stage === 'LAST_16') faseBD = 'octavos';
        if (partido.stage === 'QUARTER_FINALS') faseBD = 'cuartos';
        if (partido.stage === 'SEMI_FINALS') faseBD = 'semis';
        if (partido.stage === 'FINAL') faseBD = 'final';

        const payload: DatosPartido = {
          equipo_local_id: local.id,
          equipo_visitante_id: visitante.id,
          estado: estadoBD,
          fecha_partido: partido.utcDate,
          goles_local: partido.score?.fullTime?.home ?? null,
          goles_visitante: partido.score?.fullTime?.away ?? null,
          fase: faseBD, 
          jornada: partido.matchday || 0 
        };

        if (partidoExistente) {
          if (partidoExistente.estado !== 'finalizado') {
            partidosAActualizar.push({ id: partidoExistente.id, ...payload });
          }
        } else {
          partidosAInsertar.push(payload);
        }
      }
    }

    // INTENTAMOS ACTUALIZAR
    if (partidosAActualizar.length > 0) {
      const { error: errUpdate } = await supabaseAdmin
        .from('partidos')
        .upsert(partidosAActualizar, { onConflict: 'id' });
      
      // SI HAY UN ERROR, LO MOSTRAMOS EN PANTALLA
      if (errUpdate) {
        return NextResponse.json({ 
          error: "🛑 SUPABASE RECHAZÓ LA ACTUALIZACIÓN", 
          motivo: errUpdate.message,
          detalles: errUpdate
        });
      }
    }

    // INTENTAMOS INSERTAR
    if (partidosAInsertar.length > 0) {
      const { error: errInsert } = await supabaseAdmin.from('partidos').insert(partidosAInsertar);
      if (errInsert) {
        return NextResponse.json({ 
          error: "🛑 ERROR AL INSERTAR PARTIDOS NUEVOS", 
          motivo: errInsert.message 
        });
      }
    }

    // LA BASE DE DATOS LO ACEPTÓ PERFECTAMENTE
    return NextResponse.json({
      success: true,
      message: `¡Datos guardados con éxito! Actualizados: ${partidosAActualizar.length} | Nuevos: ${partidosAInsertar.length}`,
      equipos_sin_coincidencia: Array.from(errores)
    });

  } catch (error) {
    console.error("Fallo general:", error);
    return NextResponse.json({ 
      error: 'Fallo general del servidor', 
      detalles: error instanceof Error ? error.message : 'Error desconocido' 
    });
  }
}
