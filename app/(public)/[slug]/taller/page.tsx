import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantOrg, getTenantUser } from "../data";
import { getAvailableWorkshopDays } from "../bike-workshop-data";
import { WorkshopBooking } from "./workshop-booking";

// Fase T2 "Mundo Bike" Taller: ruta genérica /[slug]/taller (mismo
// patrón que /[slug]/turnos), pero solo tiene sentido para bike — el
// resto de las orgs no tiene bike_workshop_availability cargada. Redirige
// a la home en vez de mostrar una pantalla vacía, mismo criterio que
// dashboard/taller/page.tsx del lado admin.
export default async function TallerPage({
  params,
}: {
  params: { slug: string };
}) {
  if (params.slug !== "bike") redirect(`/${params.slug}`);

  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const user = await getTenantUser();
  if (!user) redirect(`/${params.slug}`);

  const capacityPerSlot = org.workshop_capacity_per_slot ?? 2;
  const days = await getAvailableWorkshopDays(org.id, capacityPerSlot);

  return (
    <div className="min-h-screen bg-[#0a0a0b] px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <Link
          href={`/${params.slug}/perfil`}
          className="inline-block text-sm text-[#9b9995] hover:text-white transition-colors"
        >
          ‹ Volver
        </Link>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#ff6b00]">Taller</p>
          <h1 className="text-lg font-semibold text-white mt-0.5">Pedí tu turno de service</h1>
        </div>

        <WorkshopBooking
          slug={params.slug}
          orgId={org.id}
          capacityPerSlot={capacityPerSlot}
          initialDays={days}
        />
      </div>
    </div>
  );
}
