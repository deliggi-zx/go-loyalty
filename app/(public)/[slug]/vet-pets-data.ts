import { createClient } from "@/lib/supabase/server";

// Fase 2, punto 3: una entrada del historial clínico tal como la ve el
// dueño — SOLO las que el vet marcó visible_to_owner=true (el filtro pasa
// en la query de abajo, nunca llega acá una oculta para empezar). Sin
// visibleToOwner en el tipo a propósito: de este lado no hace falta ese
// dato, todo lo que llega ya es visible por definición.
export interface MedicalRecordEntry {
  id: string;
  type: "vacuna" | "tratamiento";
  description: string;
  date: string;
  notes: string | null;
}

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
  records: MedicalRecordEntry[];
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

  const pets = data ?? [];
  const petIds = pets.map((p) => p.id);

  // Fase 2, punto 3: historial clínico SOLO visible_to_owner=true — el
  // filtro va en la query, no después en JS, así una entrada oculta ni
  // siquiera viaja al cliente (defensa en profundidad, no solo estética).
  const { data: recordsData } =
    petIds.length > 0
      ? await supabase
          .from("vet_medical_records")
          .select("id, pet_id, type, description, date, notes")
          .in("pet_id", petIds)
          .eq("visible_to_owner", true)
          .order("date", { ascending: false })
      : { data: [] as { id: string; pet_id: string; type: string; description: string; date: string; notes: string | null }[] };

  const recordsByPet = new Map<string, MedicalRecordEntry[]>();
  for (const r of recordsData ?? []) {
    const list = recordsByPet.get(r.pet_id) ?? [];
    list.push({
      id: r.id,
      type: r.type as "vacuna" | "tratamiento",
      description: r.description,
      date: r.date,
      notes: r.notes,
    });
    recordsByPet.set(r.pet_id, list);
  }

  return pets.map((pet) => ({
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    photoUrl: pet.photo_url,
    ageLabel: calculateAgeLabel(pet.birth_date),
    updatedAt: pet.updated_at,
    records: recordsByPet.get(pet.id) ?? [],
  }));
}
