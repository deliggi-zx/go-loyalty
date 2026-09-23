"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToggleLeft, ToggleRight, Pencil, Package, Star, CheckCircle2, X } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { toggleProductActive, toggleProductFeatured } from "./actions";
import type { DisplayPrice } from "@/app/(public)/[slug]/operation-price-utils";

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  currency: string;
  prices: DisplayPrice[];
  active: boolean;
  is_featured: boolean;
  category_id: string | null;
  mainImageUrl: string | null;
}

interface ProductsListProps {
  products: ProductRow[];
  categories: { id: string; name: string }[];
  // Fase catálogo Domus: "Agregar propiedad" en vez de "Nuevo producto"
  // — mismo botón, mismo destino, ya estaba visible de entrada sin
  // gating (nada que abrir antes), solo cambia el texto.
  isDomus?: boolean;
  // Llega en true cuando se aterriza acá desde "Publicar y volver al
  // catálogo" (?published=1, ver back-to-catalog-link.tsx / page.tsx) —
  // pedido de una clienta real (Kapusta, 08/09) que no veía confirmación
  // de que la propiedad recién cargada había quedado guardada. Dispara
  // el aviso de abajo y fuerza el scroll arriba del todo (por las dudas:
  // como es una navegación dura, window ya llega scrolleado a 0, pero el
  // contenedor con overflow-y-auto es un elemento propio, no el body).
  justPublished?: boolean;
}

export function ProductsList({
  products: initialProducts,
  categories,
  isDomus = false,
  justPublished = false,
}: ProductsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState(initialProducts);
  const [categoryFilter, setCategoryFilter] = useState<string>("todos");
  const [showPublishedBanner, setShowPublishedBanner] = useState(justPublished);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!justPublished) return;
    // Contenedor real de scroll de esta pantalla (ver "flex-1
    // overflow-y-auto" en page.tsx) — no es window, así que
    // scrollTo/window.scrollTo no alcanza. closest() desde un elemento
    // de esta misma sección evita agarrar por error el <nav> del
    // sidebar, que usa la misma clase.
    sectionRef.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0 });
    // Saca el ?published=1 de la URL para que un refresh manual no
    // repita el aviso — no dispara re-fetch (mismo path).
    router.replace("/dashboard/catalogo", { scroll: false });
    const timer = setTimeout(() => setShowPublishedBanner(false), 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPublished]);

  function handleToggle(id: string, currentActive: boolean) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
    startTransition(async () => {
      await toggleProductActive(id, !currentActive);
      router.refresh();
    });
  }

  function handleToggleFeatured(id: string, currentFeatured: boolean) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_featured: !p.is_featured } : p))
    );
    startTransition(async () => {
      await toggleProductFeatured(id, !currentFeatured);
      router.refresh();
    });
  }

  const filtered = products.filter((p) => {
    if (categoryFilter === "todos") return true;
    if (categoryFilter === "sin-categoria") return !p.category_id;
    return p.category_id === categoryFilter;
  });

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "Sin categoría";

  return (
    <section ref={sectionRef} className="space-y-4">
      {showPublishedBanner && (
        <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">
              {isDomus ? "Propiedad publicada" : "Producto publicado"} — ya está visible en el catálogo.
            </p>
          </div>
          <button
            onClick={() => setShowPublishedBanner(false)}
            className="text-emerald-600 hover:text-emerald-800 transition-colors shrink-0"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Productos
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {products.length} producto{products.length === 1 ? "" : "s"} en el catálogo
          </p>
        </div>
        <Link
          href="/dashboard/catalogo/productos/nuevo"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isDomus ? "Agregar propiedad" : "Nuevo producto"}
        </Link>
      </div>

      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setCategoryFilter("todos")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            categoryFilter === "todos"
              ? "bg-amber-100 text-amber-700"
              : "text-stone-500 hover:bg-stone-100"
          )}
        >
          Todos ({products.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              categoryFilter === cat.id
                ? "bg-amber-100 text-amber-700"
                : "text-stone-500 hover:bg-stone-100"
            )}
          >
            {cat.name} ({products.filter((p) => p.category_id === cat.id).length})
          </button>
        ))}
        <button
          onClick={() => setCategoryFilter("sin-categoria")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            categoryFilter === "sin-categoria"
              ? "bg-amber-100 text-amber-700"
              : "text-stone-500 hover:bg-stone-100"
          )}
        >
          Sin categoría ({products.filter((p) => !p.category_id).length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-16 text-center text-stone-400 text-sm">
          No hay productos {categoryFilter !== "todos" ? "en esta categoría" : "todavía"}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <div
              key={product.id}
              className={cn(
                "bg-white rounded-xl border overflow-hidden transition-all",
                product.active ? "border-stone-200" : "border-stone-100 opacity-60"
              )}
            >
              <div className="h-32 bg-stone-100">
                {product.mainImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.mainImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-stone-900 text-sm truncate">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {categoryName(product.category_id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleFeatured(product.id, product.is_featured)}
                      disabled={isPending}
                      className="text-stone-300 hover:text-amber-500 transition-colors disabled:opacity-50"
                      title={product.is_featured ? "Quitar de destacados" : "Marcar como destacado"}
                    >
                      <Star
                        className={cn(
                          "w-5 h-5",
                          product.is_featured && "fill-amber-400 text-amber-500"
                        )}
                      />
                    </button>
                    <button
                      onClick={() => handleToggle(product.id, product.active)}
                      disabled={isPending}
                      className="text-stone-400 hover:text-amber-500 transition-colors disabled:opacity-50"
                      title={product.active ? "Desactivar" : "Activar"}
                    >
                      {product.active ? (
                        <ToggleRight className="w-6 h-6 text-amber-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900 tabular-nums">
                    {product.prices
                      .map((p) => `${p.label ? `${p.label}: ` : ""}${formatPrice(p.price, p.currency)}`)
                      .join(" · ")}
                  </span>
                  <Link
                    href={`/dashboard/catalogo/productos/${product.id}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
