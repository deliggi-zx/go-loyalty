import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser } from "../data";
import { getAvailableWorkshopDays } from "../bike-workshop-data";
import { todayLocalYmd } from "../vet-appointments-config";
import { WorkshopBooking } from "./workshop-booking";
import { MyWorkshopAppointments, type MyWorkshopAppointmentRow } from "./my-workshop-appointments";

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

  // Fase T3: "Mis turnos" — todo el historial del cliente (no solo
  // activos, a diferencia de getAvailableWorkshopDays), mismo criterio de
  // orden descendente (más reciente primero) que myVisits en perfil/
  // page.tsx (Domus).
  const supabase = createClient();
  const { data: myAppointmentsData } = await supabase
    .from("bike_workshop_appointments")
    .select("id, date, start_time, description, status")
    .eq("org_id", org.id)
    .eq("profile_id", user.id)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  const today = todayLocalYmd();
  const myAppointments: MyWorkshopAppointmentRow[] = (myAppointmentsData ?? []).map((a) => ({
    id: a.id,
    date: a.date,
    time: a.start_time.slice(0, 5),
    description: a.description ?? "",
    status: a.status as MyWorkshopAppointmentRow["status"],
    canCancel: (a.status === "pending" || a.status === "confirmed") && a.date >= today,
  }));

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

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9b9995]">
            Mis turnos
          </h2>
          <MyWorkshopAppointments slug={params.slug} appointments={myAppointments} />
        </div>
      </div>
    </div>
  );
}
