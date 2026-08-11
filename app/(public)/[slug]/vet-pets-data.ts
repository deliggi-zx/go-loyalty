import { createClient } from "@/lib/supabase/server";

export interface MyPet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photoUrl: string | null;
  // null si la mascota no tiene birth_date cargado — el punto 3 pide
  // explícitamente NO mostrar edad en ese caso, no un "0 años" ni nada
  // aproximado.
  ageLabel: string | null;
  updatedAt: string;
}

// Años/meses en vez de una sola unidad — una mascota de 4 meses mostrando
// "0 años" sería raro. Igual de simple para el resto de los casos.
function calculateAgeLabel(birthDate: string | null): string | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0) {
    const totalMonths = months;
    if (totalMonths <= 0) return "Recién nacido";
    return `${totalMonths} ${totalMonths === 1 ? "mes" : "meses"}`;
  }
  return `${years} ${years === 1 ? "año" : "años"}`;
}

// Mascotas vinculadas al dueño actual (owner_profile_id) — punto 3 del
// pedido. Separada de mascotas/page.tsx (panel admin/vet, ve TODAS las
// mascotas de la org) a propósito: son consultas y consumidores distintos,
// no hay necesidad real de compartir código entre ambas.
export async function getOwnerPets(orgId: string, profileId: string): Promise<MyPet[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vet_pets")
    .select("id, name, species, breed, photo_url, birth_date, updated_at")
    .eq("org_id", orgId)
    .eq("owner_profile_id", profileId)
    .order("name", { ascending: true });

  return (data ?? []).map((pet) => ({
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    photoUrl: pet.photo_url,
    ageLabel: calculateAgeLabel(pet.birth_date),
    updatedAt: pet.updated_at,
  }));
}
