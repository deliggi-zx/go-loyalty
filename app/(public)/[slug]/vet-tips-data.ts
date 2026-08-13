import { createClient } from "@/lib/supabase/server";

// Fase 5 Huellitas, punto 3: "ver" es público, sin sesión — mismo
// criterio que getCommunityPets (vet-community-pets-data.ts), esta
// función no chequea auth para nada.
export interface VetTipEntry {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function getVetTips(orgId: string): Promise<VetTipEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("vet_tips")
    .select("id, title, body, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  }));
}
