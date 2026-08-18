"use client";

import { useMemo, useState, useTransition } from "react";
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
  // Fase árbol: antes no se pedían (la lista era plana). parent_id arma
  // el árbol acá abajo; leaf_source excluye a "TV por marca"/"TV por
  // pulgadas" del selector de "categoría padre" al crear — son marcadores
  // sintéticos (sus hojas se calculan en el cliente a partir de datos de
  // producto, ver category-drilldown.tsx), no contenedores reales donde
  // tenga sentido colgar una subcategoría de verdad.
  parent_id: string | null;
  leaf_source: string | null;
}

interface TreeNode {
  cat: CategoryRow;
  depth: number;
}

// Aplana el árbol a una lista ordenada (padre, seguido de sus hijos
// recursivamente, cada nivel por su propio display_order) con la
// profundidad de cada fila — evita un componente recursivo separado
// para algo que hoy es una lista con indent, no un árbol visual
// complejo (así lo pidió Die). Sin límite de profundidad: funciona
// igual para 2 niveles que para 3 o más.
function flattenTree(categories: CategoryRow[]): TreeNode[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const cat of categories) {
    const siblings = byParent.get(cat.parent_id) ?? [];
    siblings.push(cat);
    byParent.set(cat.parent_id, siblings);
  }
  byParent.forEach((siblings) => siblings.sort((a, b) => a.display_order - b.display_order));

  const result: TreeNode[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const cat of byParent.get(parentId) ?? []) {
      result.push({ cat, depth });
      walk(cat.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

export function CategoryManager({ categories: initialCategories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const tree = useMemo(() => flattenTree(categories), [categories]);

  // Opciones válidas de "categoría padre" al crear — cualquier categoría
  // salvo las de leaf_source (ver comentario en CategoryRow). Mismo
  // indent que la lista principal para que se entienda de qué rama es
  // cada una.
  const parentOptions = useMemo(
    () => flattenTree(categories).filter((n) => n.cat.leaf_source === null),
    [categories]
  );

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    const parentId = newParentId || null;
    setNewParentId("");
    startTransition(async () => {
      await createCategory(name, parentId);
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

  // Reordena solo contra hermanos (mismo parent_id) — con el árbol a la
  // vista, "subir/bajar" una categoría de otra rama sería confuso.
  // display_order sigue scoped por padre (mismo criterio que ya usan
  // los hijos de "TV y Audio" desde la Fase 1a), así que solo hace falta
  // swapear entre los dos hermanos afectados.
  function moveItem(cat: CategoryRow, direction: "up" | "down") {
    const siblings = categories
      .filter((c) => c.parent_id === cat.parent_id)
      .sort((a, b) => a.display_order - b.display_order);
    const index = siblings.findIndex((c) => c.id === cat.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const a = siblings[index];
    const b = siblings[targetIndex];
    const swapped = [
      { id: a.id, display_order: b.display_order },
      { id: b.id, display_order: a.display_order },
    ];

    setCategories((prev) =>
      prev.map((c) => {
        const found = swapped.find((s) => s.id === c.id);
        return found ? { ...c, display_order: found.display_order } : c;
      })
    );

    startTransition(async () => {
      await updateCategoryOrder(swapped);
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
          Organizá tus productos en categorías. La indentación muestra qué es hija de qué. Borrar
          una categoría no borra sus productos.
        </p>
      </div>

      {tree.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {tree.map(({ cat, depth }) => {
            const siblings = categories.filter((c) => c.parent_id === cat.parent_id);
            const siblingIndex = siblings
              .sort((a, b) => a.display_order - b.display_order)
              .findIndex((c) => c.id === cat.id);
            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ paddingLeft: `${16 + depth * 20}px` }}
              >
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
                    <p className="flex-1 text-sm text-stone-800">
                      {depth > 0 && (
                        <span className="text-stone-300 mr-1.5">{"—".repeat(depth)}</span>
                      )}
                      {cat.name}
                      {cat.leaf_source && (
                        <span className="ml-2 text-xs text-stone-400">(derivada)</span>
                      )}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveItem(cat, "up")}
                        disabled={siblingIndex === 0 || isPending}
                        className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(cat, "down")}
                        disabled={siblingIndex === siblings.length - 1 || isPending}
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
            );
          })}
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
        <select
          value={newParentId}
          onChange={(e) => setNewParentId(e.target.value)}
          className="h-9 px-2.5 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 transition-colors bg-white max-w-[220px]"
        >
          <option value="">Nivel superior</option>
          {parentOptions.map(({ cat, depth }) => (
            <option key={cat.id} value={cat.id}>
              {"—".repeat(depth)} {cat.name}
            </option>
          ))}
        </select>
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
