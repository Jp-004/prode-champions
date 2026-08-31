import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

// 1. Función mágica para quitar tildes, mayúsculas y espacios extra
const normalizar = (texto?: string) => {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

// 2. Diccionario de traducciones para los equipos complicados
// A la izquierda pones TU nombre (normalizado) y a la derecha cómo lo llama la API
const traductorEquipos: Record<string, string[]> = {
  "estrella roja": ["crvena zvezda", "crvena"],
  "bayern munich": ["bayern munchen", "bayern"],
  "psg": ["paris saint-germain", "paris sg"],
  "sporting lisboa": ["sporting cp", "sporting"],
  "aston villa": ["aston villa fc"],
  "inter": ["internazionale", "inter milan"],
  "bologna": ["bologna fc"],
  "rb leipzig": ["leipzig"],
  "sturm graz": ["sturm"],
  "salzburgo": ["salzburg", "red bull salzburg"],
  "milan": ["ac milan"],
  
  // --- LOS 5 NUEVOS REBELDES ---
  "shakhtar": ["shakhtar donetsk", "fk shakhtar donetsk"],
  "fc barcelona": ["fc barcelona"],
  "manchester city": ["manchester city fc"],
  "manchester united": ["manchester united fc"],
  "aek atenas": ["pae aek", "aek"] 
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');

    if (secret !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const respuesta = await fetch("https://api.football-data.org/v4/competitions/CL/matches", {
      method: 'GET',
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! }
    });
    const datosAPI = await respuesta.json();

    if (datosAPI.errorCode || datosAPI.error) {
      return NextResponse.json({ error: 'La API falló', detalles: datosAPI.message });
    }

    const { data: equiposDB } = await supabaseAdmin.from('equipos').select('id, nombre');
    if (!equiposDB) throw new Error("Error al cargar Supabase");

    let creados = 0;
    let actualizados = 0;
    const errores = new Set<string>();

    // Solo procesamos los partidos de la Fase de Liga (Jornadas 1 a 8)
    const partidosFaseLiga = datosAPI.matches.filter((m: { matchday: number }) => m.matchday >= 1 && m.matchday <= 8);

    for (const partido of partidosFaseLiga) {
      const nomLocAPI = normalizar(partido.homeTeam?.shortName || partido.homeTeam?.name);
      const nomVisAPI = normalizar(partido.awayTeam?.shortName || partido.awayTeam?.name);

      // Lógica de búsqueda ultra-precisa
      const buscarEquipo = (nombreAPI: string, nombreOriginalAPI: string) => {
        const encontrado = equiposDB.find(e => {
          const nomDB = normalizar(e.nombre);
          
          // A) Coincidencia exacta o que una palabra contenga a la otra
          if (nomDB.includes(nombreAPI) || nombreAPI.includes(nomDB)) return true;
          
          // B) Búsqueda en nuestro diccionario de traducciones
          const alias = traductorEquipos[nomDB] || [];
          if (alias.some(a => nombreAPI.includes(a) || a.includes(nombreAPI))) return true;

          return false;
        });

        if (!encontrado) errores.add(nombreOriginalAPI); // Lo anota en la "lista negra"
        return encontrado;
      };

      const local = buscarEquipo(nomLocAPI, partido.homeTeam?.name);
      const visitante = buscarEquipo(nomVisAPI, partido.awayTeam?.name);

      if (local && visitante) {
        let estadoBD = 'pendiente';
        if (partido.status === 'IN_PLAY' || partido.status === 'PAUSED') estadoBD = 'en_juego';
        if (partido.status === 'FINISHED') estadoBD = 'finalizado';

        const { data: partidoExistente } = await supabaseAdmin
          .from('partidos')
          .select('id')
          .match({ equipo_local_id: local.id, equipo_visitante_id: visitante.id })
          .maybeSingle();

        if (partidoExistente) {
          await supabaseAdmin
            .from('partidos')
            .update({
              estado: estadoBD,
              fecha_partido: partido.utcDate,
              goles_local: partido.score?.fullTime?.home ?? null,
              goles_visitante: partido.score?.fullTime?.away ?? null,
              jornada: partido.matchday // Asigna la fecha a los que ya estaban creados
            })
            .eq('id', partidoExistente.id);
          actualizados++;
        } else {
          await supabaseAdmin
            .from('partidos')
            .insert({
              equipo_local_id: local.id,
              equipo_visitante_id: visitante.id,
              estado: estadoBD,
              fecha_partido: partido.utcDate,
              goles_local: partido.score?.fullTime?.home ?? null,
              goles_visitante: partido.score?.fullTime?.away ?? null,
              fase: 'fase_liga',
              jornada: partido.matchday // Asigna la fecha a los nuevos
            });
          creados++;
        }
      }
    }

    return NextResponse.json({
       success: true,
       message: `Proceso terminado. Nuevos: ${creados} | Actualizados: ${actualizados}`,
       total_en_base_de_datos_ahora: creados + actualizados + 80, // 80 es lo que ya tenías
       equipos_sin_coincidencia: Array.from(errores) // ¡Esta es la clave!
     });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fallo general' }, { status: 500 });
  }
}