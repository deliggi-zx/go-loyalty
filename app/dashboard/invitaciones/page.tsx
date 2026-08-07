import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { InviteCodesManager, type InviteCodeRow } from "./invite-codes-manager";

export default async function InvitacionesPage() {
  const supabase = createClient();
  const orgId = await getOrgId();

  let codes: InviteCodeRow[] = [];

  if (orgId) {
    const { data } = await supabase
      .from("gym_invite_codes")
      .select("id, code, status, created_at, used_at, used_by")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    const usedByIds = (data ?? [])
      .map((c) => c.used_by)
      .filter((id): id is string => !!id);

    // Todavía ningún código tiene used_by seteado (esta fase no conecta el
    // registro con los códigos), pero se deja resuelto para cuando exista.
    const usedByNames = new Map<string, string>();
    if (usedByIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", usedByIds);
      for (const p of profiles ?? []) {
        if (p.full_name) usedByNames.set(p.id, p.full_name);
      }
    }

    codes = (data ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      status: c.status as "unused" | "used",
      created_at: c.created_at,
      used_at: c.used_at,
      usedByName: c.used_by ? usedByNames.get(c.used_by) ?? null : null,
    }));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Invitaciones</h1>
          <p className="text-xs text-stone-400">
            Generá códigos de un solo uso para habilitar el registro de nuevos socios
          </p>
        </div>
      </header>

      <div className="p-8">
        <InviteCodesManager codes={codes} />
      </div>
    </div>
  );
}
