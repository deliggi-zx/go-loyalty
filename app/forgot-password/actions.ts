"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface SendResetResult {
  ok: boolean;
  // "rate_limit" | "server" — solo para elegir el texto en el cliente.
  error?: "rate_limit" | "server";
}

// Origen público de la request, para armar el redirectTo del mail de
// recuperación (Supabase exige que esa URL esté en la allow-list de
// Redirect URLs del proyecto).
function getOrigin(): string {
  const h = headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendResetEmail(email: string): Promise<SendResetResult> {
  const clean = email.trim();
  if (!clean) return { ok: false, error: "server" };

  const supabase = createClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${getOrigin()}/auth/callback?next=/reset-password`,
    });

    // No se distingue "el mail no existe" de "el mail existe" en el
    // cartel de la pantalla: se responde siempre igual para no filtrar
    // qué cuentas hay. Pero un error real (rate limit, SMTP caído, 500)
    // se registra y cambia el mensaje.
    if (error) {
      console.error("[forgot-password] resetPasswordForEmail:", {
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return { ok: false, error: error.status === 429 ? "rate_limit" : "server" };
    }
  } catch (err) {
    console.error("[forgot-password] excepción en resetPasswordForEmail:", err);
    return { ok: false, error: "server" };
  }

  return { ok: true };
}
