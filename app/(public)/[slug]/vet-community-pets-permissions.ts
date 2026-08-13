// Fase 4 Huellitas: reglas de permisos de Refugio + Perdidos, todas acá
// (pedido explícito: "permisos a nivel de código, no de base" — la tabla
// no tiene RLS). Funciones puras, sin acceso a datos — se llaman tanto
// desde el server (page.tsx, para decidir qué botones mostrar) como desde
// las server actions (vet-community-pets-actions.ts, para el chequeo real
// que importa). Un solo lugar así ambos lados nunca pueden desalinearse.
export type CommunityPetType = "refugio" | "perdido";

// Crear una entrada 'refugio': solo role 'refugio' o 'admin' de esta org.
// Crear 'perdido': cualquier usuario logueado, cualquier role (incluido
// 'customer') — por eso alcanza con chequear que haya sesión.
export function canCreateCommunityPet(type: CommunityPetType, role: string | null): boolean {
  if (type === "refugio") return role === "refugio" || role === "admin";
  return role !== null;
}

// Moderación: admin o vet pueden editar/borrar CUALQUIER entrada, no solo
// las propias — mismo criterio que el resto del panel admin/vet de esta
// org (mascotas, turnos).
export function canModerateCommunityPets(role: string | null): boolean {
  return role === "admin" || role === "vet";
}

// Editar/borrar una entrada puntual: quien la creó, o quien modera. userId
// null (sin sesión) nunca puede, sin importar el role.
export function canEditCommunityPet(
  entryCreatedBy: string,
  userId: string | null,
  role: string | null
): boolean {
  if (!userId) return false;
  if (entryCreatedBy === userId) return true;
  return canModerateCommunityPets(role);
}
