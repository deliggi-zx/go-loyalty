import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await getOrgId();
  let catalogType: string | null = null;
  if (orgId) {
    const { data: org } = await supabase
      .from("loyalty_organizations")
      .select("catalog_type")
      .eq("id", orgId)
      .maybeSingle();
    catalogType = org?.catalog_type ?? null;
  }

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar userEmail={user.email ?? ""} showCatalog={catalogType === "products"} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
