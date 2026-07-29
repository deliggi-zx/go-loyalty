import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantOrg, getTenantUser, getUserPointsBalance } from "../data";
import { PointsPanel } from "../points-panel";

export default async function PerfilPage({
  params,
}: {
  params: { slug: string };
}) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const user = await getTenantUser();
  if (!user) redirect(`/${params.slug}`);

  const supabase = createClient();
  const [balance, { data: txs }] = await Promise.all([
    getUserPointsBalance(org.id, user.id),
    supabase
      .from("loyalty_transactions")
      .select("id, amount, purchase_amount, claimed_at")
      .eq("profile_id", user.id)
      .eq("org_id", org.id)
      .eq("status", "claimed")
      .order("claimed_at", { ascending: false }),
  ]);

  const transactions = txs ?? [];
  const primary = org.primary_color ?? "#f59e0b";
  const threshold = org.next_reward_threshold ?? 1000;
  const progressPct = Math.min(100, Math.round((balance / threshold) * 100));

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Link
        href={`/${params.slug}`}
        className="inline-block text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        ‹ Volver
      </Link>

      <div className="flex justify-center">
        <div className="w-full max-w-sm space-y-4">
          <PointsPanel
            label={org.member_tier_label ?? "Socio Frecuente"}
            balance={balance}
            primaryColor={primary}
          />

          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: primary }}
              />
            </div>
            <p className="text-center text-xs text-stone-500">
              {balance >= threshold
                ? "¡Ya alcanzaste tu próxima recompensa!"
                : `Te faltan ${threshold - balance} puntos para tu próxima recompensa`}
            </p>
          </div>
        </div>
      </div>

      {/* Historial de consumo */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          Historial de consumo
        </h2>
        {transactions.length > 0 ? (
          <div className="bg-white divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="text-stone-500 text-xs shrink-0">
                  {tx.claimed_at
                    ? new Date(tx.claimed_at).toLocaleDateString("es-AR")
                    : "—"}
                </span>
                <span className="text-stone-600 flex-1 text-right">
                  {tx.purchase_amount != null
                    ? `$${tx.purchase_amount.toLocaleString("es-AR")}`
                    : ""}
                </span>
                <span className="font-medium text-stone-900 shrink-0">
                  +{tx.amount.toLocaleString("es-AR")} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400">Todavía no sumaste puntos.</p>
        )}
      </div>
    </div>
  );
}
