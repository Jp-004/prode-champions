import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

// Mejoramos el normalizador para quitar puntos, tildes, comas y dejar solo texto limpio
const normalizar = (texto?: string) => {
  if (!texto) return "";
  return texto.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes (y la cedilla de Barça)
    .replace(/[^a-zA-Z0-9\s]/g, "") // Quita símbolos raros
    .toLowerCase()
    .trim();
};

// LA NUEVA MAGIA: "Familias de Equipos" (Sin importar quién sea quién, si coinciden en la familia, se unen)
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
  
  // Los 4 equipos reparados con todas sus variantes posibles
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

    const partidosFaseLiga = datosAPI.matches.filter((m: { matchday: number }) => m.matchday >= 1 && m.matchday <= 8);

    for (const partido of partidosFaseLiga) {
      
      const buscarEquipo = (equipoAPI: { shortName?: string; name?: string }) => {
        const nomCorto = normalizar(equipoAPI?.shortName);
        const nomLargo = normalizar(equipoAPI?.name);

        const encontrado = equiposDB.find(e => {
          const nomDB = normalizar(e.nombre);
          
          // 1. Si son exactamente iguales o se contienen directamente
          if (nomDB === nomCorto || nomDB === nomLargo) return true;
          if (nomCorto && nomDB.includes(nomCorto)) return true;
          if (nomLargo && nomDB.includes(nomLargo)) return true;
          if (nomCorto && nomCorto.includes(nomDB)) return true;
          if (nomLargo && nomLargo.includes(nomDB)) return true;
          
          // 2. Si pertenecen a la misma "Familia"
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

      const local = buscarEquipo(partido.homeTeam);
      const visitante = buscarEquipo(partido.awayTeam);

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
              jornada: partido.matchday
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
              jornada: partido.matchday
            });
          creados++;
        }
      }
    }

    return NextResponse.json({
       success: true,
       message: `Proceso terminado. Nuevos: ${creados} | Actualizados: ${actualizados}`,
       equipos_sin_coincidencia: Array.from(errores)
     });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fallo general' }, { status: 500 });
  }
}