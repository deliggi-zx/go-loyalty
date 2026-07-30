"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Plus } from "lucide-react";
import {
  createCategory,
  updateCategoryName,
  updateCategoryOrder,
  deleteCategory,
} from "./actions";

export interface CategoryRow {
  id: string;
  name: string;
  display_order: number;
}

export function CategoryManager({ categories: initialCategories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    startTransition(async () => {
      await createCategory(name);
      router.refresh();
    });
  }

  function startEdit(cat: CategoryRow) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  function handleSaveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;

    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setEditingId(null);

    startTransition(async () => {
      await updateCategoryName(id, name);
      router.refresh();
    });
  }

  function moveItem(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index].display_order;
    updated[index].display_order = updated[targetIndex].display_order;
    updated[targetIndex].display_order = temp;
    updated.sort((a, b) => a.display_order - b.display_order);

    setCategories(updated);

    startTransition(async () => {
      await updateCategoryOrder(
        updated.map((c) => ({ id: c.id, display_order: c.display_order }))
      );
    });
  }

  function handleDelete(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      await deleteCategory(id);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Categorías
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Organizá tus productos en categorías. Borrar una categoría no borra sus productos.
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {categories.map((cat, index) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === cat.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(cat.id)}
                    autoFocus
                    className="flex-1 h-8 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleSaveEdit(cat.id)}
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
                  <p className="flex-1 text-sm text-stone-800">{cat.name}</p>
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
                      disabled={index === categories.length - 1 || isPending}
                      className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors rounded-md hover:bg-stone-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
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
          No hay categorías todavía.
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Nombre de la categoría"
          className="flex-1 h-9 px-3 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || isPending}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>
    </section>
  );
}
