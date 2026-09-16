import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

// 1. Definimos estrictamente la forma de los datos que vamos a procesar
type EquipoConStats = {
  id: number;
  nombre: string;
  escudo_url: string | null;
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

// 2. Definimos lo que esperamos recibir de la base de datos básica
type EquipoDB = {
  id: number;
  nombre: string;
  escudo_url: string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== 'mi_contraseña_secreta_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Traer TODOS los datos de los equipos
    const { data: equipos, error: errEquipos } = await supabaseAdmin.from('equipos').select('*');
    if (errEquipos || !equipos) throw new Error("No se pudieron cargar los equipos.");

    // ¡Adiós al any! Le decimos al Map exactamente qué tipo de datos va a guardar
    const statsMap = new Map<number, EquipoConStats>();
    
    // Iteramos aplicando el tipo EquipoDB para que TypeScript sepa qué es "eq"
    equipos.forEach((eq: EquipoDB) => {
      statsMap.set(eq.id, {
        id: eq.id,
        nombre: eq.nombre,
        escudo_url: eq.escudo_url,
        posicion_real_actual: 0,
        partidos_jugados: 0,
        partidos_ganados: 0,
        partidos_empatados: 0,
        partidos_perdidos: 0,
        puntos: 0,
        goles_favor: 0,
        goles_contra: 0,
        diferencia_goles: 0
      });
    });

    // Traer SOLO los partidos FINALIZADOS
    const { data: partidos, error: errPartidos } = await supabaseAdmin
      .from('partidos')
      .select('equipo_local_id, equipo_visitante_id, goles_local, goles_visitante')
      .eq('estado', 'finalizado')
      .eq('fase', 'fase_liga');
    
    if (errPartidos) throw new Error("Error cargando partidos.");

    // Calcular puntos
    if (partidos) {
      partidos.forEach(p => {
        const local = statsMap.get(p.equipo_local_id);
        const visitante = statsMap.get(p.equipo_visitante_id);

        if (local && visitante && p.goles_local !== null && p.goles_visitante !== null) {
          local.partidos_jugados += 1;
          visitante.partidos_jugados += 1;

          local.goles_favor += p.goles_local;
          local.goles_contra += p.goles_visitante;
          local.diferencia_goles = local.goles_favor - local.goles_contra;

          visitante.goles_favor += p.goles_visitante;
          visitante.goles_contra += p.goles_local;
          visitante.diferencia_goles = visitante.goles_favor - visitante.goles_contra;

          if (p.goles_local > p.goles_visitante) {
            local.puntos += 3;
            local.partidos_ganados += 1;
            visitante.partidos_perdidos += 1;
          } else if (p.goles_local < p.goles_visitante) {
            visitante.puntos += 3;
            visitante.partidos_ganados += 1;
            local.partidos_perdidos += 1;
          } else {
            local.puntos += 1;
            local.partidos_empatados += 1;
            visitante.puntos += 1;
            visitante.partidos_empatados += 1;
          }
        }
      });
    }

    // Ordenar
    const tablaArray = Array.from(statsMap.values());
    tablaArray.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.diferencia_goles !== a.diferencia_goles) return b.diferencia_goles - a.diferencia_goles;
      return b.goles_favor - a.goles_favor;
    });

    // Asignar posición
    const equiposAActualizar = tablaArray.map((eq, index) => {
      eq.posicion_real_actual = index + 1;
      return eq;
    });

    // Guardar en Supabase
    const { error: errUpsert } = await supabaseAdmin.from('equipos').upsert(equiposAActualizar, { onConflict: 'id' });
    if (errUpsert) throw new Error("Error al guardar la tabla: " + errUpsert.message);

    return NextResponse.json({ success: true, message: `¡Tabla calculada internamente y actualizada! Equipos procesados: ${equiposAActualizar.length}` });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error al calcular tabla', detalles: errorMessage }, { status: 500 });
  }
}