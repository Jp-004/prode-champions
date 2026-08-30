import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    
    if (secret !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

    const { data: equiposDB } = await supabaseAdmin.from('equipos').select('id, nombre');
    if (!equiposDB) throw new Error("No se pudieron cargar los equipos de Supabase");

    let creados = 0;
    let actualizados = 0;

    for (const partido of datosAPI.matches) {
      const local = equiposDB.find(e => e.nombre.toLowerCase().includes(partido.homeTeam?.shortName?.toLowerCase()));
      const visitante = equiposDB.find(e => e.nombre.toLowerCase().includes(partido.awayTeam?.shortName?.toLowerCase()));

      if (local && visitante) {
        let estadoBD = 'pendiente';
        if (partido.status === 'IN_PLAY' || partido.status === 'PAUSED') estadoBD = 'en_juego';
        if (partido.status === 'FINISHED') estadoBD = 'finalizado';

        // 1. Verificamos si el partido ya está en la base de datos
        const { data: partidoExistente } = await supabaseAdmin
          .from('partidos')
          .select('id')
          .match({ equipo_local_id: local.id, equipo_visitante_id: visitante.id })
          .maybeSingle();

        if (partidoExistente) {
          // 2. Si ya existe, ACTUALIZAMOS los goles y el estado
          await supabaseAdmin
            .from('partidos')
            .update({ 
              estado: estadoBD,
              fecha_partido: partido.utcDate,
              goles_local: partido.score?.fullTime?.home ?? null,
              goles_visitante: partido.score?.fullTime?.away ?? null
            })
            .eq('id', partidoExistente.id);
            
          actualizados++;
        } else {
          // 3. Si no existe, CREAMOS el partido desde cero
          await supabaseAdmin
            .from('partidos')
            .insert({
              equipo_local_id: local.id,
              equipo_visitante_id: visitante.id,
              estado: estadoBD,
              fecha_partido: partido.utcDate,
              goles_local: partido.score?.fullTime?.home ?? null,
              goles_visitante: partido.score?.fullTime?.away ?? null,
              fase: 'fase_liga' // Automáticamente le asignamos la primera fase
            });
            
          creados++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sincronización completa: ${creados} partidos nuevos creados y ${actualizados} actualizados.` 
    });

  } catch (error) {
    console.error("Error en la sincronización de partidos:", error);
    return NextResponse.json({ error: 'Fallo la sincronización' }, { status: 500 });
  }
}