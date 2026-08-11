import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { MascotasManager, type PetRow, type MemberOption } from "./mascotas-manager";

// Visible solo para role admin o vet dentro de la org (Huellitas) — el
// ítem del sidebar ya lo oculta para cualquier otra org (ver showMascotas
// en dashboard/layout.tsx), pero eso es solo la navegación; acá es el
// control de acceso real: si alguien con role='customer' entra directo a
// la URL, lo mandamos de vuelta al dashboard. Mismo criterio que
// requireOrgId() en actions.ts para las escrituras.
const ALLOWED_ROLES = ["admin", "vet"];

export default async function MascotasPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  if (!orgId) redirect("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    redirect("/dashboard");
  }

  const [{ data: petsData }, { data: membersData }] = await Promise.all([
    supabase
      .from("vet_pets")
      .select("id, owner_profile_id, link_code, name, species, breed, color, weight, birth_date, photo_url")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
    // Todos los miembros de la org (no solo role='customer') — un admin/vet
    // también podría querer vincularse una mascota propia, no hay motivo
    // para excluirlos del buscador.
    supabase.from("loyalty_members").select("profile_id").eq("org_id", orgId),
  ]);

  // NOTA: public.profiles no tiene columna email (solo id, full_name,
  // avatar_url, created_at) — confirmado con information_schema. El server
  // client de la app usa la anon key (ver lib/supabase/server.ts), sin
  // acceso a auth.users, así que no hay forma de traer el mail acá. El
  // buscador de dueño queda por nombre solamente (dato real disponible),
  // no "por nombre o mail" como se había pedido. dashboard/clientes/
  // page.tsx tiene el mismo select roto (pide "email" a profiles) — bug
  // preexistente, no tocado en esta fase, señalado aparte.
  const memberProfileIds = (membersData ?? []).map((m) => m.profile_id);
  const { data: profilesData } =
    memberProfileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", memberProfileIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const profileById = new Map((profilesData ?? []).map((p) => [p.id, p]));

  const members: MemberOption[] = memberProfileIds.map((id) => {
    const p = profileById.get(id);
    return {
      profileId: id,
      name: p?.full_name ?? null,
    };
  });

  const pets: PetRow[] = (petsData ?? []).map((pet) => {
    const owner = pet.owner_profile_id ? profileById.get(pet.owner_profile_id) : null;
    return {
      id: pet.id,
      ownerProfileId: pet.owner_profile_id,
      ownerName: owner?.full_name ?? null,
      linkCode: pet.link_code,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      color: pet.color,
      weight: pet.weight,
      birthDate: pet.birth_date,
      photoUrl: pet.photo_url,
    };
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Mascotas</h1>
          <p className="text-xs text-stone-400">
            Alta y ficha de mascotas — el dueño solo se vincula con el código, no crea ni edita
          </p>
        </div>
      </header>

      <div className="p-8">
        <MascotasManager pets={pets} members={members} />
      </div>
    </div>
  );
}
