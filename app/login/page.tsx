"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // NUEVO: Estado para controlar el mensaje de éxito
  const [exito, setExito] = useState<string | null>(null); 
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setExito(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  };

  const handleRegister = async () => {
    setError(null);
    setExito(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      // MAGIA: En lugar del "alert", encendemos el recuadro verde
      setExito("¡Registro exitoso! Ya puedes iniciar sesión.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-black text-center text-white mb-2">Prode Champions League</h1>
        <div className="text-center text-4xl mb-6">🏆</div>

        {/* Recuadro Rojo (Errores) */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {/* NUEVO: Recuadro Verde (Éxito) */}
        {exito && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg mb-6 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            ✓ {exito}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:border-blue-500 outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 text-white px-4 py-2.5 rounded-lg focus:border-blue-500 outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 mt-2"
          >
            {loading ? "Cargando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm mb-3">¿No tienes cuenta?</p>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Registrarse"}
          </button>
        </div>
      </div>
    </div>
  );
}