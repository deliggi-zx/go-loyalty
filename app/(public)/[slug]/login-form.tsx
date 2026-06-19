"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LoginFormProps {
  primaryColor: string;
}

export function LoginForm({ primaryColor }: LoginFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Credenciales incorrectas. Verificá tu email y contraseña.");
      } else {
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setRegistered(true);
      }
    }

    setLoading(false);
  }

  if (registered) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-stone-900">¡Cuenta creada!</p>
        <p className="text-sm text-stone-500">
          Revisá tu email para confirmar tu cuenta y después iniciá sesión.
        </p>
        <button
          onClick={() => { setMode("login"); setRegistered(false); }}
          className="text-sm font-medium"
          style={{ color: primaryColor || "#f59e0b" }}
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-4">
      <div>
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </p>
        <h2 className="text-base font-semibold text-stone-900 mt-0.5">
          {mode === "login" ? "Accedé a tu tarjeta de sellos" : "Registrate para acumular sellos"}
        </h2>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: primaryColor || "#f59e0b" }}
        >
          {loading ? "Cargando..." : mode === "login" ? "Ingresar" : "Registrarme"}
        </button>
      </form>

      <button
        onClick={() => { setMode((m) => (m === "login" ? "register" : "login")); setError(null); }}
        className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors pt-1"
      >
        {mode === "login"
          ? "¿No tenés cuenta? Registrate gratis"
          : "¿Ya tenés cuenta? Iniciá sesión"}
      </button>
    </div>
  );
}
