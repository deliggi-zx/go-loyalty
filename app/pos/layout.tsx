import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PosLayout({
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

  return <div className="min-h-screen bg-stone-50">{children}</div>;
}
