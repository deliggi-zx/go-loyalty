// Fase 5 Huellitas, punto 4 (Comentarios): reglas de permisos, todas acá
// (mismo criterio que vet-community-pets-permissions.ts). Funciones
// puras, sin acceso a datos.
//
// Crear: cualquier usuario logueado de la org, cualquier role (alcanza
// con chequear que haya sesión, mismo criterio que "perdido" en
// canCreateCommunityPet). Borrar: quien lo escribió, o admin/vet
// (moderación, mismo criterio que canEditCommunityPet).
export function canCreateVetReview(role: string | null): boolean {
  return role !== null;
}

export function canModerateVetReviews(role: string | null): boolean {
  return role === "admin" || role === "vet";
}

export function canDeleteVetReview(
  reviewProfileId: string,
  userId: string | null,
  role: string | null
): boolean {
  if (!userId) return false;
  if (reviewProfileId === userId) return true;
  return canModerateVetReviews(role);
}
