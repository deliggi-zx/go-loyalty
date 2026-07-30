"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, deleteProduct } from "./actions";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  active: boolean;
}

interface ProductFormProps {
  categories: CategoryOption[];
  product?: ProductData;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price) || 0,
      category_id: categoryId || null,
      active,
    };

    startTransition(async () => {
      if (product) {
        await updateProduct(product.id, payload);
        router.refresh();
      } else {
        const newId = await createProduct(payload);
        router.push(`/dashboard/catalogo/productos/${newId}`);
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

        <div className="grid grid-cols-2 gap-4">
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
            <label className="text-xs font-medium text-stone-600">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors bg-white"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

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
