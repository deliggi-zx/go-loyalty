"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronUp, ChevronDown, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addProductImage, updateProductImageOrder, deleteProductImage } from "./actions";

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductImagesManagerProps {
  orgId: string;
  productId: string;
  images: ProductImage[];
}

export function ProductImagesManager({
  orgId,
  productId,
  images: initialImages,
}: ProductImagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    let nextOrder =
      images.length > 0 ? Math.max(...images.map((i) => i.display_order)) + 1 : 0;

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de 5 MB y no se subió.`);
        continue;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `products/${orgId}/${productId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setError(`Error al subir "${file.name}": ${uploadError.message}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      const inserted = await addProductImage(productId, publicUrl, nextOrder);
      nextOrder += 1;
      setImages((prev) => [...prev, inserted]);
    }

    setUploading(false);
    e.target.value = "";
  }

  function moveItem(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const updated = [...images];
    const temp = updated[index].display_order;
    updated[index].display_order = updated[targetIndex].display_order;
    updated[targetIndex].display_order = temp;
    updated.sort((a, b) => a.display_order - b.display_order);

    setImages(updated);

    startTransition(async () => {
      await updateProductImageOrder(
        updated.map((i) => ({ id: i.id, display_order: i.display_order })),
        productId
      );
    });
  }

  function handleDelete(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteProductImage(id, productId);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Imágenes
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          La primera imagen (arriba) es la que se muestra como principal. Máx. 5 MB por imagen.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {images.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {images.map((img, index) => (
            <div key={img.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-stone-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="flex-1 text-sm text-stone-400">
                Imagen {index + 1}
                {index === 0 && (
                  <span className="ml-1.5 text-amber-600 font-medium">(principal)</span>
                )}
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
                  disabled={index === images.length - 1 || isPending}
                  className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => handleDelete(img.id)}
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
          No hay imágenes todavía.
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-medium text-stone-600">Agregar imágenes</p>
        <label
          className={`flex items-center gap-2 text-sm font-medium text-white rounded-lg px-4 py-2.5 cursor-pointer w-fit transition-colors
            ${uploading ? "bg-stone-300 pointer-events-none" : "bg-amber-500 hover:bg-amber-600"}`}
        >
          <ImagePlus className="w-4 h-4" />
          {uploading ? "Subiendo..." : "Seleccionar imágenes"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>
    </section>
  );
}
