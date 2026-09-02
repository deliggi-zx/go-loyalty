import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Nueva contraseña" };

// A esta pantalla se llega desde /auth/callback, que ya cambió el code
// del mail por una sesión. Si no hay sesión, el link venció o se abrió
// mal.
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell
        title="Link no válido"
        description="No pudimos validar el link de recuperación."
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            El link ya expiró, se usó antes, o se abrió en un navegador distinto al que
            pidió la recuperación. Pedí uno nuevo.
          </p>
          <Link
            href="/forgot-password"
            className="block text-center text-sm text-amber-600 hover:text-amber-700 hover:underline"
          >
            Pedir un nuevo link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nueva contraseña" description="Elegí la contraseña con la que vas a entrar de ahora en más.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
