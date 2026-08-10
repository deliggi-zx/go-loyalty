import { notFound, redirect } from "next/navigation";
import { getTenantOrg, getTenantUser } from "../data";
import { EntrarForm } from "./entrar-form";

// Atajo temporal de login (bloqueo urgente Corner) — ruta directa /[slug]/
// entrar, sin depender de ningún trigger de la home/perfil. Genérica por
// slug (no hardcodeada a Corner) para no arriesgar nada de otras orgs;
// hoy solo Corner la necesita porque su home bespoke no tiene login
// visible sin sesión (ver PASO 2 del mismo pedido para el fix real).
export default async function EntrarPage({
  params,
}: {
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return notFound();

  const user = await getTenantUser();
  if (user) redirect(`/${params.slug}`);

  return (
    <main className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-[#9b9995]">{org.name}</p>
          <h1 className="text-lg font-semibold text-white mt-0.5">Iniciar sesión</h1>
        </div>
        <EntrarForm slug={params.slug} />
      </div>
    </main>
  );
}
