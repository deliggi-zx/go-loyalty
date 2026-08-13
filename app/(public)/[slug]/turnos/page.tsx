import Link from "next/link";
import { getTenantOrg, getTenantUser } from "../data";
import { LoginForm } from "../login-form";
import { isValidAppointmentReason } from "../vet-appointments-config";
import { getOwnerPetOptions } from "../vet-appointments-data";
import { VetTurnosBooking } from "../vet-turnos-booking";

// Fase 3 Huellitas: reemplaza el placeholder VetComingSoon que tenía esta
// ruta. Pedir un turno requiere un owner_profile_id real (la columna no
// es nullable en vet_appointments) — sin sesión se muestra el mismo
// LoginForm de siempre en vez del wizard, mismo criterio que la sección
// de login de page.tsx para orgs sin hasGymFeatures.
export default async function TurnosPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { motivo?: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const user = await getTenantUser();
  const primary = org.primary_color ?? "#b98a72";

  const pets = user ? await getOwnerPetOptions(org.id, user.id) : [];

  // Fase 5, punto 2 (Peluquería): "Pedí tu turno de peluquería" linkea acá
  // con ?motivo=peluqueria para preseleccionar el paso 2 del wizard, sin
  // duplicar la lógica de reserva en la página de Peluquería (pedido
  // explícito). Se valida contra la misma lista que ya usa el wizard — un
  // query param con basura simplemente no preselecciona nada, no rompe.
  const initialReason =
    searchParams.motivo && isValidAppointmentReason(searchParams.motivo)
      ? searchParams.motivo
      : undefined;

  return (
    <div className="min-h-screen bg-[#faf6ef] px-4 py-8">
      <div className="max-w-md mx-auto mb-4">
        <Link
          href={`/${params.slug}`}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ‹ Volver
        </Link>
      </div>

      <div className="max-w-md mx-auto mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Huellitas</p>
        <h1 className="text-2xl font-semibold text-stone-900 mt-1">Pedí tu turno</h1>
      </div>

      {user ? (
        <VetTurnosBooking
          slug={params.slug}
          orgId={org.id}
          primaryColor={primary}
          pets={pets}
          initialReason={initialReason}
        />
      ) : (
        <div className="max-w-md mx-auto space-y-3">
          <p className="text-sm text-stone-500 text-center">
            Iniciá sesión o creá una cuenta para pedir un turno.
          </p>
          <LoginForm primaryColor={primary} orgId={org.id} />
        </div>
      )}
    </div>
  );
}
