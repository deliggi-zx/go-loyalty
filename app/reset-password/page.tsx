import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { slugForHost } from "@/lib/org-domains";
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

  // Adónde mandar al usuario después de guardar la contraseña. El flujo de
  // reset se armó para el login de plataforma (staff → /dashboard), pero
  // también lo usan clientes que entran por el modal del sitio público: un
  // customer no tiene nada que hacer en /dashboard, va a la home pública
  // de su organización (/<slug>). Cualquier otro rol (admin, agente,
  // owner, vet…) es staff → /dashboard, como hasta ahora.
  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role, org_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  let homeHref = "/dashboard";
  if (membership?.role === "customer" && membership.org_id) {
    const { data: org } = await supabase
      .from("loyalty_organizations")
      .select("slug")
      .eq("id", membership.org_id)
      .maybeSingle();
    if (org?.slug) {
      // Si el usuario entró por el dominio propio de SU org
      // (kapusta.com.ar), el middleware ya sirve /<slug> desde la raíz y
      // oculta el slug de la barra — mandarlo a "/" para no volver a
      // mostrarlo. Si entró por go-loyalty.vercel.app (o cualquier otro
      // host), el slug sí hace falta en la ruta. Misma resolución de host
      // que el middleware (slugForHost).
      const h = headers();
      const currentSlug = slugForHost(h.get("host"), h.get("x-forwarded-host"));
      homeHref = currentSlug === org.slug ? "/" : `/${org.slug}`;
    }
  }

  return (
    <AuthShell title="Nueva contraseña" description="Elegí la contraseña con la que vas a entrar de ahora en más.">
      <ResetPasswordForm homeHref={homeHref} />
    </AuthShell>
  );
}
