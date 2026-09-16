import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Lógica para emparejar el nombre de la API con el de tu Base de Datos
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

type ScorerAPI = {
  player: { name: string };
  team: { name: string; shortName?: string };
  goals: number;
  assists?: number;
  penalties?: number;
};

type EquipoDB = {
  id: number;
  nombre: string;
  escudo_url: string | null;
};

type GoleadorInsert = {
  jugador_nombre: string;
  equipo_nombre: string;
  goles: number;
  asistencias: number;
  penales: number;
  escudo_url: string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const timestamp = new Date().getTime();
    const respuesta = await fetch(`https://api.football-data.org/v4/competitions/CL/scorers?limit=100&_nocache=${timestamp}`, {
      method: 'GET',
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! },
      cache: 'no-store'
    });
    
    const datosAPI = await respuesta.json();
    
    if (!datosAPI.scorers || datosAPI.scorers.length === 0) {
      return NextResponse.json({ error: 'La API no devolvió goleadores' });
    }

    // Traemos los escudos de tu base de datos
    const { data: equiposDB } = await supabaseAdmin.from('equipos').select('id, nombre, escudo_url');

    await supabaseAdmin.from('goleadores').delete().neq('id', 0);

    const goleadoresAInsertar: GoleadorInsert[] = datosAPI.scorers.map((item: ScorerAPI) => {
      let escudoAsignado = null;
      
      // Emparejador de nombres de equipos
      if (equiposDB) {
        const nomCorto = normalizar(item.team.shortName);
        const nomLargo = normalizar(item.team.name);
        
        const encontrado = equiposDB.find((e: EquipoDB) => {
          const nomDB = normalizar(e.nombre);
          if (nomDB === nomCorto || nomDB === nomLargo) return true;
          for (const familia of familiasEquipos) {
            if (familia.some(m => nomDB.includes(m)) && familia.some(m => nomCorto?.includes(m) || nomLargo?.includes(m))) return true;
          }
          return false;
        });
        
        if (encontrado) escudoAsignado = encontrado.escudo_url;
      }

      return {
        jugador_nombre: item.player.name,
        equipo_nombre: item.team.shortName || item.team.name,
        goles: item.goals,
        asistencias: item.assists || 0,
        penales: item.penalties || 0,
        escudo_url: escudoAsignado
      };
    });

    const { error } = await supabaseAdmin.from('goleadores').insert(goleadoresAInsertar);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `¡Top ${goleadoresAInsertar.length} goleadores actualizados con escudos!` });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error al actualizar goleadores', detalles: errorMessage }, { status: 500 });
  }
}