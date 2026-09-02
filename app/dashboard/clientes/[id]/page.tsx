import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { loyaltyTypeLabel } from "@/lib/loyalty/config";
import { AddPointsForm } from "./add-points-form";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const orgId = await getOrgId();
  if (!orgId) notFound();

  // El cliente tiene que ser customer de esta org.
  const { data: membership } = await supabase
    .from("loyalty_members")
    .select("created_at, role")
    .eq("org_id", orgId)
    .eq("profile_id", params.id)
    .maybeSingle();
  if (membership?.role !== "customer") notFound();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: profile },
    { data: pointsRow },
    { data: orgRow },
    { data: visitRows },
    { data: txRows },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", params.id).maybeSingle(),
    supabase
      .from("loyalty_user_points")
      .select("balance")
      .eq("org_id", orgId)
      .eq("profile_id", params.id)
      .maybeSingle(),
    supabase
      .from("loyalty_organizations")
      .select(
        "points_visit_attended, points_referral, points_review, points_operation_per_1000"
      )
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("loyalty_visits")
      .select("visited_at")
      .eq("org_id", orgId)
      .eq("profile_id", params.id)
      .order("visited_at", { ascending: false }),
    supabase
      .from("loyalty_transactions")
      .select("id, amount, type, note, created_at")
      .eq("org_id", orgId)
      .eq("profile_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const visits = visitRows ?? [];
  const lastVisit = visits[0]?.visited_at ?? null;
  const visitsThisMonth = visits.filter(
    (v) => new Date(v.visited_at) >= startOfMonth
  ).length;

  const balance = pointsRow?.balance ?? 0;
  const name = profile?.full_name ?? "Cliente sin nombre";
  const transactions = txRows ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link
          href="/dashboard/clientes"
          className="p-1.5 rounded-md hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-stone-500" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-stone-900">{name}</h1>
          <p className="text-xs text-stone-400">
            Cliente desde {fmtDate(membership?.created_at)}
          </p>
        </div>
      </header>

      <div className="p-8 max-w-2xl space-y-8">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Puntos</p>
            <p className="text-2xl font-bold text-stone-900 tabular-nums mt-1">
              {balance.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Última visita</p>
            <p className="text-sm font-medium text-stone-900 mt-2">{fmtDate(lastVisit)}</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Visitas este mes</p>
            <p className="text-2xl font-bold text-stone-900 tabular-nums mt-1">
              {visitsThisMonth}
            </p>
          </div>
        </div>

        {/* Sumar puntos */}
        <AddPointsForm
          customerId={params.id}
          suggestions={{
            visit: orgRow?.points_visit_attended ?? 20,
            referral: orgRow?.points_referral ?? 100,
            review: orgRow?.points_review ?? 30,
            operationPer1000: orgRow?.points_operation_per_1000 ?? 100,
          }}
        />

        {/* Historial */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Historial de puntos
          </h2>
          {transactions.length > 0 ? (
            <div className="bg-white divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-stone-700 truncate">
                      {tx.note || loyaltyTypeLabel(tx.type)}
                    </p>
                    <p className="text-xs text-stone-400">{fmtDate(tx.created_at)}</p>
                  </div>
                  <span
                    className={`font-medium shrink-0 tabular-nums ${
                      tx.amount >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount.toLocaleString("es-AR")} pts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">Todavía no tiene movimientos de puntos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
