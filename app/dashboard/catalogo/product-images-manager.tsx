"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronUp, ChevronDown, ImagePlus, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addProductImage, updateProductImageOrder, deleteProductImage } from "./actions";

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  // Fase video (Domus): 'image' | 'video' — ver comentario en
  // CatalogImage (app/(public)/[slug]/data.ts) para el porqué de mezclar
  // los dos tipos en la misma tabla/reordenamiento.
  media_type: string;
}

interface ProductImagesManagerProps {
  orgId: string;
  productId: string;
  images: ProductImage[];
  // Fase video: el botón "Subir video" solo se ofrece para Domus (pedido
  // explícito) — mismo patrón de prop opcional que orgSlug en
  // ProductForm. El resto de las orgs sigue viendo únicamente "Seleccionar
  // imágenes", sin cambios.
  orgSlug?: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function ProductImagesManager({
  orgId,
  productId,
  images: initialImages,
  orgSlug,
}: ProductImagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const isDomus = orgSlug === "domus";
  const hasVideo = images.some((i) => i.media_type === "video");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    let nextOrder =
      images.length > 0 ? Math.max(...images.map((i) => i.display_order)) + 1 : 0;

    for (const file of Array.from(files)) {
      if (file.size > MAX_IMAGE_BYTES) {
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

  // Fase video: mismo bucket ("product-images", no uno nuevo) que las
  // fotos, mismo patrón de path que product-offer-form.tsx (Fase 3) —
  // sube directo desde el browser, después persiste con el mismo
  // addProductImage (media_type='video'). Sin compresión (pedido
  // explícito, queda para más adelante); el único tope es el tamaño de
  // archivo. Un solo video por producto: el input queda deshabilitado si
  // ya hay uno (hasVideo) — borrar el existente libera el cupo.
  async function handleUploadVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_VIDEO_BYTES) {
      setError(`"${file.name}" supera el límite de 50 MB y no se subió.`);
      return;
    }

    setUploadingVideo(true);
    setError(null);

    const nextOrder =
      images.length > 0 ? Math.max(...images.map((i) => i.display_order)) + 1 : 0;

    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `products/${orgId}/${productId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true, contentType: file.type || "video/mp4" });

    if (uploadError) {
      setError(`Error al subir "${file.name}": ${uploadError.message}`);
      setUploadingVideo(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    const inserted = await addProductImage(productId, publicUrl, nextOrder, "video");
    setImages((prev) => [...prev, inserted]);
    setUploadingVideo(false);
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
                {img.media_type === "video" ? (
                  <video src={img.image_url} muted playsInline className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <p className="flex-1 text-sm text-stone-400">
                {img.media_type === "video" ? "Video" : `Imagen ${index + 1}`}
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

      {/* Fase video: solo Domus (pedido explícito) — un video corto por
          producto, mezclado en la misma galería de arriba (ver
          media_type en la lista y en ProductImageCarousel del lado
          público). El input queda deshabilitado si ya hay uno cargado;
          borrarlo de la lista de arriba libera el cupo. */}
      {isDomus && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-stone-600">Agregar video</p>
            <p className="text-xs text-stone-400 mt-0.5">
              Un video corto por propiedad, mp4. Máx. 50 MB.
              {hasVideo && " Ya hay uno cargado — borralo de la lista de arriba para reemplazarlo."}
            </p>
          </div>
          <label
            className={`flex items-center gap-2 text-sm font-medium text-white rounded-lg px-4 py-2.5 w-fit transition-colors
              ${
                uploadingVideo || hasVideo
                  ? "bg-stone-300 pointer-events-none"
                  : "bg-amber-500 hover:bg-amber-600 cursor-pointer"
              }`}
          >
            <Video className="w-4 h-4" />
            {uploadingVideo ? "Subiendo..." : hasVideo ? "Video ya cargado" : "Seleccionar video"}
            <input
              type="file"
              accept="video/mp4"
              className="sr-only"
              onChange={handleUploadVideo}
              disabled={uploadingVideo || hasVideo}
            />
          </label>
        </div>
      )}
    </section>
  );
}
