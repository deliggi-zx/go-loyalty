"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Dos mensajes distintos según el tipo de fallo (ver más abajo). Antes
// todo error caía en "Credenciales incorrectas" y eso ya nos costó un
// diagnóstico real (el bug de login de admin-kapusta era un 500 de
// GoTrue, no una contraseña mal tipeada, y el cartel decía lo contrario).
const CREDENTIALS_ERROR = "Credenciales incorrectas";
const SERVER_ERROR = "Hubo un problema para iniciar sesión, probá de nuevo en un momento.";

// GoTrue devuelve code "invalid_credentials" (status 400) puntualmente
// para usuario/contraseña que no matchean. Cualquier otra cosa —500,
// timeout, GoTrue caído, esquema roto, excepción de red— es un problema
// de servidor, no de credenciales.
function isInvalidCredentials(error: { code?: string; status?: number; message?: string }): boolean {
  if (error.code) return error.code === "invalid_credentials";
  // Fallback por si una versión vieja del cliente no manda code.
  return /invalid login credentials/i.test(error.message ?? "");
}

export async function login(formData: FormData) {
  const supabase = createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"] = null;
  try {
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  } catch (err) {
    // Excepción antes de tener respuesta (red, timeout, DNS...).
    console.error("[login] excepción al llamar a signInWithPassword:", err);
    redirect(`/login?error=${encodeURIComponent(SERVER_ERROR)}`);
  }

  if (error) {
    if (isInvalidCredentials(error)) {
      redirect(`/login?error=${encodeURIComponent(CREDENTIALS_ERROR)}`);
    }
    // Error real inesperado: lo dejamos registrado para poder
    // diagnosticarlo en vez de perseguir un fantasma de "contraseña mal".
    console.error("[login] error inesperado de Supabase Auth:", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    redirect(`/login?error=${encodeURIComponent(SERVER_ERROR)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
