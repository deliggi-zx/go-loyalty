"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, deleteProduct } from "./actions";

interface CategoryOption {
  id: string;
  name: string;
  // Fase árbol: antes el dropdown era plano (solo id/name). Con el
  // tercer nivel bajo "Soportes y accesorios"/"Audio y Sonido" hacía
  // falta reflejar la jerarquía para no mezclar todo sin indicación de
  // qué es hijo de qué — ver buildCategoryOptions más abajo.
  parent_id: string | null;
}

// Ordena las categorías como padre-seguido-de-sus-hijos (recursivo, cada
// nivel por su propio orden de llegada) y devuelve la profundidad de
// cada una para indentar el <option> — mismo criterio de "indent simple,
// no árbol visual" que category-manager.tsx. Sin límite de profundidad.
function buildCategoryOptions(categories: CategoryOption[]): { cat: CategoryOption; depth: number }[] {
  const byParent = new Map<string | null, CategoryOption[]>();
  for (const cat of categories) {
    const siblings = byParent.get(cat.parent_id) ?? [];
    siblings.push(cat);
    byParent.set(cat.parent_id, siblings);
  }

  const result: { cat: CategoryOption; depth: number }[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const cat of byParent.get(parentId) ?? []) {
      result.push({ cat, depth });
      walk(cat.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  // Fase moneda: 'ARS' | 'USD' (columna con default 'ARS', ver migración
  // add_currency_to_products). Genérico para cualquier org — el selector
  // de abajo está siempre disponible, no solo para Domus.
  currency: string;
  category_id: string | null;
  active: boolean;
  // Fase 3 SuperElectro: columnas ya existentes desde la Fase 1a (brand
  // se adelantó para el filtro de "TV por marca"), pero sin input en este
  // form todavía — sin esto no había forma de cargarlas salvo por SQL.
  // Genérico, cualquier org puede usarlas o dejarlas en null.
  brand: string | null;
  screen_size_inches: number | null;
  // Fase Home (sistema de carruseles configurables): tres campos 100%
  // cosméticos, sin ningún cálculo real detrás (sin motor de cuotas, sin
  // lógica de envío) — se muestran en el product-rail público solo si
  // están cargados. Genérico, cualquier org con catalog_type='products'.
  compare_at_price: number | null;
  installments_text: string | null;
  shipping_badge_text: string | null;
  // Fase operación dual (vertical inmobiliaria): ver migración
  // add_dual_operation_columns_to_products. Solo se leen/muestran cuando
  // isRealEstate — el resto de las orgs sigue con precio/moneda único.
  sale_active: boolean;
  sale_price: number | null;
  sale_currency: string | null;
  rental_active: boolean;
  rental_price: number | null;
  rental_currency: string | null;
}

interface ProductFormProps {
  categories: CategoryOption[];
  product?: ProductData;
  // Vertical inmobiliaria (feature "catalogo_propiedades"): default de
  // moneda por categoría raíz (Venta→USD, Alquiler→ARS) y se ocultan los
  // campos de e-commerce (precio tachado, cuotas, badge de envío). El
  // resto del form es genérico y no lee esta prop.
  isRealEstate?: boolean;
}

export function ProductForm({ categories, product, isRealEstate = false }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(product?.currency ?? "ARS");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [screenSizeInches, setScreenSizeInches] = useState(
    product?.screen_size_inches?.toString() ?? ""
  );
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compare_at_price?.toString() ?? ""
  );
  const [installmentsText, setInstallmentsText] = useState(product?.installments_text ?? "");
  const [shippingBadgeText, setShippingBadgeText] = useState(product?.shipping_badge_text ?? "");
  // Fase operación dual (vertical inmobiliaria): dos secciones
  // independientes en vez del precio/moneda único de arriba — ver
  // ProductData.sale_*/rental_* y migración
  // add_dual_operation_columns_to_products. Un producto nuevo arranca con
  // "En venta" prendida y "En alquiler" apagada (mismo default que tenía
  // antes la categoría "Venta" con USD); el agente puede prender las dos.
  const [saleActive, setSaleActive] = useState(product?.sale_active ?? true);
  const [salePrice, setSalePrice] = useState(product?.sale_price?.toString() ?? "");
  const [saleCurrency, setSaleCurrency] = useState(product?.sale_currency ?? "USD");
  const [rentalActive, setRentalActive] = useState(product?.rental_active ?? false);
  const [rentalPrice, setRentalPrice] = useState(product?.rental_price?.toString() ?? "");
  const [rentalCurrency, setRentalCurrency] = useState(product?.rental_currency ?? "ARS");
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  function handleSave() {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (isRealEstate && !saleActive && !rentalActive) {
      setError("Tiene que estar activa al menos \"En venta\" o \"En alquiler\"");
      return;
    }
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price) || 0,
      currency,
      category_id: categoryId || null,
      active,
      brand: brand.trim() || null,
      screen_size_inches: screenSizeInches.trim() ? parseFloat(screenSizeInches) : null,
      compare_at_price: compareAtPrice.trim() ? parseFloat(compareAtPrice) : null,
      installments_text: installmentsText.trim() || null,
      shipping_badge_text: shippingBadgeText.trim() || null,
      ...(isRealEstate
        ? {
            sale_active: saleActive,
            sale_price: parseFloat(salePrice) || 0,
            sale_currency: saleCurrency,
            rental_active: rentalActive,
            rental_price: parseFloat(rentalPrice) || 0,
            rental_currency: rentalCurrency,
          }
        : {}),
    };

    startTransition(async () => {
      if (product) {
        await updateProduct(product.id, payload);
        router.refresh();
      } else {
        const newId = await createProduct(payload);
        // ?nuevo=1: la página de edición usa esto para mostrar la barra
        // "Publicar y volver al catálogo" — ver back-to-catalog-link.tsx.
        // Sin esto no había forma de distinguir "recién creado, todavía
        // cargando fotos" de "editando un producto viejo".
        router.push(`/dashboard/catalogo/productos/${newId}?nuevo=1`);
      }
    });
  }

  function handleDelete() {
    if (!product) return;
    if (!confirm("¿Borrar este producto? También se eliminan sus imágenes.")) return;
    startTransition(async () => {
      await deleteProduct(product.id);
      router.push("/dashboard/catalogo");
    });
  }

  return (
    <section className="space-y-4 max-w-xl">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
        </div>

        {isRealEstate ? (
          // Fase operación dual: "En venta"/"En alquiler" independientes,
          // cada una con su switch + precio + moneda — reemplaza el bloque
          // único de precio/moneda de abajo (ver ProductInput.sale_*/
          // rental_* en actions.ts).
          <div className="space-y-3">
            {(
              [
                {
                  key: "sale" as const,
                  label: "En venta",
                  active: saleActive,
                  setActive: setSaleActive,
                  price: salePrice,
                  setPrice: setSalePrice,
                  currency: saleCurrency,
                  setCurrency: setSaleCurrency,
                },
                {
                  key: "rental" as const,
                  label: "En alquiler",
                  active: rentalActive,
                  setActive: setRentalActive,
                  price: rentalPrice,
                  setPrice: setRentalPrice,
                  currency: rentalCurrency,
                  setCurrency: setRentalCurrency,
                },
              ]
            ).map((op) => (
              <div key={op.key} className="rounded-lg border border-stone-200 p-3 space-y-2.5">
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={op.active}
                    onChange={(e) => op.setActive(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
                  />
                  {op.label}
                </label>
                <div className="grid grid-cols-[1fr_92px] gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Precio</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!op.active}
                      value={op.price}
                      onChange={(e) => op.setPrice(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50 disabled:bg-stone-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-stone-600">Moneda</label>
                    <select
                      value={op.currency}
                      disabled={!op.active}
                      onChange={(e) => op.setCurrency(e.target.value)}
                      className="w-full h-10 px-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors bg-white disabled:opacity-50 disabled:bg-stone-50"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_92px] gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Precio</label>
              <input
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors bg-white"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600">Categoría</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors bg-white"
          >
            <option value="">Sin categoría</option>
            {categoryOptions.map(({ cat, depth }) => (
              <option key={cat.id} value={cat.id}>
                {"—".repeat(depth)} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fase campos Domus: Marca y Tamaño de pantalla no tienen
            sentido conceptual en una vertical inmobiliaria — mismo
            criterio de slug directo (no catalog_type) que ya usa "Texto
            de cuotas" más abajo. SuperElectro y el resto siguen viendo
            estos dos campos exactamente igual que antes. */}
        {!isRealEstate && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Marca</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Opcional"
                className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">
                Tamaño de pantalla (pulgadas)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={screenSizeInches}
                onChange={(e) => setScreenSizeInches(e.target.value)}
                placeholder="Solo para TVs/monitores"
                className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Fase Home: tres campos cosméticos para las cards del
            product-rail — sin lógica real detrás (ver comentario en
            ProductData más arriba). Viven acá junto al resto de los
            campos "core" del producto porque se guardan con el mismo
            botón "Guardar cambios" (a diferencia de specs/imágenes/
            carruseles, que tienen su propia sección con guardado
            independiente más abajo en la página de edición).
            Fase campos Domus: "Precio de lista" (tachado tipo oferta) y
            "Texto de cuotas" tampoco tienen sentido acá — se oculta el
            grid entero para Domus en vez de dejar una columna vacía. */}
        {!isRealEstate && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Precio de lista</label>
              <input
                type="number"
                min="0"
                step="any"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="Opcional — se tacha si es mayor al precio"
                className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600">Texto de cuotas</label>
              <input
                value={installmentsText}
                onChange={(e) => setInstallmentsText(e.target.value)}
                placeholder='Ej. "12 cuotas sin interés"'
                className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Fase campos Domus: "Badge de envío" ("Envío gratis", etc.) no
            aplica a inmuebles. */}
        {!isRealEstate && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600">Badge de envío</label>
            <input
              value={shippingBadgeText}
              onChange={(e) => setShippingBadgeText(e.target.value)}
              placeholder='Ej. "Envío gratis", "Retiralo ya"'
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
          />
          Producto activo
        </label>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
          >
            {isPending ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
          </button>
          {product && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              Borrar producto
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
