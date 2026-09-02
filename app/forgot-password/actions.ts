"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/request-origin";

export interface SendResetResult {
  ok: boolean;
  // "rate_limit" | "server" — solo para elegir el texto en el cliente.
  error?: "rate_limit" | "server";
}

export async function sendResetEmail(email: string): Promise<SendResetResult> {
  const clean = email.trim();
  if (!clean) return { ok: false, error: "server" };

  const supabase = createClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${getRequestOrigin()}/auth/callback?next=/reset-password`,
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
