"use client";
import { 
  BookOpen, 
  Target, 
  Trophy, 
  Info, 
  AlertCircle, 
  Award, 
  Scale, 
  Lock, 
  Clock, 
  Eye 
} from "lucide-react";

export default function ReglasPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Encabezado */}
        <div className="mb-8 mt-2 md:mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-cyan-400" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 leading-tight">
              Reglas y Formato
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Tarjeta: El Formato UCL */}
          <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-400" />
              El Nuevo Formato de la Champions
            </h2>
            <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
              <p>Los <strong>36 equipos</strong> compiten en una única tabla general (Fase de Liga):</p>
              <ul className="list-disc list-inside space-y-2 ml-2 text-gray-400">
                <li><strong className="text-emerald-400">Puestos 1° al 8°:</strong> Clasifican directo a Octavos de Final.</li>
                <li><strong className="text-orange-400">Puestos 9° al 24°:</strong> Disputan los Play-Offs (ida y vuelta) por un boleto a Octavos.</li>
                <li><strong className="text-red-400">Puestos 25° al 36°:</strong> Eliminados de competencias europeas.</li>
              </ul>
            </div>
          </div>

          {/* Tarjeta: Campeón y Subcampeón */}
          <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-yellow-400" />
              Pronósticos a Largo Plazo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center font-black text-yellow-400 text-lg shrink-0">+10</div>
                <div>
                  <h4 className="font-bold text-sm text-gray-200">Acertar el Campeón</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Sumas 10 puntos si el equipo elegido levanta la Orejona.</p>
                </div>
              </div>
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-400/10 border border-slate-400/30 flex items-center justify-center font-black text-slate-300 text-lg shrink-0">+6</div>
                <div>
                  <h4 className="font-bold text-sm text-gray-200">Acertar el Subcampeón</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Sumas 6 puntos si tu seleccionado llega a la final pero no la gana.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta: Partidos */}
          <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-400" />
              Puntos por Partido
            </h2>
            <ul className="space-y-3">
              <li className="flex gap-4 items-start bg-gray-950 p-3.5 rounded-xl border border-gray-800">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 shrink-0">+3</div>
                <div>
                  <h4 className="font-bold text-sm text-gray-200">Resultado Exacto (Pleno)</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Acertaste el marcador exacto del partido.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start bg-gray-950 p-3.5 rounded-xl border border-gray-800">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center font-black text-yellow-400 shrink-0">+1</div>
                <div>
                  <h4 className="font-bold text-sm text-gray-200">Tendencia (Ganador o Empate)</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Acertaste qué club ganó o si hubo empate, sin dar con los goles exactos.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Tarjeta: Armar Tabla */}
          <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-emerald-400" />
              Puntos por Armar Tabla
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                <div className="text-emerald-400 font-black text-xl mb-1">3 Puntos</div>
                <div className="font-bold text-gray-200 text-sm">Posición Exacta</div>
                <div className="text-xs text-gray-400 mt-1">El equipo finalizó en la misma posición matemática que predijiste.</div>
              </div>
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                <div className="text-yellow-400 font-black text-xl mb-1">1 Punto</div>
                <div className="font-bold text-gray-200 text-sm">Acierto de Zona</div>
                <div className="text-xs text-gray-400 mt-1">Acertaste la zona del equipo (Octavos, Play-Offs o Eliminados) pero no el puesto exacto.</div>
              </div>
            </div>
          </div>

          {/* Tarjeta: Criterio de Desempate */}
          <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-purple-400" />
              Criterio de Desempate en el Ranking
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Si dos o más jugadores finalizan con la misma cantidad de puntos totales, el sistema posicionará por encima a aquel que tenga la <strong>mayor cantidad de resultados exactos (+3) acertados</strong> en los partidos del fixture.
            </p>
          </div>

          {/* Tarjeta: Cierres y Bloqueos (Totalmente Vectorial) */}
          <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Fechas Límite y Antitrampas
            </h2>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex items-start gap-3 bg-gray-950 p-3.5 rounded-xl border border-gray-800/80">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Cierre de Tabla y Candidatos</h4>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Puedes cargar o modificar tu tabla y candidatos hasta el <strong className="text-gray-200">15 de septiembre</strong>. A partir de esa fecha quedan fijados y bloqueados automáticamente.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-950 p-3.5 rounded-xl border border-gray-800/80">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Cierre de Partidos</h4>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    El pronóstico de cada partido se puede modificar hasta el momento exacto en que comience a disputarse.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-gray-950 p-3.5 rounded-xl border border-gray-800/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Eye className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Modo Espía</h4>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Para ver los pronósticos y la tabla de otro usuario, primero debes haber enviado y confirmado tu propia predicción.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}