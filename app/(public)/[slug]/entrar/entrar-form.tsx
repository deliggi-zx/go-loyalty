"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Atajo temporal (bloqueo urgente Corner: hoy no hay ningún trigger de
// login visible en su home/perfil — ver PASO 2 para el fix real). Mismo
// signIn() (supabase.auth.signInWithPassword) que usa el resto de las
// orgs vía LoginForm, sin las variantes de tema/registro/invite-code de
// ese componente — a propósito, acá la prioridad es que funcione ya.
export function EntrarForm({ slug }: { slug: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciales incorrectas. Verificá tu email y contraseña.");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(`/${slug}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-[#141416] border border-[#26262a] rounded-2xl p-6">
      {error && (
        <div className="text-xs text-red-300 bg-red-950/40 rounded-lg px-3 py-2 border border-red-800">
          {error}
        </div>
      )}
      <input
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        className="w-full h-10 px-3 text-sm rounded-lg border border-[#26262a] bg-[#0a0a0b] text-white placeholder:text-[#6b6965] focus:outline-none focus:border-[#1e8f4e]"
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        className="w-full h-10 px-3 text-sm rounded-lg border border-[#26262a] bg-[#0a0a0b] text-white placeholder:text-[#6b6965] focus:outline-none focus:border-[#1e8f4e]"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 rounded-lg text-sm font-semibold text-white bg-[#1e8f4e] hover:bg-[#1e8f4e]/90 transition-colors disabled:opacity-60"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
