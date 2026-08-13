import { createClient } from "@/lib/supabase/server";
import { canEditCommunityPet, type CommunityPetType } from "./vet-community-pets-permissions";

// Punto 3/4 del pedido: "ver" es público, sin sesión — por eso esta
// función no chequea auth para nada, a diferencia de getOwnerPets
// (vet-pets-data.ts) que sí filtra por dueño. canEdit ya viene resuelto
// acá (server), no como createdBy/role crudos — así el componente cliente
// (vet-community-gallery.tsx) no necesita saber quién es el usuario
// actual ni su role para decidir si mostrar el botón editar/borrar, y un
// visitante anónimo o sin permiso no puede inferir esos datos inspeccionando
// el HTML.
export interface CommunityPetEntry {
  id: string;
  photoUrl: string;
  description: string;
  canEdit: boolean;
}

export async function getCommunityPets(
  orgId: string,
  type: CommunityPetType,
  currentUserId: string | null,
  currentUserRole: string | null
): Promise<CommunityPetEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vet_community_pets")
    .select("id, photo_url, description, created_by")
    .eq("org_id", orgId)
    .eq("type", type)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    photoUrl: r.photo_url,
    description: r.description,
    canEdit: canEditCommunityPet(r.created_by, currentUserId, currentUserRole),
  }));
}
