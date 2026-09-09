import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantOrg } from "../data";
import { hasFeature } from "@/lib/features";
import { getKapustaCalcOptions } from "../kapusta-calculadoras-actions";
import { KapustaCalculadoras } from "../kapusta-calculadoras";

// Calculadoras inmobiliarias — disponibles para cualquier org de la
// vertical con la feature "calculadoras" (nivel Básica+). El resto de los
// slugs cae en notFound(): la ruta vive bajo [slug] por la estructura del
// proyecto. Ver lib/features.ts.
export default async function CalculadorasPage({ params }: { params: { slug: string } }) {
  const org = await getTenantOrg(params.slug);
  if (!org) notFound();
  if (!hasFeature(org, "calculadoras")) notFound();

  // Tipos de propiedad (categorías hoja) y barrios reales del catálogo —
  // la calc de tasación se apoya en el stock propio, así que las opciones
  // salen de la base. Mismo helper que usa el modal del botón flotante.
  const { tipos, zonas } = await getKapustaCalcOptions(params.slug);

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
        slug={params.slug}
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
