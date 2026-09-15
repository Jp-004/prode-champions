import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const normalizar = (texto?: string) => {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase().trim();
};

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
  ["aek atenas", "pae aek", "aek athens", "aek"],
  ["brujas", "club brugge", "brugge"],
  ["lask", "lask linz"]
];

// 1. Tipos estrictos para lo que recibimos de la API externa
type FilaTablaAPI = {
  position: number;
  team: {
    shortName?: string;
    name?: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

type StandingAPI = {
  stage: string;
  type: string;
  table: FilaTablaAPI[];
};

// 2. Tipos estrictos para lo que enviamos a nuestra base de datos
type EquipoActualizado = {
  id: number;
  posicion_real_actual: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_empatados: number;
  partidos_perdidos: number;
  puntos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const timestamp = new Date().getTime();
    const respuesta = await fetch(`https://api.football-data.org/v4/competitions/CL/standings?_nocache=${timestamp}`, {
      method: 'GET',
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! },
      cache: 'no-store'
    });
    
    const datosAPI = await respuesta.json();
    
    // Aplicamos el tipo StandingAPI al filtro para eliminar el (s: any)
    const tablaLiga = datosAPI.standings?.find((s: StandingAPI) => s.type === 'TOTAL' && s.table && s.table.length > 0);
    if (!tablaLiga) return NextResponse.json({ error: 'La API no devolvió la tabla de posiciones' });

    const { data: equiposDB } = await supabaseAdmin.from('equipos').select('id, nombre');
    
    // Aplicamos el tipo EquipoActualizado a nuestro array para eliminar el (any[])
    const equiposAActualizar: EquipoActualizado[] = [];

    for (const item of tablaLiga.table) {
      const encontrado = equiposDB?.find(e => {
        const nomDB = normalizar(e.nombre);
        const nomCorto = normalizar(item.team?.shortName);
        const nomLargo = normalizar(item.team?.name);
        
        if (nomDB === nomCorto || nomDB === nomLargo) return true;
        for (const familia of familiasEquipos) {
          if (familia.some(m => nomDB.includes(m)) && familia.some(m => nomCorto?.includes(m) || nomLargo?.includes(m))) return true;
        }
        return false;
      });

      if (encontrado) {
        equiposAActualizar.push({
          id: encontrado.id,
          posicion_real_actual: item.position,
          partidos_jugados: item.playedGames,
          partidos_ganados: item.won,
          partidos_empatados: item.draw,
          partidos_perdidos: item.lost,
          puntos: item.points,
          goles_favor: item.goalsFor,
          goles_contra: item.goalsAgainst,
          diferencia_goles: item.goalDifference
        });
      }
    }

    if (equiposAActualizar.length > 0) {
      await supabaseAdmin.from('equipos').upsert(equiposAActualizar, { onConflict: 'id' });
    }

    return NextResponse.json({ success: true, message: `¡Tabla actualizada al instante! Equipos: ${equiposAActualizar.length}` });

  } catch (error) {
    // Manejo de error estricto de TypeScript
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error del servidor al actualizar tabla', detalles: errorMessage }, { status: 500 });
  }
}