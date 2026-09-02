"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdatePasswordResult {
  ok: boolean;
  error?: "too_short" | "no_session" | "server";
}

const MIN_LENGTH = 6;

export async function updatePassword(password: string): Promise<UpdatePasswordResult> {
  if (!password || password.length < MIN_LENGTH) {
    return { ok: false, error: "too_short" };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "no_session" };

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error("[reset-password] updateUser:", {
        code: error.code,
        status: error.status,
        message: error.message,
      });
      // GoTrue rechaza reusar la misma contraseña o una demasiado débil.
      if (error.code === "same_password" || error.code === "weak_password") {
        return { ok: false, error: "too_short" };
      }
      return { ok: false, error: "server" };
    }
  } catch (err) {
    console.error("[reset-password] excepción en updateUser:", err);
    return { ok: false, error: "server" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
