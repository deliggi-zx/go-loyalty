"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronUp, ChevronDown, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addCarouselItem,
  deleteContentItem,
  updateCarouselOrder,
} from "./actions";

interface CarouselItem {
  id: string;
  title: string | null;
  image_url: string | null;
  sort_order: number;
}

interface CarouselManagerProps {
  orgId: string;
  items: CarouselItem[];
}

export function CarouselManager({
  orgId,
  items: initialItems,
}: CarouselManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `carousel/${orgId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("loyalty-content")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(`Error al subir: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("loyalty-content")
      .getPublicUrl(path);

    const maxOrder =
      items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;

    await addCarouselItem(publicUrl, newTitle, maxOrder + 1);
    setNewTitle("");
    setUploading(false);

    // Reset file input
    e.target.value = "";

    router.refresh();
  }

  function moveItem(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index].sort_order;
    updated[index].sort_order = updated[targetIndex].sort_order;
    updated[targetIndex].sort_order = temp;
    updated.sort((a, b) => a.sort_order - b.sort_order);

    setItems(updated);

    startTransition(async () => {
      await updateCarouselOrder(
        updated.map((i) => ({ id: i.id, sort_order: i.sort_order }))
      );
    });
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteContentItem(id);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Carrusel de imágenes
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Las imágenes se muestran en orden en la página pública. Máx. 5 MB por imagen.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Item list */}
      {items.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              {/* Thumbnail */}
              <div className="w-16 h-10 rounded-md overflow-hidden bg-stone-100 shrink-0">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title ?? ""}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Title */}
              <p className="flex-1 text-sm text-stone-700 truncate">
                {item.title ?? (
                  <span className="text-stone-400 italic">Sin título</span>
                )}
              </p>

              {/* Order */}
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

              {/* Delete */}
              <button
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
                className="p-1.5 text-stone-300 hover:text-red-500 disabled:opacity-50 transition-colors rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          No hay imágenes en el carrusel todavía.
        </div>
      )}

      {/* Add new */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-medium text-stone-600">Agregar imagen</p>
        <input
          type="text"
          placeholder="Título opcional"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
        />
        <label
          className={`flex items-center gap-2 text-sm font-medium text-white rounded-lg px-4 py-2.5 cursor-pointer w-fit transition-colors
            ${uploading ? "bg-stone-300 pointer-events-none" : "bg-amber-500 hover:bg-amber-600"}`}
        >
          <ImagePlus className="w-4 h-4" />
          {uploading ? "Subiendo..." : "Seleccionar imagen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </section>
  );
}
