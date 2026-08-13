import Link from "next/link";
import { getTenantOrg, getTenantUser, getOrgRole } from "../data";
import { getCommunityPets } from "../vet-community-pets-data";
import { canCreateCommunityPet } from "../vet-community-pets-permissions";
import { VetCommunityGallery } from "../vet-community-gallery";

// Fase 4 Huellitas: reemplaza el placeholder VetComingSoon. Mismo
// componente de galería que Refugio (vet-community-gallery.tsx) — la
// única diferencia real de comportamiento está en createAccess: acá
// cualquier usuario logueado (cualquier role, incluido 'customer') puede
// cargar, y sin sesión el botón "+" sigue visible pero invita a loguearse
// en vez de desaparecer (a diferencia de Refugio, donde para quien no
// puede cargar el botón directamente no existe).
export default async function PerdidosPage({ params }: { params: { slug: string } }) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const user = await getTenantUser();
  const role = user ? await getOrgRole(org.id, user.id) : null;
  const primary = org.primary_color ?? "#b98a72";

  const entries = await getCommunityPets(org.id, "perdido", user?.id ?? null, role);

  // Sin sesión: "login_required" (el botón sigue ahí, pero abre el login
  // en vez del form — punto 4, pedido explícito: "con invitación a
  // loguearse si intenta cargar"). Con sesión: "allowed" si es miembro de
  // esta org (cualquier role), "hidden" en el caso borde de una sesión
  // válida que no pertenece a esta org (no tiene sentido invitarlo a
  // loguearse de nuevo, ya está logueado).
  const createAccess = !user ? "login_required" : canCreateCommunityPet("perdido", role) ? "allowed" : "hidden";

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
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">Perdidos</h1>
          <p className="text-sm text-stone-500 mt-1">Ayudanos a encontrarlas</p>
        </div>
      </div>

      <VetCommunityGallery
        slug={params.slug}
        orgId={org.id}
        type="perdido"
        primaryColor={primary}
        entries={entries}
        createAccess={createAccess}
        formTitle="Cargar mascota perdida"
        descriptionPlaceholder="Ej: Se perdió el viernes cerca de Plaza San Martín, responde a Toby..."
        emptyStateText="Por suerte, no hay mascotas perdidas cargadas."
      />
    </div>
  );
}
