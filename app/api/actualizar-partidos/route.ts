import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    
    if (secret !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Consultar el calendario de partidos (endpoint /matches)
    const respuesta = await fetch("https://api.football-data.org/v4/competitions/CL/matches", {
      method: 'GET',
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN!
      }
    });

    const datosAPI = await respuesta.json();

    if (datosAPI.errorCode || datosAPI.error) {
      return NextResponse.json({ error: 'La API rechazó la conexión', detalles: datosAPI.message });
    }

    // 2. Traer todos los equipos de la base de datos para cruzar sus IDs
    const { data: equiposDB } = await supabaseAdmin.from('equipos').select('id, nombre');
    if (!equiposDB) throw new Error("No se pudieron cargar los equipos de Supabase");

    let procesados = 0;

    // 3. Sincronizar resultados de los partidos en Supabase
    for (const partido of datosAPI.matches) {
      // Buscar el equipo local y visitante en tu BD comparando el nombre corto
      const local = equiposDB.find(e => e.nombre.toLowerCase().includes(partido.homeTeam?.shortName?.toLowerCase()));
      const visitante = equiposDB.find(e => e.nombre.toLowerCase().includes(partido.awayTeam?.shortName?.toLowerCase()));

      if (local && visitante) {
        let estadoBD = 'pendiente';
        if (partido.status === 'IN_PLAY' || partido.status === 'PAUSED') estadoBD = 'en_juego';
        if (partido.status === 'FINISHED') estadoBD = 'finalizado';

        // Actualizamos los goles y el estado guiándonos por los IDs de los equipos
        await supabaseAdmin
          .from('partidos')
          .update({ 
            estado: estadoBD,
            fecha_partido: partido.utcDate,
            goles_local: partido.score?.fullTime?.home ?? null,
            goles_visitante: partido.score?.fullTime?.away ?? null
          })
          .match({ equipo_local_id: local.id, equipo_visitante_id: visitante.id });

        procesados++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Se actualizaron ${procesados} partidos con éxito desde football-data.org` 
    });

  } catch (error) {
    console.error("Error en la sincronización de partidos:", error);
    return NextResponse.json({ error: 'Fallo la sincronización' }, { status: 500 });
  }
}