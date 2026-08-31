import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getProductCategories } from "../data";
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

  // Tipos de propiedad reales del catálogo (categorías hoja) y barrios
  // reales cargados — la calc de tasación se apoya en el stock propio, así
  // que las opciones salen de la base, no de una lista fija.
  const supabase = createClient();
  const [categories, { data: productsData }] = await Promise.all([
    getProductCategories(org.id),
    supabase.from("products").select("specs").eq("org_id", org.id).eq("active", true),
  ]);

  const tipos = Array.from(
    new Set(categories.filter((c) => c.parent_id).map((c) => c.name))
  ).sort((a, b) => a.localeCompare(b, "es"));

  const zonas = Array.from(
    new Set(
      (productsData ?? [])
        .map((p) => {
          const barrio = (p.specs as Record<string, unknown> | null)?.["barrio"];
          return typeof barrio === "string" && barrio.trim() ? barrio.trim() : null;
        })
        .filter((z): z is string => !!z)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

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
