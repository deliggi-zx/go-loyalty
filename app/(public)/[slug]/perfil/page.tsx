import { redirect } from "next/navigation";
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

  const balance = await getUserPointsBalance(org.id, user.id);
  const primary = org.primary_color ?? "#f59e0b";

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex justify-center">
      <div className="w-full max-w-sm">
        <PointsPanel
          label={org.member_tier_label ?? "Socio Frecuente"}
          balance={balance}
          primaryColor={primary}
        />
      </div>
    </div>
  );
}
