import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantOrg, getTenantUser, getProductDetail, getProductCategories } from "../../data";
import { ProductImageCarousel } from "../../product-image-carousel";
import { ProductDetailActions } from "../../product-detail-actions";
import { PropertyVisitBooking } from "../../property-visit-booking";
import { PropertyReservationButton } from "../../property-reservation-button";
import { LoginForm } from "../../login-form";
import { DomusChatWidget } from "../../domus-chat-widget";
import { formatPrice } from "@/lib/utils";
import { findRootAncestor } from "@/lib/category-tree";
import { getProductReservationState } from "../../domus-reservations-data";

// Fase Requisitos (Domus): mismo criterio que DOMUS_CURRENCY_BY_ROOT_NAME
// en dashboard/catalogo/product-form.tsx — el tipo de operación de una
// propiedad se infiere de su categoría raíz ("Venta"/"Alquiler"), no es
// una columna propia de `products`. Solo se consulta para orgSlug ===
// 'domus', ninguna otra org nombra así a sus categorías raíz.
const DOMUS_OPERATION_BY_ROOT_NAME: Record<string, "venta" | "alquiler"> = {
  Venta: "venta",
  Alquiler: "alquiler",
};

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

  // Fase 1 Domus: "Solicitar visita" solo para esta org — ver mismo
  // patrón orgSlug === "domus" que ProductDetailActions/CartPanel más
  // abajo. getTenantUser() está cache()-ado (ver data.ts), así que no
  // duplica la llamada que ya hace layout.tsx en el mismo request.
  const isDomus = params.slug === "domus" || params.slug === "kapusta";
  const user = isDomus ? await getTenantUser() : null;

  // Fase Reservas (Domus): ver Gate 0 — no hay columna de disponibilidad
  // en `products`, domus_property_reservations es la fuente de verdad.
  // hasActiveReservation oculta "Reservar" (pendiente o confirmada);
  // isConfirmedReservation recién muestra el badge público "Reservada"
  // una vez que el agente la confirmó (ver domus-reservations-data.ts).
  const { hasActiveReservation, isConfirmed: isConfirmedReservation } = isDomus
    ? await getProductReservationState(product.id)
    : { hasActiveReservation: false, isConfirmed: false };

  const primary = org.primary_color ?? "#f59e0b";
  const images = [...product.images].sort((a, b) => a.display_order - b.display_order);
  const specsEntries = product.specs ? Object.entries(product.specs) : [];

  // Fase Requisitos (Domus): "Requisitos" reemplaza al botón "Consultar
  // por WhatsApp" en ProductDetailActions (ya redundante con el botón
  // flotante de WhatsApp, ver WhatsAppButton en layout.tsx — mismo
  // destino/número). Se resuelve acá, no en el componente cliente, para
  // no tener que mandarle categorías/mapeos — solo el texto ya elegido.
  let requirementsText: string | null = null;
  if (isDomus && product.category_id) {
    const categories = await getProductCategories(org.id);
    const root = findRootAncestor(categories, product.category_id);
    const operationType = root ? DOMUS_OPERATION_BY_ROOT_NAME[root.name] : undefined;
    requirementsText =
      operationType === "venta"
        ? org.purchase_requirements_text
        : operationType === "alquiler"
        ? org.rental_requirements_text
        : null;
  }

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
          {formatPrice(product.price, product.currency)}
        </p>
        {/* Fase Reservas (Domus): mismo criterio que el badge de la
            grilla (product-catalog.tsx) — acá siempre en la ficha
            completa, no solo la card. Solo una vez CONFIRMADA. */}
        {isConfirmedReservation && (
          <span className="inline-block text-xs font-semibold uppercase tracking-wide text-white bg-stone-900/80 px-2.5 py-1 rounded-full">
            Reservada
          </span>
        )}
      </div>

      {product.description && (
        <p className="text-sm text-stone-600 whitespace-pre-wrap">{product.description}</p>
      )}

      <ProductDetailActions
        productId={product.id}
        productName={product.name}
        price={product.price}
        // Fase video: miniatura del carrito, se salta un video si quedó
        // primero en la galería (el carrusel de arriba sí recibe `images`
        // completo, con video incluido).
        imageUrl={images.find((img) => img.media_type !== "video")?.image_url ?? null}
        primaryColor={primary}
        whatsappNumber={org.whatsapp_number}
        orgSlug={params.slug}
        requirementsText={requirementsText}
      />

      {/* Fase Reservas (Domus): mismo gate de login que Visitas/Consultas
          — un solo bloque para las dos acciones (antes solo estaba acá
          Visitas), no dos prompts de login separados. "Reservar"
          desaparece mientras la propiedad esté reservada; "Solicitar
          visita" no se ve afectado por el estado de reserva. */}
      {isDomus &&
        (user ? (
          <>
            {!hasActiveReservation && (
              <PropertyReservationButton
                slug={params.slug}
                orgId={org.id}
                productId={product.id}
                primaryColor={primary}
              />
            )}
            <PropertyVisitBooking
              slug={params.slug}
              orgId={org.id}
              productId={product.id}
              primaryColor={primary}
            />
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-stone-600 text-center">
              {hasActiveReservation
                ? "Iniciá sesión para solicitar una visita."
                : "Iniciá sesión para reservar o solicitar una visita."}
            </p>
            <LoginForm primaryColor={primary} orgId={org.id} />
          </div>
        ))}

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

      {/* Fase chatbot Domus: mismo widget que la home, reusado tal cual
          (contexto server-side con TODAS las propiedades activas, no
          solo esta) — no hace falta ninguna lógica específica de ficha. */}
      {isDomus && (
        <DomusChatWidget slug={params.slug} orgId={org.id} whatsappNumber={org.whatsapp_number} />
      )}
    </div>
  );
}
