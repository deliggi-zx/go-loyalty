"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  Plus,
  Minus,
  ToggleLeft,
  ToggleRight,
  Play,
  Repeat,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  createCarousel,
  updateCarouselTitle,
  updateCarouselOrder,
  toggleCarouselActive,
  toggleCarouselAutoplay,
  toggleCarouselLoop,
  updateCarouselSpeed,
  toggleCarouselDirection,
  deleteCarousel,
} from "../actions";
import { CAROUSEL_SPEED_MIN_MS, CAROUSEL_SPEED_MAX_MS } from "../carousel-constants";

export interface CarouselRow {
  id: string;
  title: string;
  display_order: number;
  active: boolean;
  autoplay: boolean;
  // Fase Ecualizador de carruseles — ver Gate 0 en product-rail.tsx para
  // el criterio exacto de cada uno.
  loop_infinite: boolean;
  autoplay_speed_ms: number;
  direction: "forward" | "reverse";
}

// Paso de +/- para el control de velocidad — simple a propósito (pedido
// explícito "lo que sea más simple de construir bien"), no un slider con
// estado de arrastre.
const SPEED_STEP_MS = 500;

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

  function handleToggleAutoplay(id: string, currentAutoplay: boolean) {
    setCarousels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, autoplay: !c.autoplay } : c))
    );
    startTransition(async () => {
      await toggleCarouselAutoplay(id, !currentAutoplay);
      router.refresh();
    });
  }

  function handleToggleLoop(id: string, currentLoop: boolean) {
    setCarousels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, loop_infinite: !c.loop_infinite } : c))
    );
    startTransition(async () => {
      await toggleCarouselLoop(id, !currentLoop);
      router.refresh();
    });
  }

  function handleSpeedChange(id: string, currentSpeed: number, delta: number) {
    const next = Math.min(Math.max(currentSpeed + delta, CAROUSEL_SPEED_MIN_MS), CAROUSEL_SPEED_MAX_MS);
    if (next === currentSpeed) return;
    setCarousels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, autoplay_speed_ms: next } : c))
    );
    startTransition(async () => {
      await updateCarouselSpeed(id, next);
      router.refresh();
    });
  }

  function handleToggleDirection(id: string, currentDirection: CarouselRow["direction"]) {
    const next = currentDirection === "forward" ? "reverse" : "forward";
    setCarousels((prev) => prev.map((c) => (c.id === id ? { ...c, direction: next } : c)));
    startTransition(async () => {
      await toggleCarouselDirection(id, next);
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
            <div key={c.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
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
                      onClick={() => handleToggleAutoplay(c.id, c.autoplay)}
                      disabled={isPending}
                      className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                        c.autoplay
                          ? "text-sky-600 bg-sky-50 hover:bg-sky-100"
                          : "text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                      }`}
                      title={c.autoplay ? "Autoplay activado (se desliza solo)" : "Autoplay desactivado (deslizamiento manual)"}
                    >
                      <Play className="w-3.5 h-3.5" fill={c.autoplay ? "currentColor" : "none"} />
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

              {/* Fase Ecualizador de carruseles: solo tienen efecto visible
                  cuando el autoplay de arriba está prendido (loop/
                  velocidad/dirección los usa advance() en product-rail.tsx,
                  que solo corre con el timer activo) — igual quedan
                  configurables siempre, no ocultos, para no obligar a
                  prender/apagar autoplay para poder ajustarlos. */}
              {editingId !== c.id && (
                <div
                  className={`flex items-center gap-3 flex-wrap pl-1 text-xs ${
                    c.autoplay ? "text-stone-500" : "text-stone-300"
                  }`}
                >
                  <span className="font-medium uppercase tracking-wide text-[10px]">Ecualizador</span>

                  <button
                    onClick={() => handleToggleLoop(c.id, c.loop_infinite)}
                    disabled={isPending}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors disabled:opacity-50 ${
                      c.loop_infinite
                        ? "text-violet-600 bg-violet-50 hover:bg-violet-100"
                        : "hover:bg-stone-100"
                    }`}
                    title={
                      c.loop_infinite
                        ? "Loop infinito activado (vuelta invisible al principio)"
                        : "Loop infinito desactivado (salto directo al principio)"
                    }
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    Loop
                  </button>

                  <div className="flex items-center gap-1 px-2 py-1">
                    <button
                      onClick={() => handleSpeedChange(c.id, c.autoplay_speed_ms, SPEED_STEP_MS)}
                      disabled={isPending || c.autoplay_speed_ms >= CAROUSEL_SPEED_MAX_MS}
                      title="Más lento"
                      className="p-0.5 hover:text-stone-800 disabled:opacity-30 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center tabular-nums">
                      {(c.autoplay_speed_ms / 1000).toFixed(1)}s
                    </span>
                    <button
                      onClick={() => handleSpeedChange(c.id, c.autoplay_speed_ms, -SPEED_STEP_MS)}
                      disabled={isPending || c.autoplay_speed_ms <= CAROUSEL_SPEED_MIN_MS}
                      title="Más rápido"
                      className="p-0.5 hover:text-stone-800 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleDirection(c.id, c.direction)}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors disabled:opacity-50"
                    title={
                      c.direction === "reverse"
                        ? "Sentido invertido (tocá para volver al normal)"
                        : "Sentido normal (tocá para invertir)"
                    }
                  >
                    {c.direction === "reverse" ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    {c.direction === "reverse" ? "Invertido" : "Normal"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          No hay carruseles todavía.
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
          className="shrink-0 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Crear carrusel
        </button>
      </div>
    </section>
  );
}
