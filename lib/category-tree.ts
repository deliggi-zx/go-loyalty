// Árbol de categorías de catálogo (product_categories) — helper genérico,
// factoreado de dashboard/catalogo/product-form.tsx (Fase moneda Domus) para
// que también lo use la ficha de producto pública (Fase Requisitos Domus)
// sin duplicar la caminata del árbol. No busca nada específico de ninguna
// org acá — el mapeo de nombre de categoría raíz a lo que sea (moneda,
// tipo de operación, etc.) vive en cada caller.
export interface CategoryTreeNode {
  id: string;
  name: string;
  parent_id: string | null;
}

// Sube por parent_id hasta la categoría raíz de `categoryId`.
export function findRootAncestor<T extends CategoryTreeNode>(
  categories: T[],
  categoryId: string
): T | null {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let current = byId.get(categoryId) ?? null;
  if (!current) return null;
  while (current.parent_id) {
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    current = parent;
  }
  return current;
}
