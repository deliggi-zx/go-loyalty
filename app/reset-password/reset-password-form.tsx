"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/app/login/password-field";
import { updatePassword } from "./actions";

// homeHref: adónde vuelve el usuario después de guardar la contraseña —
// lo resuelve la page según el rol (/dashboard para staff, /<slug> para
// un cliente del sitio público). Ver reset-password/page.tsx.
export function ResetPasswordForm({ homeHref = "/dashboard" }: { homeHref?: string }) {
  const router = useRouter();
  const goingToDashboard = homeHref === "/dashboard";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    const res = await updatePassword(password);
    setSubmitting(false);

    if (!res.ok) {
      if (res.error === "no_session") {
        setError("El link ya expiró. Volvé a pedir uno desde “¿Olvidaste tu contraseña?”.");
      } else if (res.error === "too_short") {
        setError("Elegí una contraseña más larga o distinta a la anterior.");
      } else {
        setError("No pudimos guardar la contraseña. Probá de nuevo en un rato.");
      }
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-3 text-sm text-emerald-800">
          Listo, tu contraseña quedó actualizada.
        </div>
        <Button
          type="button"
          onClick={() => router.replace(homeHref)}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium"
        >
          {goingToDashboard ? "Ir al panel" : "Ir al inicio"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña nueva</Label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Al menos 6 caracteres"
          value={password}
          onChange={setPassword}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Repetir contraseña</Label>
        <PasswordField
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />
      </div>

      <Button
        type="submit"
        disabled={submitting || !password || !confirm}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-50"
      >
        {submitting ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
