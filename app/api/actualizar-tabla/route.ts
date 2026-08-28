import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    
    if (secret !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Consultar a football-data.org (CL = Champions League, siempre trae la actual)
    const respuesta = await fetch("https://api.football-data.org/v4/competitions/CL/standings", {
      method: 'GET',
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN!
      }
    });

    const datosAPI = await respuesta.json();

    // Si la API devuelve un mensaje de error por límite o clave incorrecta
    if (datosAPI.errorCode || datosAPI.error) {
      return NextResponse.json({ error: 'La API rechazó la conexión', detalles: datosAPI.message });
    }

    // Extraemos la tabla total de la fase de liga
    // Extraemos la tabla total de la fase de liga definiendo la estructura esperada
    const tablaTotal = datosAPI.standings?.find((s: { type: string }) => s.type === 'TOTAL')?.table;

    if (!tablaTotal || tablaTotal.length === 0) {
      return NextResponse.json({ error: 'No se encontraron datos en la API' }, { status: 404 });
    }

    // 2. Iteramos los equipos devueltos por la API para actualizar Supabase
    for (const equipoAPI of tablaTotal) {
      // Imprimimos el "shortName" (Ej: "Real Madrid" en vez de "Real Madrid CF")
      // Esto hace que coincida mucho más fácil con los nombres en tu base de datos
      console.log("La API dice:", equipoAPI.team.shortName, "o", equipoAPI.team.name);

      await supabaseAdmin
        .from('equipos')
        .update({ 
          posicion_real_actual: equipoAPI.position,
          puntos: equipoAPI.points,
          goles_favor: equipoAPI.goalsFor,
          goles_contra: equipoAPI.goalsAgainst,
          diferencia_goles: equipoAPI.goalDifference
        })
        .ilike('nombre', `%${equipoAPI.team.shortName}%`); 
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tabla sincronizada con éxito con la temporada actual (football-data.org)' 
    });

  } catch (error) {
    console.error("Error en la sincronización:", error);
    return NextResponse.json({ error: 'Fallo la sincronización' }, { status: 500 });
  }
}