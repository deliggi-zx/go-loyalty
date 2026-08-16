import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantOrg, getProductDetail } from "../../data";
import { ProductImageCarousel } from "../../product-image-carousel";
import { ProductDetailActions } from "../../product-detail-actions";

// Ficha de producto individual (Fase 3) — /[slug]/producto/[id]. Mismo
// patrón de ruteo que /[slug]/sede/[locationId] (Gym2): org por slug,
// entidad por id+org_id, notFound() si no existe o no pertenece a esta
// org. Genérica para cualquier org con catalog_type='products', no
// exclusiva de SuperElectro — cualquier producto con specs y/o varias
// fotos cargadas se ve completo acá; sin specs, la tabla simplemente no
// se muestra (no es un estado de error).
export default async function ProductoPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return notFound();

  const product = await getProductDetail(org.id, params.id);
  if (!product) return notFound();

  const primary = org.primary_color ?? "#f59e0b";
  const images = [...product.images].sort((a, b) => a.display_order - b.display_order);
  const specsEntries = product.specs ? Object.entries(product.specs) : [];

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
      <Link
        href={`/${params.slug}/precios`}
        className="inline-block text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        ‹ Volver al catálogo
      </Link>

      <div className="rounded-2xl overflow-hidden border border-stone-200">
        <ProductImageCarousel images={images} alt={product.name} primaryColor={primary} />
      </div>

      <div className="space-y-1">
        {product.brand && (
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            {product.brand}
          </p>
        )}
        <h1 className="text-xl font-semibold text-stone-900">{product.name}</h1>
        <p className="text-2xl font-bold" style={{ color: primary }}>
          ${product.price.toLocaleString("es-AR")}
        </p>
      </div>

      {product.description && (
        <p className="text-sm text-stone-600 whitespace-pre-wrap">{product.description}</p>
      )}

      <ProductDetailActions
        productId={product.id}
        productName={product.name}
        price={product.price}
        imageUrl={images[0]?.image_url ?? null}
        primaryColor={primary}
        whatsappNumber={org.whatsapp_number}
      />

      {specsEntries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Especificaciones
          </h2>
          <div className="rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
            {specsEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                <span className="text-stone-500">{key}</span>
                <span className="text-stone-900 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
