import Link from "next/link";
import { getTenantOrg, getTenantUser, getOrgRole } from "../data";
import { getVetTips } from "../vet-tips-data";
import { canManageVetTips } from "../vet-tips-permissions";
import { VetTipsManager } from "../vet-tips-manager";

// Fase 5 Huellitas, punto 3: reemplaza el placeholder VetComingSoon.
// Contenido institucional, público sin sesión (mismo criterio que
// Refugio/Perdidos) — el botón "+" solo aparece para admin/vet.
export default async function ConsejosPage({ params }: { params: { slug: string } }) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const user = await getTenantUser();
  const role = user ? await getOrgRole(org.id, user.id) : null;
  const primary = org.primary_color ?? "#b98a72";

  const tips = await getVetTips(org.id);
  const canManage = canManageVetTips(role);

  return (
    <div className="min-h-screen bg-[#faf6ef]">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <Link
          href={`/${params.slug}`}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ‹ Volver
        </Link>
        <div className="text-center mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Huellitas</p>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">Consejos</h1>
        </div>
      </div>

      <VetTipsManager slug={params.slug} orgId={org.id} primaryColor={primary} tips={tips} canManage={canManage} />
    </div>
  );
}
