import Link from "next/link";
import { getTenantOrg } from "../data";

// Fase 5 Huellitas, punto 1: reemplaza el placeholder VetComingSoon.
// Muestra org.about_text tal cual (mismo campo que ya cargan Cafetería/
// Bike/etc. desde /dashboard/configuracion, ver GymAboutSection) — acá sin
// el colapso "Leer más" de esa versión: siendo el contenido completo de la
// página (no un bloque más entre otros), no tiene sentido arrancar
// oculto. Público, sin sesión — mismo criterio que Refugio/Perdidos/
// Consejos.
export default async function NosotrosPage({ params }: { params: { slug: string } }) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  return (
    <div className="min-h-screen bg-[#faf6ef] px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <Link
          href={`/${params.slug}`}
          className="inline-block text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ‹ Volver
        </Link>

        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Huellitas</p>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">Nosotros</h1>
        </div>

        {org.about_text ? (
          <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">{org.about_text}</p>
        ) : (
          <p className="text-sm text-stone-400 text-center py-12">
            Todavía no cargaste esta sección — completá &ldquo;Quiénes somos&rdquo; desde{" "}
            /dashboard/configuracion para que aparezca acá.
          </p>
        )}
      </div>
    </div>
  );
}
