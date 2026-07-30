import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/supabase/get-org";
import { ProductForm } from "../../product-form";

export default async function NuevoProductoPage() {
  const supabase = createClient();
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true });

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center gap-3 shrink-0">
        <Link
          href="/dashboard/catalogo"
          className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
        >
          ‹ Catálogo
        </Link>
        <h1 className="text-lg font-semibold text-stone-900">Nuevo producto</h1>
      </header>

      <div className="p-8">
        <ProductForm categories={categories ?? []} />
      </div>
    </div>
  );
}
