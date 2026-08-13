import Link from "next/link";
import { getTenantOrg, getTenantUser, getOrgRole } from "../data";
import { getCommunityPets } from "../vet-community-pets-data";
import { canCreateCommunityPet } from "../vet-community-pets-permissions";
import { VetCommunityGallery } from "../vet-community-gallery";

// Fase 4 Huellitas: reemplaza el placeholder VetComingSoon. Galería
// pública (punto 3, pedido explícito: "público, sin necesidad de estar
// logueado") — a diferencia de turnos/perfil, NO hay redirect ni
// LoginForm bloqueando acá, el contenido siempre se muestra.
export default async function RefugioPage({ params }: { params: { slug: string } }) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const user = await getTenantUser();
  const role = user ? await getOrgRole(org.id, user.id) : null;
  const primary = org.primary_color ?? "#b98a72";

  const entries = await getCommunityPets(org.id, "refugio", user?.id ?? null, role);

  // Refugio: SOLO role 'refugio' o 'admin' ve el botón "+" — cualquier
  // otro visitante (sin sesión, customer, vet, etc.) no ve ningún botón de
  // gestión, punto 3 pedido explícito. Nunca "login_required" acá (a
  // diferencia de Perdidos): no tiene sentido invitar a loguearse a
  // alguien que, aunque se loguee, no va a poder cargar igual.
  const createAccess = canCreateCommunityPet("refugio", role) ? "allowed" : "hidden";

  return (
    <div className="min-h-screen bg-[#faf6ef]">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Link
          href={`/${params.slug}`}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ‹ Volver
        </Link>
        <div className="text-center mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Huellitas</p>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">Refugio</h1>
          <p className="text-sm text-stone-500 mt-1">Mascotas esperando un hogar</p>
        </div>
      </div>

      <VetCommunityGallery
        slug={params.slug}
        orgId={org.id}
        type="refugio"
        primaryColor={primary}
        entries={entries}
        createAccess={createAccess}
        formTitle="Cargar mascota en adopción"
        descriptionPlaceholder="Ej: Golden mix, 2 años, muy cariñosa, ya vacunada..."
        emptyStateText="Todavía no hay mascotas cargadas en el refugio."
      />
    </div>
  );
}
