import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type JugadorAPI = {
  name: string;
};

type EquipoAPI = {
  name: string;
  shortName?: string;
};

type ScorerItemAPI = {
  player: JugadorAPI;
  team: EquipoAPI;
  goals: number;
  assists?: number | null;
  penalties?: number | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

const timestamp = new Date().getTime();
    // Le agregamos limit=100 para traer hasta 100 jugadores
    const respuesta = await fetch(`https://api.football-data.org/v4/competitions/CL/scorers?limit=100&_nocache=${timestamp}`, {
      method: 'GET',
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! },
      cache: 'no-store'
    });
    
    const datosAPI = await respuesta.json();
    
    if (!datosAPI.scorers || datosAPI.scorers.length === 0) {
      return NextResponse.json({ error: 'La API no devolvió goleadores' });
    }

    // Vaciamos la tabla anterior y ponemos la nueva (es más eficiente que hacer upsert uno por uno aquí)
    await supabaseAdmin.from('goleadores').delete().neq('id', 0);

    const goleadoresAInsertar = datosAPI.scorers.map((item: ScorerItemAPI) => ({
      jugador_nombre: item.player.name,
      equipo_nombre: item.team.shortName || item.team.name,
      goles: item.goals,
      asistencias: item.assists || 0,
      penales: item.penalties || 0
    }));

    const { error } = await supabaseAdmin.from('goleadores').insert(goleadoresAInsertar);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `¡Top ${goleadoresAInsertar.length} goleadores actualizados!` });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error al actualizar goleadores', detalles: errorMessage }, { status: 500 });
  }
}