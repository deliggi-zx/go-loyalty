"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, GalleryHorizontal, Image as ImageIcon } from "lucide-react";
import { updateHomeBlockOrder } from "../actions";

export interface HomeBlockRow {
  id: string;
  display_order: number;
  block_type: "carousel" | "promo";
  label: string;
  imageUrl: string | null;
}

// Fase intercalado: acá se reordenan carruseles y promos MEZCLADOS en una
// sola lista (catalog_home_blocks.display_order) — esta es la secuencia
// real que se ve en la home cuando la org adoptó el mecanismo. A
// diferencia de CarouselManager de más abajo, esta lista es solo de
// orden: crear/borrar carruseles sigue en la sección "Carruseles de la
// home"; subir/borrar promos sigue en Configuración → Promos. Un
// carrusel nuevo se agrega solo acá al crearse; una promo nueva se agrega
// sola si la org ya tiene algo en esta lista (si está vacía, la promo
// sigue el comportamiento de siempre, sin entrar acá).
export function HomeBlocksManager({ items: initialItems }: { items: HomeBlockRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);

  function moveItem(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index].display_order;
    updated[index].display_order = updated[targetIndex].display_order;
    updated[targetIndex].display_order = temp;
    updated.sort((a, b) => a.display_order - b.display_order);

    setItems(updated);

    startTransition(async () => {
      await updateHomeBlockOrder(
        updated.map((i) => ({ id: i.id, display_order: i.display_order }))
      );
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Orden de la Home
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Carruseles y promos mezclados, en el orden exacto en que aparecen en la home. Subí o
          bajá cualquier bloque para intercalarlos como quieras — no hace falta agruparlos por
          tipo.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-16 h-10 rounded-md overflow-hidden bg-stone-100 shrink-0 flex items-center justify-center text-stone-300">
                {item.block_type === "promo" && item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : item.block_type === "carousel" ? (
                  <GalleryHorizontal className="w-4 h-4" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </div>

              <p className="flex-1 text-sm text-stone-700">
                {item.block_type === "carousel" ? item.label : "Promo"}
                <span className="ml-2 text-xs text-stone-400">
                  {item.block_type === "carousel" ? "carrusel" : "flyer"}
                </span>
              </p>

              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveItem(index, "up")}
                  disabled={index === 0 || isPending}
                  className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveItem(index, "down")}
                  disabled={index === items.length - 1 || isPending}
                  className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          Todavía no hay nada en la secuencia. Se completa sola al crear un carrusel acá abajo
          (arrastra también tus promos existentes si es el primero) o al subir una promo nueva
          desde Configuración.
        </div>
      )}
    </section>
  );
}
