"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { sendResetEmail } from "./actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await sendResetEmail(email);
    setSubmitting(false);
    if (!res.ok) {
      setError(
        res.error === "rate_limit"
          ? "Se hicieron demasiados intentos. Esperá un rato antes de volver a probar."
          : "No pudimos enviar el mail en este momento. Probá de nuevo en un rato."
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-3 text-sm text-emerald-800">
          Si hay una cuenta asociada a <strong>{email}</strong>, te enviamos un mail con un
          link para crear una contraseña nueva. Revisá también la carpeta de spam.
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-amber-600 hover:text-amber-700 hover:underline"
        >
          ‹ Volver a iniciar sesión
        </Link>
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-stone-200 focus-visible:ring-amber-500"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting || !email.trim()}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-50"
      >
        {submitting ? "Enviando…" : "Enviar link de recuperación"}
      </Button>

      <p className="text-center text-sm text-stone-500">
        <Link href="/login" className="text-amber-600 hover:text-amber-700 hover:underline">
          ‹ Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
