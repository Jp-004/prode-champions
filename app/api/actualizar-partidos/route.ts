import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

const normalizar = (texto?: string) => {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

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
  "fc barcelona": ["barcelona", "barca", "fc barcelona"],
  "shakhtar": ["fk shakhtar donetsk", "shakhtar donetsk"],
  "manchester city": ["manchester city fc", "man city"],
  "manchester united": ["manchester united fc", "man united", "man utd"],
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
    
    // NUEVO: Lista para recolectar cómo escribe la API los nombres
    const nombresAPI = new Set<string>(); 

    const partidosFaseLiga = datosAPI.matches.filter((m: { matchday: number }) => m.matchday >= 1 && m.matchday <= 8);

    for (const partido of partidosFaseLiga) {
      
      // Guardamos el "molde" que envía la API para mostrártelo
      if (partido.homeTeam?.name) nombresAPI.add(`Largo: ${partido.homeTeam.name} | Corto: ${partido.homeTeam.shortName}`);
      if (partido.awayTeam?.name) nombresAPI.add(`Largo: ${partido.awayTeam.name} | Corto: ${partido.awayTeam.shortName}`);

      const buscarEquipo = (equipoAPI: { shortName?: string; name?: string }) => {
        const nomCorto = normalizar(equipoAPI?.shortName);
        const nomLargo = normalizar(equipoAPI?.name);

        const encontrado = equiposDB.find(e => {
          const nomDB = normalizar(e.nombre);
          
          if (nomDB.includes(nomCorto) || nomCorto.includes(nomDB)) return true;
          if (nomDB.includes(nomLargo) || nomLargo.includes(nomDB)) return true;
          
          const alias = traductorEquipos[nomDB] || [];
          if (alias.some(a => nomCorto.includes(a) || a.includes(nomCorto) || nomLargo.includes(a) || a.includes(nomLargo))) {
            return true;
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
       equipos_sin_coincidencia: Array.from(errores),
       
       // --- EL DIAGNÓSTICO ESTRELLA ---
       DIAGNOSTICO_TU_BASE_DE_DATOS: equiposDB.map(e => e.nombre).sort(),
       DIAGNOSTICO_LA_API_MANDA: Array.from(nombresAPI).sort()
     });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Fallo general' }, { status: 500 });
  }
}