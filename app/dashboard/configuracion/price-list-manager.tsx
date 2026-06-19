"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Check, X, Plus } from "lucide-react";
import { addPriceItem, updatePriceItem, deleteContentItem } from "./actions";

interface PriceItem {
  id: string;
  title: string | null;
  price: number | null;
  category: string | null;
}

interface PriceListManagerProps {
  orgId: string;
  items: PriceItem[];
}

interface ItemFormValues {
  title: string;
  price: string;
  category: string;
}

const EMPTY_FORM: ItemFormValues = { title: "", price: "", category: "" };

export function PriceListManager({ items: initialItems }: PriceListManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ItemFormValues>(EMPTY_FORM);
  const [addForm, setAddForm] = useState<ItemFormValues>(EMPTY_FORM);
  const [showAddForm, setShowAddForm] = useState(false);

  // Derive sorted categories
  const categories = Array.from(
    new Set(items.map((i) => i.category ?? "General"))
  ).sort();

  function startEdit(item: PriceItem) {
    setEditingId(item.id);
    setEditForm({
      title: item.title ?? "",
      price: item.price?.toString() ?? "",
      category: item.category ?? "General",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  function handleSaveEdit(id: string) {
    const price = editForm.price ? parseFloat(editForm.price) : null;
    if (!editForm.title.trim()) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              title: editForm.title,
              price,
              category: editForm.category || "General",
            }
          : item
      )
    );
    setEditingId(null);

    startTransition(async () => {
      await updatePriceItem(id, {
        title: editForm.title,
        price,
        category: editForm.category || "General",
      });
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteContentItem(id);
      router.refresh();
    });
  }

  function handleAddItem() {
    if (!addForm.title.trim()) return;
    const price = addForm.price ? parseFloat(addForm.price) : null;

    startTransition(async () => {
      await addPriceItem({
        title: addForm.title,
        price,
        category: addForm.category || "General",
      });
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      router.refresh();
    });
  }

  // Group items by category for display
  const byCategory = items.reduce<Record<string, PriceItem[]>>((acc, item) => {
    const cat = item.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
            Lista de precios
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Los ítems se muestran agrupados por categoría en la página pública
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar ítem
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-800">Nuevo ítem</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nombre del producto"
              value={addForm.title}
              onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
              className="col-span-2 h-9 px-3 text-sm rounded-lg border border-amber-200 bg-white focus:outline-none focus:border-amber-400 transition-colors"
            />
            <input
              placeholder="Precio (ej: 500)"
              type="number"
              min="0"
              step="any"
              value={addForm.price}
              onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
              className="h-9 px-3 text-sm rounded-lg border border-amber-200 bg-white focus:outline-none focus:border-amber-400 transition-colors"
            />
            <input
              placeholder="Categoría (ej: Cafés)"
              value={addForm.category}
              onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
              list="category-suggestions"
              className="h-9 px-3 text-sm rounded-lg border border-amber-200 bg-white focus:outline-none focus:border-amber-400 transition-colors"
            />
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddItem}
              disabled={!addForm.title.trim() || isPending}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); }}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 px-3 py-2 rounded-lg border border-stone-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Item list */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-200 py-10 text-center text-stone-400 text-sm">
          No hay ítems en la lista de precios todavía.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
          {Object.entries(byCategory).map(([category, catItems]) => (
            <div key={category}>
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  {category}
                </p>
              </div>
              {catItems.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  {editingId === item.id ? (
                    /* Inline edit */
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, title: e.target.value }))
                          }
                          placeholder="Nombre"
                          className="col-span-2 h-8 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400"
                        />
                        <input
                          value={editForm.price}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, price: e.target.value }))
                          }
                          type="number"
                          placeholder="Precio"
                          className="h-8 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400"
                        />
                        <input
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, category: e.target.value }))
                          }
                          placeholder="Categoría"
                          list="category-suggestions"
                          className="h-8 px-2.5 text-sm rounded-md border border-stone-200 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={!editForm.title.trim()}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <Check className="w-3 h-3" /> Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-700 px-2.5 py-1 rounded-md border border-stone-200 transition-colors"
                        >
                          <X className="w-3 h-3" /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display row */
                    <div className="flex items-center gap-3">
                      <p className="flex-1 text-sm text-stone-800">{item.title}</p>
                      {item.price != null && (
                        <p className="text-sm font-semibold text-stone-900 tabular-nums shrink-0">
                          ${item.price.toLocaleString("es-AR")}
                        </p>
                      )}
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors rounded-md hover:bg-stone-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="p-1.5 text-stone-300 hover:text-red-500 disabled:opacity-50 transition-colors rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
