"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

type Equipo = {
  id: number;
  nombre: string;
  escudo_url: string | null;
};

interface SelectorEquipoProps {
  equipos: Equipo[];
  equipoSeleccionadoId: number | null;
  onSeleccionar: (id: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function SelectorEquipo({
  equipos,
  equipoSeleccionadoId,
  onSeleccionar,
  disabled = false,
  placeholder = "-- Seleccionar Equipo --",
}: SelectorEquipoProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const equipoActual = equipos.find((e) => e.id === equipoSeleccionadoId);

  const equiposFiltrados = equipos.filter((e) =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Botón principal del selector */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto(!abierto)}
        className={`w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-2 flex items-center justify-between transition focus:border-blue-500 outline-none ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-gray-500"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {equipoActual ? (
            <>
              {equipoActual.escudo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={equipoActual.escudo_url}
                  alt={equipoActual.nombre}
                  className="w-5 h-5 object-contain shrink-0"
                />
              ) : (
                <div className="w-5 h-5 bg-gray-800 rounded-full border border-gray-700 shrink-0" />
              )}
              <span className="truncate font-medium text-gray-200">
                {equipoActual.nombre}
              </span>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Menú desplegable flotante */}
      {abierto && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-gray-800">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar equipo..."
              className="w-full bg-gray-950 border border-gray-700 text-xs text-white rounded-md px-2.5 py-1.5 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onSeleccionar(null);
                setAbierto(false);
                setBusqueda("");
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-800 rounded-md transition"
            >
              {placeholder}
            </button>

            {equiposFiltrados.map((equipo) => {
              const esSeleccionado = equipo.id === equipoSeleccionadoId;
              return (
                <button
                  key={equipo.id}
                  type="button"
                  onClick={() => {
                    onSeleccionar(equipo.id);
                    setAbierto(false);
                    setBusqueda("");
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition ${
                    esSeleccionado
                      ? "bg-blue-600/20 text-blue-400 font-bold"
                      : "text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {equipo.escudo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={equipo.escudo_url}
                        alt={equipo.nombre}
                        className="w-4 h-4 object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 bg-gray-800 rounded-full border border-gray-700 shrink-0" />
                    )}
                    <span className="truncate">{equipo.nombre}</span>
                  </div>
                  {esSeleccionado && (
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}

            {equiposFiltrados.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-3">
                No se encontraron equipos
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}