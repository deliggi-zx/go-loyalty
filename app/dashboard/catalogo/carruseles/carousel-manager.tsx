"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import {
  createCarousel,
  updateCarouselTitle,
  updateCarouselOrder,
  toggleCarouselActive,
  deleteCarousel,
} from "../actions";

export interface CarouselRow {
  id: string;
  title: string;
  display_order: number;
  active: boolean;
}

// Mismo patrón visual/de interacción que category-manager.tsx (crear +
// reordenar + renombrar + borrar), sumando el toggle activo/inactivo que
// ahí no hace falta. Esta es la pantalla que reemplaza la idea de "una
// estrellita fija": el título y la existencia de cada carrusel los define
// Die acá, no quedan hardcodeados en ningún componente.
export function CarouselManager({ carousels: initialCarousels }: { carousels: CarouselRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [carousels, setCarousels] = useState(initialCarousels);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    startTransition(async () => {
      await createCarousel(title);
      router.refresh();
    });
  }

  function startEdit(c: CarouselRow) {
    setEditingId(c.id);
    setEditTitle(c.title);
  }

  function handleSaveEdit(id: string) {
    const title = editTitle.trim();
    if (!title) return;

    setCarousels((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    setEditingId(null);

    startTransition(async () => {
      await updateCarouselTitle(id, title);
      router.refresh();
    });
  }

  function moveItem(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= carousels.length) return;

    const updated = [...carousels];
    const temp = updated[index].display_order;
    updated[index].display_order = updated[targetIndex].display_order;
    updated[targetIndex].display_order = temp;
    updated.sort((a, b) => a.display_order - b.display_order);

    setCarousels(updated);

    startTransition(async () => {
      await updateCarouselOrder(
        updated.map((c) => ({ id: c.id, display_order: c.display_order }))
      );
    });
  }

  function handleToggleActive(id: string, currentActive: boolean) {
    setCarousels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
    startTransition(async () => {
      await toggleCarouselActive(id, !currentActive);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Borrar este carrusel? Los productos asignados dejan de mostrarse ahí, pero no se borran del catálogo.")) return;
    setCarousels((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      await deleteCarousel(id);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Carruseles de la home
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Creá los estantes de producto que se muestran en la home, arriba del carrusel principal.
          El título es libre y editable en cualquier momento. Asigná productos a cada uno desde la
          ficha de cada producto.
        </p>
      </div>

      {carousels.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {carousels.map((c, index) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === c.id ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(c.id)}
                    autoFocus
                    className="flex-1 h-8 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleSaveEdit(c.id)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <p className={`flex-1 text-sm ${c.active ? "text-stone-800" : "text-stone-400"}`}>
                    {c.title}
                    {!c.active && <span className="ml-2 text-xs">(inactivo)</span>}
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
                      disabled={index === carousels.length - 1 || isPending}
                      className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleToggleActive(c.id, c.active)}
                    disabled={isPending}
                    className="text-stone-400 hover:text-amber-500 transition-colors disabled:opacity-50"
                    title={c.active ? "Desactivar" : "Activar"}
                  >
                    {c.active ? (
                      <ToggleRight className="w-6 h-6 text-amber-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(c)}
                    className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors rounded-md hover:bg-stone-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="p-1.5 text-stone-300 hover:text-red-500 disabled:opacity-50 transition-colors rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          No hay carruseles todavía.
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder='Título del carrusel (ej. "Destacados")'
          className="flex-1 h-9 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
        />
        <button
          onClick={handleCreate}
          disabled={!newTitle.trim() || isPending}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Crear carrusel
        </button>
      </div>
    </section>
  );
}
