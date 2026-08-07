"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Forma del jsonb que devuelve reserve_gym_invite_code() — ver migración en
// Supabase (Fase 0a de "Gym2 funcional").
interface ReserveInviteCodeResult {
  success: boolean;
  code_id?: string;
  message?: string;
}

interface LoginFormProps {
  primaryColor: string;
  // "card" (default): recuadro con fondo/borde/sombra propios, para vivir
  // suelto en el cuerpo de la página (comportamiento de siempre).
  // "bare": sin chrome propio, para vivir dentro de un contenedor que ya
  // aporta el fondo/sombra (ej. el modal de login del ícono del header).
  variant?: "card" | "bare";
  // Estilo oscuro + acentos #ccff00 — hoy solo Gym2. Cubre login Y registro
  // porque son el mismo formulario (se alternan con el estado `mode`), así
  // que no hay un "recuadro de registrarse" separado que estilar aparte.
  neonTheme?: boolean;
  // Fase 0a de "Gym2 funcional" (registro controlado por código de
  // invitación): mismo criterio hasGymFeatures que ya gatea neonTheme más
  // arriba en la cadena (layout.tsx → ClientHeader → LoginModal), pero
  // expuesto como prop propia — hoy coincide con neonTheme, pero no
  // significan lo mismo (uno es estilo visual, el otro un requisito
  // funcional) y no deberían acoplarse. orgId es requerido junto con esto
  // porque reserve_gym_invite_code() necesita saber para qué organización
  // vale el código.
  requireInviteCode?: boolean;
  orgId?: string;
}

export function LoginForm({
  primaryColor,
  variant = "card",
  neonTheme = false,
  requireInviteCode = false,
  orgId,
}: LoginFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
      setLoading(false);
      return;
    }

    // Registro. Con código de invitación (Gym2), el orden es:
    // 1) reservar el código ANTES de crear la cuenta — si es inválido/ya
    //    usado, nunca llegamos a llamar signUp(), así que no puede quedar
    //    un usuario creado sin un código válido detrás.
    // 2) signUp(). Si falla después de haber reservado, liberamos el
    //    código (best-effort) para no desperdiciarlo.
    // 3) finalize: asociar el usuario recién creado al código ya
    //    reservado. signUp() devuelve su id aunque no haya sesión activa
    //    todavía (falta confirmar el mail), así que alcanza.
    let codeId: string | null = null;

    if (requireInviteCode) {
      const { data, error: reserveError } = await supabase.rpc("reserve_gym_invite_code", {
        p_org_id: orgId,
        p_code: inviteCode,
      });
      const result = data as ReserveInviteCodeResult | null;

      if (reserveError || !result?.success) {
        setError(result?.message ?? "No pudimos validar el código. Probá de nuevo.");
        setLoading(false);
        return;
      }
      codeId = result.code_id ?? null;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (signUpError) {
      if (codeId) {
        await supabase.rpc("release_gym_invite_code", { p_code_id: codeId });
      }
      setError(signUpError.message);
    } else {
      if (codeId && signUpData.user) {
        await supabase.rpc("finalize_gym_invite_code", {
          p_code_id: codeId,
          p_user_id: signUpData.user.id,
        });
      }
      setRegistered(true);
    }

    setLoading(false);
  }

  const wrapperClass =
    variant === "card"
      ? neonTheme
        ? "bg-[#0a0a0b] rounded-2xl shadow-sm border border-[#26262a] p-6 space-y-4"
        : "bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-4"
      : "space-y-4";
  const successWrapperClass =
    variant === "card"
      ? neonTheme
        ? "bg-[#0a0a0b] rounded-2xl shadow-sm border border-[#26262a] p-6 text-center space-y-3"
        : "bg-white rounded-2xl shadow-sm border border-stone-100 p-6 text-center space-y-3"
      : "text-center space-y-3";

  const eyebrowClass = neonTheme ? "text-[#ccff00]" : "text-stone-400";
  const titleClass = neonTheme ? "text-white" : "text-stone-900";
  const errorClass = neonTheme
    ? "text-xs text-red-300 bg-red-950/40 rounded-lg px-3 py-2 border border-red-800"
    : "text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100";
  const inputClass = neonTheme
    ? "w-full h-10 px-3 text-sm rounded-lg border border-[#26262a] bg-[#141416] text-white placeholder:text-[#6b6965] focus:outline-none focus:border-[#ccff00] focus:shadow-[0_0_0_1px_#ccff00,0_0_10px_rgba(204,255,0,0.35)] transition-colors"
    : "w-full h-10 px-3 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors";
  const submitClass = neonTheme
    ? "w-full h-10 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 border border-[#ccff00] text-[#ccff00] bg-[#ccff00]/10 hover:bg-[#ccff00]/20 shadow-[0_0_10px_rgba(204,255,0,0.35),inset_0_0_10px_rgba(204,255,0,0.1)]"
    : "w-full h-10 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60";
  const submitStyle = neonTheme ? undefined : { backgroundColor: primaryColor || "#f59e0b" };
  const toggleClass = neonTheme
    ? "w-full text-xs transition-colors pt-1 text-[#9b9995] hover:text-[#ccff00]"
    : "w-full text-xs text-stone-400 hover:text-stone-600 transition-colors pt-1";
  const successIconWrapClass = neonTheme
    ? "w-12 h-12 rounded-full bg-emerald-950/40 flex items-center justify-center mx-auto"
    : "w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto";
  const successIconClass = neonTheme ? "w-6 h-6 text-emerald-400" : "w-6 h-6 text-emerald-600";
  const successTitleClass = neonTheme ? "font-semibold text-white" : "font-semibold text-stone-900";
  const successSubtitleClass = neonTheme ? "text-sm text-[#9b9995]" : "text-sm text-stone-500";
  const successLinkClass = neonTheme ? "text-sm font-medium text-[#ccff00]" : "text-sm font-medium";
  const successLinkStyle = neonTheme ? undefined : { color: primaryColor || "#f59e0b" };

  if (registered) {
    return (
      <div className={successWrapperClass}>
        <div className={successIconWrapClass}>
          <svg className={successIconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className={successTitleClass}>¡Cuenta creada!</p>
        <p className={successSubtitleClass}>
          Revisá tu email para confirmar tu cuenta y después iniciá sesión.
        </p>
        <button
          onClick={() => { setMode("login"); setRegistered(false); }}
          className={successLinkClass}
          style={successLinkStyle}
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${eyebrowClass}`}>
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </p>
        <h2 className={`text-base font-semibold mt-0.5 ${titleClass}`}>
          {mode === "login" ? "Accedé a tu tarjeta de sellos" : "Registrate para acumular sellos"}
        </h2>
      </div>

      {error && <div className={errorClass}>{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <input
            type="text"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
        )}
        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={inputClass}
        />
        {mode === "register" && requireInviteCode && (
          <input
            type="text"
            placeholder="Código de invitación"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            className={inputClass}
          />
        )}
        <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
          {loading ? "Cargando..." : mode === "login" ? "Ingresar" : "Registrarme"}
        </button>
      </form>

      <button
        onClick={() => { setMode((m) => (m === "login" ? "register" : "login")); setError(null); }}
        className={toggleClass}
      >
        {mode === "login"
          ? "¿No tenés cuenta? Registrate gratis"
          : "¿Ya tenés cuenta? Iniciá sesión"}
      </button>
    </div>
  );
}
