import { createClient } from "@/lib/supabase/server";
import { todayLocalYmd, localYmd } from "@/app/(public)/[slug]/vet-appointments-config";

// Fase badges Domus: contadores para los círculos rojos de Consultas/
// Reuniones en DomusAgentPanel — un solo lugar para esta lógica, la usan
// las tres pantallas que renderizan ese panel (/domus/perfil,
// /dashboard/inicio, /dashboard en mobile), para no repetir el criterio
// tres veces y arriesgar que se desincronicen.
export interface DomusBadgeCounts {
  // Consultas con status='nuevo' únicamente — no leídas de verdad, a
  // diferencia de "Consultas sin responder" (que en /dashboard/inicio/
  // consultas también suma 'contactado'). Pedido explícito: el badge es
  // más estricto que esa bandeja.
  consultasNuevoCount: number;
  // Ofertas 'reunion_agendada' + visitas 'confirmed' cuya fecha es HOY —
  // a diferencia de "Próximas reuniones" (que no filtraba por fecha, ver
  // versión previa de /perfil), acá sí importa el día.
  reunionesHoyCount: number;
}

export async function getDomusAgentBadgeCounts(orgId: string): Promise<DomusBadgeCounts> {
  const supabase = createClient();
  const today = todayLocalYmd();

  const [{ count: consultasNuevoCount }, { data: offersToday }, { count: visitsHoyCount }] =
    await Promise.all([
      supabase
        .from("domus_general_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "nuevo"),
      // scheduled_at es timestamptz — se filtra por día en JS (mismo
      // criterio de hora local que todayLocalYmd/localYmd), no con un
      // rango de fechas en la query, para no armar límites UTC a mano.
      supabase
        .from("domus_property_offers")
        .select("scheduled_at")
        .eq("org_id", orgId)
        .eq("status", "reunion_agendada")
        .not("scheduled_at", "is", null),
      // visit_date ya es una columna date (no timestamp), así que acá sí
      // alcanza con un eq directo contra el string "YYYY-MM-DD".
      supabase
        .from("domus_property_visits")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "confirmed")
        .eq("visit_date", today),
    ]);

  const offersHoyCount = (offersToday ?? []).filter(
    (o) => o.scheduled_at && localYmd(new Date(o.scheduled_at)) === today
  ).length;

  return {
    consultasNuevoCount: consultasNuevoCount ?? 0,
    reunionesHoyCount: offersHoyCount + (visitsHoyCount ?? 0),
  };
}
