import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantOrg } from "../data";
import { getKapustaCalcOptions } from "../kapusta-calculadoras-actions";
import { KapustaCalculadoras } from "../kapusta-calculadoras";

// Calculadoras inmobiliarias — SOLO Kapusta (slug "kapusta"). Cualquier
// otro slug cae en notFound(): la ruta vive bajo [slug] por la estructura
// del proyecto, pero no se habilita para Domus, Inmo Básica/360 ni ninguna
// otra org. Misma mecánica de scoping por slug directo que el resto de las
// features de esta vertical (ver isDomus/isBike en page.tsx).
export default async function CalculadorasPage({ params }: { params: { slug: string } }) {
  if (params.slug !== "kapusta") notFound();

  const org = await getTenantOrg(params.slug);
  if (!org) notFound();

  // Tipos de propiedad (categorías hoja) y barrios reales del catálogo —
  // la calc de tasación se apoya en el stock propio, así que las opciones
  // salen de la base. Mismo helper que usa el modal del botón flotante.
  const { tipos, zonas } = await getKapustaCalcOptions();

  const primary = org.primary_color ?? "#005F77";
  const secondary = org.secondary_color ?? "#0180AB";
  const accent = org.accent_color ?? secondary;
  const background = org.background_color ?? "#69BDE1";

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-12">
      <Link
        href={`/${params.slug}`}
        className="inline-block text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        ‹ Volver
      </Link>

      <KapustaCalculadoras
        tipos={tipos}
        zonas={zonas}
        primaryColor={primary}
        secondaryColor={secondary}
        accentColor={accent}
        backgroundColor={background}
      />
    </div>
  );
}
