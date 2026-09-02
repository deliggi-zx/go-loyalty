import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLoyaltyPointsSlug } from "@/lib/loyalty/config";
import { getTenantUser } from "../data";
import { LoginForm } from "../login-form";

export const metadata = { title: "Bienvenida" };

// Fase fidelización Kapusta: pantalla a la que apunta el QR impreso.
// - Con sesión → al perfil (ahí ve su saldo de Puntos Kapusta).
// - Sin sesión → formulario de registro bien visible, con el bonus de
//   bienvenida como gancho.
export default async function BienvenidaPage({
  params,
}: {
  params: { slug: string };
}) {
  if (!isLoyaltyPointsSlug(params.slug)) notFound();

  const supabase = createClient();
  const { data: org } = await supabase
    .from("loyalty_organizations")
    .select("id, name, primary_color, signup_bonus_points")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!org) notFound();

  const user = await getTenantUser();
  if (user) redirect(`/${params.slug}/perfil`);

  const primary = org.primary_color ?? "#005F77";
  const bonus = org.signup_bonus_points ?? 0;

  return (
    <main className="px-4 py-10">
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            {org.name}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">
            Registrate y sumá tus primeros Puntos Kapusta
          </h1>
          {bonus > 0 && (
            <p className="text-sm text-stone-500">
              Te damos{" "}
              <span className="font-semibold" style={{ color: primary }}>
                {bonus.toLocaleString("es-AR")} Puntos Kapusta
              </span>{" "}
              de bienvenida por crear tu cuenta.
            </p>
          )}
        </div>

        <LoginForm
          primaryColor={primary}
          variant="card"
          orgId={org.id}
          orgSlug={params.slug}
          defaultMode="register"
        />
      </div>
    </main>
  );
}
